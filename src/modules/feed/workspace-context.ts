import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated user and their workspace for server actions.
 * Redirects to /login when unauthenticated and /onboarding when the user
 * has no workspace yet — callers can assume both exist after awaiting.
 */
export async function requireWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    redirect("/onboarding");
  }

  return {
    supabase,
    user,
    userId: user.id,
    workspaceId: data.workspace_id,
  };
}
