"use server";

import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_AUTH_REDIRECT = "/dashboard";

export async function signIn(formData: FormData) {
  const next = safeRedirectPath(formData.get("next"));

  if (isMockMode) {
    redirect(next);
  }

  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(authPathWithState("/login", error.message, next));
  }

  redirect(next);
}

export async function signUp(formData: FormData) {
  const next = safeRedirectPath(formData.get("next"));

  if (isMockMode) {
    redirect(next);
  }

  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(authPathWithState("/signup", error.message, next));
  }

  redirect(next);
}

export async function signOut() {
  if (isMockMode) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

function authPathWithState(
  path: "/login" | "/signup",
  error: string,
  next: string,
) {
  const params = new URLSearchParams({ error });

  if (next !== DEFAULT_AUTH_REDIRECT) {
    params.set("next", next);
  }

  return `${path}?${params.toString()}`;
}

function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://")
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
}
