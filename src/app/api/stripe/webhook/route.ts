import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isMockMode } from "@/lib/app-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, requireEnv } from "@/lib/env";
import { createStripe } from "@/lib/integrations/stripe";
import { processStripeWebhookEvent } from "@/server/services/billing/subscription.service";

export async function POST(request: Request) {
  if (isMockMode) {
    return NextResponse.json({ received: true });
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = createStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      requireEnv(env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await processStripeWebhookEvent({
      event,
      repository: createSubscriptionRepository(createAdminClient()),
    });
  } catch (error) {
    console.error("Stripe webhook processing failed.", {
      error,
      eventId: event.id,
      eventType: event.type,
    });

    // 500 so Stripe redelivers; the event-id record makes redelivery safe.
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function createSubscriptionRepository(
  supabase: ReturnType<typeof createAdminClient>,
) {
  return {
    async createAuditLog(input: Record<string, unknown>) {
      const { data, error } = await supabase
        .from("audit_logs")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    async getSubscriptionByStripeCustomerId(stripeCustomerId: string) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("stripe_customer_id", stripeCustomerId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    async recordWebhookEvent(input: { eventId: string; eventType: string }) {
      const { error } = await supabase
        .from("stripe_webhook_events")
        .insert({ event_type: input.eventType, id: input.eventId });

      if (error) {
        if (error.code === "23505") {
          return false;
        }

        throw error;
      }

      return true;
    },
    async releaseWebhookEvent(eventId: string) {
      const { error } = await supabase
        .from("stripe_webhook_events")
        .delete()
        .eq("id", eventId);

      if (error) {
        throw error;
      }
    },
    async getWorkspaceIdForUser(userId: string) {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data?.workspace_id ?? null;
    },
    async upsertSubscription(input: {
      workspaceId: string;
      values: Record<string, unknown>;
    }) {
      const { data, error } = await supabase
        .from("subscriptions")
        .upsert(
          {
            workspace_id: input.workspaceId,
            ...input.values,
          },
          { onConflict: "workspace_id" },
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
  };
}
