// @vitest-environment node

import type Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BILLING_PLAN_CONFIG,
  getPlanForStripePriceId,
  getStripePriceIdForPlan,
} from "@/modules/billing/plan-config";
import {
  processStripeWebhookEvent,
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

  it("marks the subscription past_due when an invoice payment fails", async () => {
    const repository = makeRepository();

    await syncStripeInvoice({
      eventType: "invoice.payment_failed",
      invoice: makeStripeInvoice(),
      repository,
    });

    expect(repository.upsertSubscription).toHaveBeenCalledWith({
      workspaceId,
      values: { status: "past_due" },
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

  it("restores a past_due subscription when a payment succeeds", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getSubscriptionByStripeCustomerId).mockResolvedValue({
      ...subscriptionRow(),
      status: "past_due",
    });

    await syncStripeInvoice({
      eventType: "invoice.payment_succeeded",
      invoice: makeStripeInvoice({ subscriptionId: "sub_123" }),
      repository,
    });

    expect(repository.upsertSubscription).toHaveBeenCalledWith({
      workspaceId,
      values: { status: "active" },
    });
  });

  it("leaves an active subscription untouched on payment success", async () => {
    const repository = makeRepository();

    await syncStripeInvoice({
      eventType: "invoice.payment_succeeded",
      invoice: makeStripeInvoice({ subscriptionId: "sub_123" }),
      repository,
    });

    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });

  it("does not restore paid access from an unrelated successful invoice", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getSubscriptionByStripeCustomerId).mockResolvedValue({
      ...subscriptionRow(),
      status: "past_due",
    });

    await syncStripeInvoice({
      eventType: "invoice.payment_succeeded",
      invoice: makeStripeInvoice({ subscriptionId: "sub_other" }),
      repository,
    });

    expect(repository.upsertSubscription).not.toHaveBeenCalled();
    expect(repository.createAuditLog).not.toHaveBeenCalled();
  });

  it("does not demote paid access from another subscription invoice", async () => {
    const repository = makeRepository();

    await syncStripeInvoice({
      eventType: "invoice.payment_failed",
      invoice: makeStripeInvoice({ subscriptionId: "sub_other" }),
      repository,
    });

    expect(repository.upsertSubscription).not.toHaveBeenCalled();
    expect(repository.createAuditLog).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook idempotency", () => {
  it("skips events whose id was already recorded", async () => {
    const repository = makeRepository();
    vi.mocked(repository.recordWebhookEvent).mockResolvedValue(false);

    const result = await processStripeWebhookEvent({
      event: {
        data: { object: makeStripeInvoice() },
        id: "evt_dup",
        type: "invoice.payment_failed",
      } as unknown as Stripe.Event,
      repository,
    });

    expect(result.duplicate).toBe(true);
    expect(repository.upsertSubscription).not.toHaveBeenCalled();
    expect(repository.createAuditLog).not.toHaveBeenCalled();
  });

  it("releases the idempotency claim when processing fails", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getSubscriptionByStripeCustomerId).mockRejectedValue(
      new Error("db down"),
    );

    await expect(
      processStripeWebhookEvent({
        event: {
          data: { object: makeStripeInvoice() },
          id: "evt_fail",
          type: "invoice.payment_failed",
        } as unknown as Stripe.Event,
        repository,
      }),
    ).rejects.toThrow("db down");

    expect(repository.releaseWebhookEvent).toHaveBeenCalledWith("evt_fail");
  });

  it("surfaces idempotency release failures instead of hiding them", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getSubscriptionByStripeCustomerId).mockRejectedValue(
      new Error("db down"),
    );
    vi.mocked(repository.releaseWebhookEvent).mockRejectedValue(
      new Error("release failed"),
    );

    await expect(
      processStripeWebhookEvent({
        event: {
          data: { object: makeStripeInvoice() },
          id: "evt_release_fail",
          type: "invoice.payment_failed",
        } as unknown as Stripe.Event,
        repository,
      }),
    ).rejects.toThrow("release failed");
  });

  it("processes fresh events end to end", async () => {
    const repository = makeRepository();

    const result = await processStripeWebhookEvent({
      event: {
        data: {
          object: makeStripeSubscription({
            priceId: "price_pro_placeholder",
            status: "active",
          }),
        },
        id: "evt_fresh",
        type: "customer.subscription.updated",
      } as unknown as Stripe.Event,
      repository,
    });

    expect(result.duplicate).toBe(false);
    expect(repository.recordWebhookEvent).toHaveBeenCalledWith({
      eventId: "evt_fresh",
      eventType: "customer.subscription.updated",
    });
    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ plan: "pro" }),
      }),
    );
  });
});

