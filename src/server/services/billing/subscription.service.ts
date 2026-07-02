import type Stripe from "stripe";
import type {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";
import { getPlanForStripePriceId } from "@/modules/billing/plan-config";
import type { BillingPlan } from "@/server/validators/billing.validator";

export type SubscriptionRecord = Tables<"subscriptions">;

export type SubscriptionRepository = {
  createAuditLog(input: TablesInsert<"audit_logs">): Promise<unknown>;
  getSubscriptionByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<SubscriptionRecord | null>;
  getWorkspaceIdForUser(userId: string): Promise<string | null>;
  /** Returns false when the event id was already recorded (duplicate delivery). */
  recordWebhookEvent(input: {
    eventId: string;
    eventType: string;
  }): Promise<boolean>;
  releaseWebhookEvent(eventId: string): Promise<void>;
  upsertSubscription(input: {
    workspaceId: string;
    values: TablesUpdate<"subscriptions">;
  }): Promise<SubscriptionRecord>;
};

export async function processStripeWebhookEvent(input: {
  event: Stripe.Event;
  repository: SubscriptionRepository;
}) {
  const { event, repository } = input;
  const fresh = await repository.recordWebhookEvent({
    eventId: event.id,
    eventType: event.type,
  });

  if (!fresh) {
    return { duplicate: true as const };
  }

  try {
    if (event.type === "checkout.session.completed") {
      await syncCheckoutSessionCompleted({
        repository,
        session: event.data.object,
      });
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncStripeSubscription({
        eventType: event.type,
        repository,
        subscription: event.data.object,
      });
    }

    if (
      event.type === "invoice.payment_failed" ||
      event.type === "invoice.payment_succeeded"
    ) {
      await syncStripeInvoice({
        eventType: event.type,
        invoice: event.data.object,
        repository,
      });
    }
  } catch (error) {
    // Release the idempotency claim so Stripe's redelivery is reprocessed
    // instead of being skipped as a duplicate.
    await repository.releaseWebhookEvent(event.id);
    throw error;
  }

  return { duplicate: false as const };
}

export async function syncCheckoutSessionCompleted(input: {
  repository: SubscriptionRepository;
  session: Stripe.Checkout.Session;
}) {
  const workspaceId =
    input.session.metadata?.workspaceId ??
    (input.session.metadata?.userId
      ? await input.repository.getWorkspaceIdForUser(
          input.session.metadata.userId,
        )
      : null);
  const customerId = getStripeId(input.session.customer);
  const subscriptionId = getStripeId(input.session.subscription);

  if (!workspaceId || !customerId) {
    return null;
  }

  const subscription = await input.repository.upsertSubscription({
    workspaceId,
    values: {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    },
  });

  await writeBillingAudit(input.repository, {
    eventType: "checkout.session.completed",
    plan: subscription.plan,
    status: subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    workspaceId,
  });

  return subscription;
}

export async function syncStripeSubscription(input: {
  eventType: string;
  repository: SubscriptionRepository;
  subscription: Stripe.Subscription;
}) {
  const customerId = getStripeId(input.subscription.customer);
  const workspaceIdFromMetadata = input.subscription.metadata?.workspaceId;
  const existing = customerId
    ? await input.repository.getSubscriptionByStripeCustomerId(customerId)
    : null;
  const workspaceId = workspaceIdFromMetadata ?? existing?.workspace_id;

  if (!workspaceId || !customerId) {
    return null;
  }

  const plan = planForSubscription(input.subscription, input.eventType);
  const currentPeriodStart = timestampToIso(
    input.subscription.items.data[0]?.current_period_start,
  );
  const currentPeriodEnd = timestampToIso(
    input.subscription.items.data[0]?.current_period_end,
  );

  const subscription = await input.repository.upsertSubscription({
    workspaceId,
    values: {
      cancel_at_period_end: input.subscription.cancel_at_period_end ?? false,
      current_period_end: currentPeriodEnd,
      current_period_start: currentPeriodStart,
      plan,
      status: input.subscription.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: input.subscription.id,
    },
  });

  await writeBillingAudit(input.repository, {
    eventType: input.eventType,
    plan,
    status: input.subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: input.subscription.id,
    workspaceId,
  });

  return subscription;
}

export async function syncStripeInvoice(input: {
  eventType: string;
  invoice: Stripe.Invoice;
  repository: SubscriptionRepository;
}) {
  const customerId = getStripeId(input.invoice.customer);
  const existing = customerId
    ? await input.repository.getSubscriptionByStripeCustomerId(customerId)
    : null;

  if (!existing) {
    return null;
  }

  const invoiceSubscriptionId = getInvoiceSubscriptionId(input.invoice);

  if (
    input.eventType === "invoice.payment_succeeded" &&
    invoiceSubscriptionId !== existing.stripe_subscription_id
  ) {
    return existing;
  }

  if (
    input.eventType === "invoice.payment_failed" &&
    invoiceSubscriptionId &&
    invoiceSubscriptionId !== existing.stripe_subscription_id
  ) {
    return existing;
  }

  // Failed subscription payments demote the workspace to past_due (plan limits
  // fall back to trial via effectiveBillingPlan); a later successful payment
  // only restores active when the invoice belongs to the stored subscription.
  // customer.subscription.updated also syncs status, this just keeps the
  // window between the two events closed.
  const nextStatus = invoiceStatusTransition(input.eventType, existing.status);
  const subscription =
    nextStatus === existing.status
      ? existing
      : await input.repository.upsertSubscription({
          workspaceId: existing.workspace_id,
          values: { status: nextStatus },
        });

  await writeBillingAudit(input.repository, {
    eventType: input.eventType,
    plan: subscription.plan,
    status: subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.stripe_subscription_id,
    workspaceId: subscription.workspace_id,
  });

  return subscription;
}

function invoiceStatusTransition(eventType: string, currentStatus: string) {
  if (eventType === "invoice.payment_failed") {
    return "past_due";
  }

  if (
    eventType === "invoice.payment_succeeded" &&
    currentStatus === "past_due"
  ) {
    return "active";
  }

  return currentStatus;
}

function planForSubscription(
  subscription: Stripe.Subscription,
  eventType: string,
): BillingPlan {
  if (eventType === "customer.subscription.deleted") {
    return "trial";
  }

  const priceId = subscription.items.data[0]?.price.id;
  return getPlanForStripePriceId(priceId) ?? "trial";
}

function getStripeId(value: string | { id: string } | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parentSubscription =
    invoice.parent?.subscription_details?.subscription ?? null;
  const parentSubscriptionId = getStripeId(parentSubscription);

  if (parentSubscriptionId) {
    return parentSubscriptionId;
  }

  const legacyInvoice = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };

  return getStripeId(legacyInvoice.subscription);
}

function timestampToIso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function writeBillingAudit(
  repository: SubscriptionRepository,
  input: {
    eventType: string;
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    workspaceId: string;
  },
) {
  return repository.createAuditLog({
    action: "billing.changed",
    entity_type: "subscription",
    metadata: {
      eventType: input.eventType,
      plan: input.plan,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
    } satisfies Json,
    workspace_id: input.workspaceId,
  });
}
