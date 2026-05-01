import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import { createStripe } from "@/lib/integrations/stripe";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { getStripePriceIdForPlan } from "@/modules/billing/plan-config";
import { getOrCreateStripeCustomer } from "@/server/services/billing/stripe.service";
import { billingCheckoutSchema } from "@/server/validators/billing.validator";

export async function POST(request: Request) {
  if (isMockMode) {
    return NextResponse.json({
      url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?checkout=mock`,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = billingCheckoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout input" },
      { status: 400 },
    );
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(name)")
    .eq("workspace_id", parsed.data.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "Workspace access required" },
      { status: 403 },
    );
  }

  if (!canManageBilling(membership.role)) {
    return NextResponse.json(
      { error: "Workspace admin access required" },
      { status: 403 },
    );
  }

  const stripe = createStripe();
  const workspace = Array.isArray(membership.workspaces)
    ? membership.workspaces[0]
    : membership.workspaces;
  const customerId = await getOrCreateStripeCustomer({
    repository: createStripeCustomerRepository(supabase),
    stripe,
    userEmail: user.email,
    workspaceId: parsed.data.workspace_id,
    workspaceName: workspace?.name ?? undefined,
  });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: getStripePriceIdForPlan(parsed.data.plan),
        quantity: 1,
      },
    ],
    success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=cancelled`,
    metadata: {
      plan: parsed.data.plan,
      userId: user.id,
      workspaceId: parsed.data.workspace_id,
    },
    subscription_data: {
      metadata: {
        plan: parsed.data.plan,
        workspaceId: parsed.data.workspace_id,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}

function createStripeCustomerRepository(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  return {
    async createSubscription(input: TablesInsert<"subscriptions">) {
      const { data, error } = await supabase
        .from("subscriptions")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    async getSubscriptionByWorkspaceId(workspaceId: string) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    async updateSubscription(input: {
      workspaceId: string;
      values: TablesUpdate<"subscriptions">;
    }) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update(input.values)
        .eq("workspace_id", input.workspaceId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
  };
}

function canManageBilling(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}