describe("Stripe billing routes", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/app-config");
    vi.doUnmock("@/lib/env");
    vi.doUnmock("@/lib/integrations/stripe");
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("@/server/services/billing/stripe.service");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns a safe checkout error when Stripe session creation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.doMock("@/lib/app-config", () => ({ isMockMode: false }));
    vi.doMock("@/lib/env", () => ({
      env: testEnv(),
      requireEnv: (value: string | undefined) => value,
    }));
    vi.doMock("@/lib/integrations/stripe", () => ({
      createStripe: () => ({
        checkout: {
          sessions: {
            create: vi
              .fn()
              .mockRejectedValue(new Error("sk_test_secret leaked")),
          },
        },
      }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => makeCheckoutSupabase(),
    }));
    vi.doMock("@/server/services/billing/stripe.service", () => ({
      getOrCreateStripeCustomer: vi.fn().mockResolvedValue("cus_123"),
    }));

    const { POST } = await import("@/app/api/stripe/checkout/route");
    const response = await POST(
      new Request("http://localhost/api/stripe/checkout", {
        body: JSON.stringify({ plan: "pro", workspace_id: workspaceId }),
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: "Could not start checkout. Try again." });
    expect(JSON.stringify(body)).not.toContain("sk_test_secret");
  });

  it("returns a safe portal error when Stripe session creation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.doMock("@/lib/app-config", () => ({ isMockMode: false }));
    vi.doMock("@/lib/env", () => ({ env: testEnv() }));
    vi.doMock("@/lib/integrations/stripe", () => ({
      createStripe: () => ({
        billingPortal: {
          sessions: {
            create: vi
              .fn()
              .mockRejectedValue(new Error("sk_test_secret leaked")),
          },
        },
      }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => makePortalSupabase(),
    }));

    const { POST } = await import("@/app/api/stripe/portal/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: "Could not open the billing portal. Try again.",
    });
    expect(JSON.stringify(body)).not.toContain("sk_test_secret");
  });
});

function subscriptionRow() {
  return {
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
  };
}

function makeRepository(): SubscriptionRepository {
  return {
    createAuditLog: vi.fn().mockResolvedValue({}),
    getSubscriptionByStripeCustomerId: vi
      .fn()
      .mockResolvedValue(subscriptionRow()),
    getWorkspaceIdForUser: vi.fn().mockResolvedValue(workspaceId),
    recordWebhookEvent: vi.fn().mockResolvedValue(true),
    releaseWebhookEvent: vi.fn().mockResolvedValue(undefined),
    upsertSubscription: vi.fn().mockResolvedValue({
      ...subscriptionRow(),
      plan: "trial",
      status: "trialing",
    }),
  };
}

function makeStripeInvoice(input: { subscriptionId?: string } = {}) {
  return {
    customer: "cus_123",
    parent: input.subscriptionId
      ? {
          subscription_details: {
            subscription: input.subscriptionId,
          },
          type: "subscription_details",
        }
      : null,
  } as Stripe.Invoice;
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

function testEnv() {
  return {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    STRIPE_CREATOR_PRICE_ID: "price_creator_placeholder",
    STRIPE_PRO_PRICE_ID: "price_pro_placeholder",
    STRIPE_STUDIO_PRICE_ID: "price_studio_placeholder",
  };
}

function makeCheckoutSupabase() {
  const membershipQuery = {
    eq: vi.fn(() => membershipQuery),
    select: vi.fn(() => membershipQuery),
    single: vi.fn().mockResolvedValue({
      data: {
        role: "owner",
        workspace_id: workspaceId,
        workspaces: { name: "Bussin" },
      },
    }),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: "owner@example.com", id: userId } },
      }),
    },
    from: vi.fn(() => membershipQuery),
  };
}

function makePortalSupabase() {
  const workspaceQuery = {
    eq: vi.fn(() => workspaceQuery),
    limit: vi.fn(() => workspaceQuery),
    select: vi.fn(() => workspaceQuery),
    single: vi.fn().mockResolvedValue({
      data: { role: "owner", workspace_id: workspaceId },
    }),
  };
  const subscriptionQuery = {
    eq: vi.fn(() => subscriptionQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { stripe_customer_id: "cus_123" },
    }),
    select: vi.fn(() => subscriptionQuery),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: "owner@example.com", id: userId } },
      }),
    },
    from: vi.fn((table: string) =>
      table === "subscriptions" ? subscriptionQuery : workspaceQuery,
    ),
  };
}
