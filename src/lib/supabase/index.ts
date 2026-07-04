/**
 * The single seam for acquiring a Supabase client in server-side app code.
 *
 * Policy: the workspace-scoped, RLS-enforced client is the default. Every
 * query and mutation goes through `createWorkspaceClient()` unless it has a
 * documented reason to bypass RLS via `escalateToServiceRole()`.
 *
 * Do not import `@/lib/supabase/server` or `@/lib/supabase/admin` directly —
 * an eslint `no-restricted-imports` rule enforces this. The browser client
 * (`@/lib/supabase/client`) is separate and unaffected. The external worker
 * (`worker/src/index.ts`) is a separate runtime and constructs its own
 * service-role client from its own config.
 */
import { createClient as createRlsScopedServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cookie-bound, RLS-enforced client for the current authenticated user.
 * This is the default for all server components, route handlers, server
 * actions, and queries.
 */
export async function createWorkspaceClient() {
  return createRlsScopedServerClient();
}

/**
 * Service-role client that BYPASSES Row Level Security entirely.
 *
 * Legitimate uses (the current, audited list):
 * - Worker queue enqueue (`worker-queue.service.ts`) — pgmq RPCs are not
 *   exposed to RLS roles.
 * - Storage upload/signing (`storage.ts`) — bucket is private; access is
 *   authorized by the calling service, not RLS.
 * - Account/workspace provisioning (`auth/actions.ts`,
 *   `onboarding.actions.ts`) — creates the rows RLS would gate on.
 * - Encrypted YouTube/Suno connection secrets (`channels.actions.ts`,
 *   `onboarding.actions.ts`) — secret columns are kept out of the
 *   RLS-readable path.
 * - Stripe webhook (`api/stripe/webhook/route.ts`) — no user session exists.
 *
 * Anything else: verify workspace membership yourself before touching
 * workspace-owned rows, and prefer adding an RLS policy instead.
 */
export function escalateToServiceRole() {
  return createAdminClient();
}
