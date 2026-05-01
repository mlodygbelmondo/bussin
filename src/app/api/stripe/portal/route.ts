import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import { createStripe } from "@/lib/integrations/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (isMockMode) {
    return NextResponse.json({
      url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?portal=mock`,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: workspace } = await supabase
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (workspace && !canManageBilling(workspace.role)) {
    return NextResponse.json(
      { error: "Workspace admin access required" },
      { status: 403 },
    );
  }

  const { data: subscription } = workspace
    ? await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("workspace_id", workspace.workspace_id)
        .maybeSingle()
    : { data: null };
  const customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "Stripe customer missing" },
      { status: 409 },
    );
  }

  const stripe = createStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return NextResponse.json({ url: portal.url });
}

function canManageBilling(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}
