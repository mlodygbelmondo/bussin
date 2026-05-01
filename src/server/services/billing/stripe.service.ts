import type Stripe from "stripe";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type BillingSubscription = Tables<"subscriptions">;

export type StripeCustomerRepository = {
  createSubscription(
    input: TablesInsert<"subscriptions">,
  ): Promise<BillingSubscription>;
  getSubscriptionByWorkspaceId(
    workspaceId: string,
  ): Promise<BillingSubscription | null>;
  updateSubscription(input: {
    workspaceId: string;
    values: TablesUpdate<"subscriptions">;
  }): Promise<BillingSubscription>;
};

export async function getOrCreateStripeCustomer(input: {
  repository: StripeCustomerRepository;
  stripe: Stripe;
  workspaceId: string;
  workspaceName?: string | null;
  userEmail: string;
}) {
  const existing = await input.repository.getSubscriptionByWorkspaceId(
    input.workspaceId,
  );

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await input.stripe.customers.create({
    email: input.userEmail,
    metadata: {
      workspaceId: input.workspaceId,
    },
    name: input.workspaceName ?? undefined,
  });

  if (existing) {
    await input.repository.updateSubscription({
      workspaceId: input.workspaceId,
      values: { stripe_customer_id: customer.id },
    });
  } else {
    await input.repository.createSubscription({
      workspace_id: input.workspaceId,
      stripe_customer_id: customer.id,
    });
  }

  return customer.id;
}
