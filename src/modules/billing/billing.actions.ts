"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import { createStripe } from "@/lib/integrations/stripe";
import { createWorkspaceClient } from "@/lib/supabase";
import { getStripePriceIdForPlan } from "@/modules/billing/plan-config";
import { getOrCreateStripeCustomer } from "@/server/services/billing/stripe.service";
import {
  billingCheckoutSchema,
  type BillingPlan,
  workspaceSettingsSchema,
} from "@/server/validators/billing.validator";

const PLAN_ORDER: BillingPlan[] = ["trial", "creator", "pro", "studio"];

export type WorkspaceSettingsActionState = {
  message: string | null;
  status: "error" | "idle" | "success";
};

export async function startCheckoutAction(formData: FormData) {
  if (isMockMode) {
    redirect("/dashboard/billing?checkout=mock");
  }

  const parsed = billingCheckoutSchema.safeParse({
    plan: formData.get("plan"),
    workspace_id: formData.get("workspace_id"),
  });

  if (!parsed.success) {
    throw new Error("Invalid checkout input.");
  }

  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(name)")
    .eq("workspace_id", parsed.data.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !user.email) {
    throw new Error("Workspace access required.");
  }

  if (!canManageBilling(membership.role)) {
    throw new Error("Workspace admin access required.");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("workspace_id", parsed.data.workspace_id)
    .maybeSingle();
  const currentPlan = toBillingPlan(subscription?.plan);

  if (!isPlanUpgrade(currentPlan, parsed.data.plan)) {
    throw new Error("Checkout is only available for plan upgrades.");
  }

  const workspace = Array.isArray(membership.workspaces)
    ? membership.workspaces[0]
    : membership.workspaces;
  const stripe = createStripe();
  const customerId = await getOrCreateStripeCustomer({
    repository: createStripeCustomerRepository(supabase),
    stripe,
    userEmail: user.email,
    workspaceId: parsed.data.workspace_id,
    workspaceName: workspace?.name ?? undefined,
  });
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: getStripePriceIdForPlan(parsed.data.plan),
        quantity: 1,
      },
    ],
    metadata: {
      plan: parsed.data.plan,
      userId: user.id,
      workspaceId: parsed.data.workspace_id,
    },
    mode: "subscription",
    subscription_data: {
      metadata: {
        plan: parsed.data.plan,
        workspaceId: parsed.data.workspace_id,
      },
    },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error("Stripe checkout URL missing.");
  }

  redirect(session.url);
}

export async function openCustomerPortalAction(formData: FormData) {
  if (isMockMode) {
    redirect("/dashboard/billing?portal=mock");
  }

  const workspaceId = formData.get("workspace_id");

  if (typeof workspaceId !== "string") {
    throw new Error("Workspace required.");
  }

  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    throw new Error("Workspace access required.");
  }

  if (!canManageBilling(membership.role)) {
    throw new Error("Workspace admin access required.");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    throw new Error("Stripe customer missing.");
  }

  const portal = await createStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  redirect(portal.url);
}

export async function updateWorkspaceSettingsAction(
  _previousState: WorkspaceSettingsActionState,
  formData: FormData,
): Promise<WorkspaceSettingsActionState> {
  if (isMockMode) {
    return { message: "Mock settings saved.", status: "success" };
  }

  const workspaceId = formData.get("workspace_id");

  if (typeof workspaceId !== "string") {
    return { message: "Workspace required.", status: "error" };
  }

  const parsed = workspaceSettingsSchema.safeParse({
    auto_normalize_audio: formData.get("auto_normalize_audio") === "on",
    default_bpm: formData.get("default_bpm"),
    default_format: formData.get("default_format"),
    default_genre: formData.get("default_genre"),
    default_image_asset_id: emptyToNull(formData.get("default_image_asset_id")),
    default_key: formData.get("default_key"),
    default_license: formData.get("default_license"),
    default_mood: formData.get("default_mood"),
    default_privacy_status: formData.get("default_privacy_status"),
    default_storage_location: formData.get("default_storage_location"),
    default_youtube_channel_id: emptyToNull(
      formData.get("default_youtube_channel_id"),
    ),
    extract_stems_on_upload: formData.get("extract_stems_on_upload") === "on",
    notify_billing_payments: formData.get("notify_billing_payments") === "on",
    notify_generation_completions:
      formData.get("notify_generation_completions") === "on",
    notify_marketing_emails: formData.get("notify_marketing_emails") === "on",
    notify_product_updates: formData.get("notify_product_updates") === "on",
    timezone: formData.get("timezone"),
    youtube_description_template: emptyToNull(
      formData.get("youtube_description_template"),
    ),
    youtube_title_template: emptyToNull(formData.get("youtube_title_template")),
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? "Invalid settings.",
      status: "error",
    };
  }

  const { supabase, user } = await requireUser();
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return { message: "Workspace access required.", status: "error" };
  }

  if (!canManageBilling(membership.role)) {
    return { message: "Workspace admin access required.", status: "error" };
  }

  const validationError = await validateWorkspaceReferences({
    imageAssetId: parsed.data.default_image_asset_id,
    supabase,
    workspaceId,
    youtubeChannelId: parsed.data.default_youtube_channel_id,
  });

  if (validationError) {
    return { message: validationError, status: "error" };
  }

  const { error } = await supabase.from("workspace_settings").upsert({
    ...parsed.data,
    workspace_id: workspaceId,
  });

  if (error) {
    return { message: error.message, status: "error" };
  }

  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/settings");

  return { message: "Settings saved.", status: "success" };
}

async function requireUser() {
  const supabase = await createWorkspaceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function emptyToNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function validateWorkspaceReferences(input: {
  imageAssetId: string | null;
  supabase: Awaited<ReturnType<typeof createWorkspaceClient>>;
  workspaceId: string;
  youtubeChannelId: string | null;
}): Promise<string | null> {
  if (input.youtubeChannelId) {
    const { data } = await input.supabase
      .from("youtube_channels")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.youtubeChannelId)
      .maybeSingle();

    if (!data) {
      return "Default channel is not available in this workspace.";
    }
  }

  if (input.imageAssetId) {
    const { data } = await input.supabase
      .from("image_assets")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.imageAssetId)
      .maybeSingle();

    if (!data) {
      return "Default image asset is not available in this workspace.";
    }
  }

  return null;
}

function createStripeCustomerRepository(
  supabase: Awaited<ReturnType<typeof createWorkspaceClient>>,
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

function isPlanUpgrade(currentPlan: BillingPlan, requestedPlan: BillingPlan) {
  return PLAN_ORDER.indexOf(requestedPlan) > PLAN_ORDER.indexOf(currentPlan);
}

function toBillingPlan(plan: string | null | undefined): BillingPlan {
  return PLAN_ORDER.includes(plan as BillingPlan)
    ? (plan as BillingPlan)
    : "trial";
}
