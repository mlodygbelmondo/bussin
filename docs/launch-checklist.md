# Launch Checklist

Walk this before pushing Bussin to users. Items marked ✅ were verified on
2026-06-12 during the single-window redesign; re-verify anything marked ⬜
or anything touched since.

## Code health

- ✅ `pnpm format:check` passes.
- ✅ `pnpm lint` passes.
- ✅ `pnpm typecheck` passes (includes `worker/src`).
- ✅ `pnpm test` passes (feed status derivation, validators, services,
  queue jobs, migration policies).
- ⬜ Playwright smoke test of the single window (`pnpm test:e2e`) — run
  explicitly before launch; selectors are listed in
  `docs/03_screens/11_single_window.md`.

## Security

- ✅ Stripe webhook verifies signatures (`stripe.webhooks.constructEvent`
  in `src/app/api/stripe/webhook/route.ts`).
- ✅ Service-role key only in server-only files
  (`src/lib/supabase/admin.ts` consumers, worker config); no client
  component imports it.
- ✅ Feed query and all feed actions scope by `workspace_id` under RLS
  (membership resolved server-side from the session user).
- ✅ Signed storage URLs require requester membership and
  workspace-prefixed paths (`src/server/services/storage.ts`).
- ✅ `src/lib/public-env.ts` exposes only `NEXT_PUBLIC_*` values
  (publishable key, URL, app mode).
- ⬜ Suno cookies encrypted at rest with `SECRETS_ENCRYPTION_KEY` — confirm
  the production key is set and not a mock value.
- ⬜ Supabase RLS policies applied in the production project (run all
  migrations including `20260612090000_single_scheduling_path.sql` and
  `20260613090000_usage_billing_maintenance_hardening.sql`).

## Money path (Stripe live decision: free tier + paid plans)

- ⬜ Checkout → webhook → `subscriptions.plan` updated → limit raised.
- ⬜ Cancel/downgrade → back to trial limits at period end.
- ⬜ Hitting the trial limit (10 generations/month) blocks generation with
  a clear message and the billing page is reachable from the avatar menu.
- ⬜ Stripe price IDs (`STRIPE_*_PRICE_ID`) set in production env.

## The one real journey (explicit runtime test — ask for it)

- ⬜ Sign up → connect Suno (own account) → connect YouTube → default
  channel set.
- ⬜ Prompt → tracks generate → preview plays in the feed.
- ⬜ Publish now → render → upload → "Watch on YouTube" link works.
- ⬜ Schedule for +5 min → pg_cron dispatches → uploads at the set time;
  scheduling before the render finishes waits for the render (dispatcher
  render-readiness guard).
- ⬜ Cancel schedule and Publish early both work from the track card.
- ⬜ Failure paths: Suno failure shows `failure_reason` + Retry; expired
  YouTube token surfaces a clear failure (not a silent hang).

## Infrastructure

- ⬜ External worker deployed, running, and consuming
  generation/suno-polling/render/youtube-upload/maintenance queues
  (scheduled-publish queue no longer exists).
- ⬜ pg_cron jobs active: scheduled-publish-dispatcher (1 min),
  stale-job-recovery, sync-suno-limits, cleanup-temp-assets.
- ⬜ Env validation passes on production boot (no mock defaults leaking:
  `NEXT_PUBLIC_APP_MODE` must not be `mock`).
- ⬜ Error monitoring/logging destination confirmed for worker job
  failures.
