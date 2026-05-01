// @vitest-environment node

import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  BILLING_PLAN_CONFIG,
  getPlanForStripePriceId,
  getStripePriceIdForPlan,
} from "@/modules/billing/plan-config";
import {
  syncCheckoutSessionCompleted,
  syncStripeInvoice,
  syncStripeSubscription,
  type SubscriptionRepository,
} from "@/server/services/billing/subscription.service";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

describe("billing plan config", () => {
  it("maps paid plans to Stripe price IDs and back", () => {
    expect(BILLING_PLAN_CONFIG.creator.monthlyPriceUsd).toBe(19);
    expect(getStripePriceIdForPlan("pro")).toBe("price_pro_placeholder");
    expect(getPlanForStripePriceId("price_studio_placeholder")).toBe("studio");
    expect(getPlanForStripePriceId("price_unknown")).toBeNull();
  });
});

describe("Stripe subscription sync", () => {
  it("records checkout completion without upgrading before subscription webhook", async () => {
    const repository = makeRepository();

    await syncCheckoutSessionCompleted({
      repository,
      session: {
        customer: "cus_123",
        metadata: { userId, workspaceId },
        subscription: "sub_123",
      } as unknown as Stripe.Checkout.Session,
    });

    expect(repository.upsertSubscription).toHaveBeenCalledWith({
      workspaceId,
      values: {
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
      },
    });
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.changed",
        workspace_id: workspaceId,
      }),
    );
  });

  it("updates subscription plan and status from subscription events", async () => {
    const repository = makeRepository();

    await syncStripeSubscription({
      eventType: "customer.subscription.updated",
      repository,
      subscription: makeStripeSubscription({
        priceId: "price_pro_placeholder",
        status: "active",
      }),
    });

    expect(repository.upsertSubscription).toHaveBeenCalledWith({
      workspaceId,
      values: expect.objectContaining({
        current_period_end: "2026-05-01T00:00:00.000Z",
        current_period_start: "2026-04-01T00:00:00.000Z",
        plan: "pro",
        status: "active",
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
      }),
    });
  });

  it("downgrades deleted subscriptions to trial", async () => {
    const repository = makeRepository();

    await syncStripeSubscription({
      eventType: "customer.subscription.deleted",
      repository,
      subscription: makeStripeSubscription({
        priceId: "price_studio_placeholder",
        status: "canceled",
      }),
    });

    expect(repository.upsertSubscription).toHaveBeenCalledWith({
      workspaceId,
      values: expect.objectContaining({
        plan: "trial",
        status: "canceled",
      }),
    });
  });

  it("writes audit records for invoice payment events", async () => {
    const repository = makeRepository();

    await syncStripeInvoice({
      eventType: "invoice.payment_failed",
      invoice: {
        customer: "cus_123",
      } as Stripe.Invoice,
      repository,
    });

    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.changed",
        metadata: expect.objectContaining({
          eventType: "invoice.payment_failed",
        }),
      }),
    );
  });
});

function makeRepository(): SubscriptionRepository {
  return {
    createAuditLog: vi.fn().mockResolvedValue({}),
    getSubscriptionByStripeCustomerId: vi.fn().mockResolvedValue({
      id: "subscription-row",
      workspace_id: workspaceId,
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      plan: "creator",
      status: "active",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      created_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-01T00:00:00.000Z",
    }),
    getWorkspaceIdForUser: vi.fn().mockResolvedValue(workspaceId),
    upsertSubscription: vi.fn().mockResolvedValue({
      plan: "trial",
      status: "trialing",
      workspace_id: workspaceId,
    }),
  };
}

function makeStripeSubscription(input: {
  priceId: string;
  status: Stripe.Subscription.Status;
}): Stripe.Subscription {
  return {
    cancel_at_period_end: false,
    customer: "cus_123",
    id: "sub_123",
    items: {
      data: [
        {
          current_period_end: 1_777_593_600,
          current_period_start: 1_775_001_600,
          price: { id: input.priceId },
        },
      ],
    },
    metadata: { workspaceId },
    status: input.status,
  } as unknown as Stripe.Subscription;
}
