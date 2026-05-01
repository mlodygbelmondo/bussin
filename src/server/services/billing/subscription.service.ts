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
  upsertSubscription(input: {
    workspaceId: string;
    values: TablesUpdate<"subscriptions">;
  }): Promise<SubscriptionRecord>;
};

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

  await writeBillingAudit(input.repository, {
    eventType: input.eventType,
    plan: existing.plan,
    status: existing.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: existing.stripe_subscription_id,
    workspaceId: existing.workspace_id,
  });

  return existing;
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
