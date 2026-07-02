"use server";

import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/app-config";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_AUTH_REDIRECT = "/dashboard";
const FORGOT_PASSWORD_SENT_PATH = "/forgot-password?sent=1";
const RESET_LINK_ERROR =
  "This reset link is invalid or has expired. Please request a new one.";

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

export async function requestPasswordReset(formData: FormData) {
  if (isMockMode) {
    redirect(FORGOT_PASSWORD_SENT_PATH);
  }

  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    // Intentionally ignore the result: always show the same confirmation so
    // the form cannot be used to enumerate registered accounts.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl("/reset-password"),
    });
  }

  redirect(FORGOT_PASSWORD_SENT_PATH);
}

export async function updatePassword(formData: FormData) {
  if (isMockMode) {
    redirect(DEFAULT_AUTH_REDIRECT);
  }

  const code = String(formData.get("code") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const validationError = validatePassword(password, confirmPassword);

  if (validationError) {
    redirect(resetPasswordPathWithState(validationError, code));
  }

  const supabase = await createClient();

  // Server Components cannot persist auth cookies, so the recovery code from
  // the email link is exchanged here, inside the server action.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect(resetPasswordPathWithState(RESET_LINK_ERROR));
    }
  } else {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      redirect(resetPasswordPathWithState(RESET_LINK_ERROR));
    }
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    // The recovery code is single-use and the session cookie is already set
    // after a successful exchange, so retries proceed without the code.
    redirect(resetPasswordPathWithState(error.message));
  }

  redirect(DEFAULT_AUTH_REDIRECT);
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

function resetPasswordPathWithState(error: string, code?: string) {
  const params = new URLSearchParams({ error });

  if (code) {
    params.set("code", code);
  }

  return `/reset-password?${params.toString()}`;
}

function appUrl(path: string) {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

function validatePassword(password: string, confirmPassword: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least 1 number.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
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
