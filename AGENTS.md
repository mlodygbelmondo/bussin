# AGENTS.md

## Project Overview

Bussin is a single-window app for generating instrumental tracks through
Suno and publishing or scheduling them on YouTube. The entire authenticated
experience is one screen at `/dashboard`: a prompt box plus a feed that
carries every track from generation through render to YouTube. Videos are
static-image MP4s rendered with FFmpeg in an external worker.

Domain glossary (use these words, in code and in conversation):
`.ai/CONTEXT.md`. Design reference:
`docs/plans/2026-06-12-single-window-redesign-design.md`.

## Stack

- Next.js 16 App Router, Route Handlers, Server Actions, React 19, TypeScript.
- Supabase Auth, Postgres, RLS, Storage, Queues (pgmq), Cron, and Edge Functions.
- Stripe checkout, customer portal, and webhooks.
- External Node.js worker (`worker/src`, same TypeScript project) for Suno
  polling, FFmpeg rendering, and YouTube upload jobs.
- Tailwind CSS 4 (PostCSS plugin), local CVA-based UI primitives in
  `src/components/ui` (shadcn-style but locally owned; no daisyUI), OKLch
  design tokens, lucide-react.
- Zod, React Hook Form, TanStack Query, Vitest, Playwright.

## The Single Window

`/dashboard` is the only authenticated screen
(spec: `docs/03_screens/11_single_window.md`). Everything lives in
`src/modules/feed` — one file per job:

- `feed.queries.ts` — server query; derives each track's feed status from
  the raw track/render/upload rows (`deriveTrackStatus`).
- `feed.actions.ts` — generation prompt + track detail edits.
- `publish.actions.ts` — approve / reject / publish now / schedule a track.
- `schedule.actions.ts` — reschedule / cancel / publish-early for scheduled uploads.
- `jobs.actions.ts` — retry and cancel for failed/running jobs.
- `feed-action.ts` — `runFeedAction()`, the single seam every server action
  goes through: mock-mode short-circuit, `requireWorkspace()`, Zod parse,
  error → result mapping, dashboard revalidation.
- `workspace-context.ts` — `requireWorkspace()`, the auth+workspace guard
  every action calls first (via `runFeedAction`).
- `single-window.tsx` — the screen: hero prompt, connect gate, polling.
- `feed-cards.tsx` — job-group card; `track-card.tsx` — track row with
  dialogs and audio preview.
- `status-presentation.tsx` — status → `Badge` label/variant mapping.
- `use-feed-action.ts` — client hook that runs any feed action with
  toast + feed invalidation. All feed mutations go through it.
- `src/app/api/feed/route.ts` — polling endpoint (4s while work is active).

Channels, billing, and settings pages stay reachable only from the avatar
menu and carry a "Back to studio" bar. Scheduling is per track via the
Publish split button. The ONLY dispatch mechanism is the pg_cron job
`scheduled-publish-dispatcher` → `dispatch_scheduled_youtube_uploads()`;
it skips uploads whose render is not finished. There is no worker-side
scheduled-publish consumer — do not reintroduce one.

The legacy multi-screen UI (KPI dashboard, generate form, queue, library,
scheduled, track preview) was deleted in 2026-07; the routes
`/dashboard/{generate,queue,library,scheduled,tracks/[trackId]}` redirect
to `/dashboard`, and screen specs `docs/03_screens/03`–`08` are superseded.
Do not rebuild those screens without an explicit product decision.

## Status Vocabulary

`src/server/services/status-transition.service.ts` is the single source of
truth for every track/render/upload/generation-request status and the legal
transitions between them. The DB columns are plain text — this module is
the only typo guard. Import its types (`TrackStatus`, `VideoRenderStatus`,
`YoutubeUploadStatus`, `GenerationRequestStatus`), arrays, and type guards
in app and worker code; never introduce a status string that is not in the
TRANSITIONS map.

## Design System

`docs/design-system.md` is binding ("Ember on Ink"). Tokens live in
`src/app/globals.css`; components consume tokens only. Hard rules: ember
(`--primary`) is the only accent; state colors (`--success`, `--warning`,
`--danger`, `--info`) mark state, never decoration; flat surfaces with 1px
borders; status display uses the `Badge` component variants. Expressive
visuals follow the "sound made visible" concept: the ambient trio
(`<Aurora />`, `<Starfield />`, `.grain`) runs on home, auth, AND
`/dashboard` — the dashboard is never a flat black box. Home may add
waveform-derived choreography; on the dashboard everything beyond the
ambient trio is reactive — motion responds to audio or job events, never
idles, with a budget of at most four signature moments. Utility pages
(settings, billing, channels) stay plain. The only
gradients anywhere are the aurora and the logo mark. Motion: `motion/react`
via the primitives in `src/components/common/motion.tsx`, transform/opacity
only, reduced-motion respected, optimistic UI on feed mutations (see the
Motion section of the design doc).

The living reference is the dev-only playground at `/design`
(`src/app/design`) — every primitive, variant, and state on real tokens.
When you add or change a primitive, update the playground in the same
change.

## Repository Map

- `src/app`: App Router pages, layouts, route handlers, server actions entrypoints.
- `src/components/ui`: shared primitive UI components (CVA + tokens).
- `src/components/common`: shared product components (logo, motion, starfield, top bar).
- `src/modules`: feature modules; `src/modules/feed` is the live product surface.
- `src/server/services`: server-only business logic, repositories, and
  integration orchestration (incl. the status vocabulary).
- `src/server/validators`: Zod schemas for server-side validation
  (generation, billing, and friends).
- `src/lib/supabase`: Supabase clients; `src/lib/database.types.ts`:
  generated DB types (shared with the worker — regenerate with `pnpm db:types`).
- `worker/src`: external worker jobs, queue client, and service adapters.
  It imports shared code from `src/` via relative paths (`../../src/...`).
- `supabase/migrations`: database schema, RLS policies, queues, cron, and storage setup.
- `supabase/functions`: Supabase Edge Functions.
- `docs`: design doc, design system, testid inventory, launch checklist,
  staged specs (see `docs/README.md` for what is superseded).
- `design-reference`: visual references (predate the single-window redesign).
- `tests`: unit, integration, and e2e tests.

## Commands

- Install dependencies with `pnpm install`.
- Format with `pnpm format`; run the relevant Prettier formatting command before reporting coding work as done.
- Check formatting with `pnpm format:check`.
- Lint with `pnpm lint`.
- Typecheck with `pnpm typecheck` (covers `worker/src` too).
- Run unit/integration tests with `pnpm test`.
- Run e2e tests with `pnpm test:e2e` only when explicitly asked to test the app.
- Generate Supabase types with `pnpm db:types` after schema changes.
- Regenerate the testid inventory with `pnpm docs:testids` after adding/removing `data-testid`s.

Known-failing without local env: `tests/integration/supabase-rls.test.ts`
and `tests/integration/migration-policies.test.ts` need a running local
Supabase; `tests/unit/billing.test.ts` needs real Stripe price IDs in env.
Do not chase these unless your change touches billing or RLS.

## Runtime Testing Rule

- Never start, open, browse, curl, screenshot, Playwright-test, or otherwise interact with the running app unless the user explicitly asks for app/runtime testing in the prompt.

## Verification

- Code checks such as formatting, lint, typecheck, and focused unit/integration tests are allowed when relevant.
- Prefer focused checks for the changed area before broader suites.
- Do not run e2e/browser/manual app checks unless the prompt explicitly asks for runtime testing.
- If a requested verification needs missing environment variables or credentials, state the blocker and do not invent secrets.
- Before pushing to users, walk `docs/launch-checklist.md`.

## Authenticated App Testing

When explicitly asked to test authenticated features:

- Use Browser Use / in-app browser when available.
- Check what port the app is already running on.
- If not logged in, use the dedicated test account from `.env` or `.env.local`.
- Never use production credentials.
- Do not print passwords in logs or final answers.
- If credentials are missing, ask the user to provide or create a test account.

## Next.js Rule

This is not the Next.js you know: this project uses Next.js 16 with breaking API, convention, and file-structure changes. Before writing Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

## Architecture Rules

- Keep workspace-owned data protected by Supabase RLS and always scope queries/mutations by the current workspace.
- Validate mutations with Zod on the server.
- Keep secrets out of the client bundle; use Supabase service role only in server-only code, Edge Functions, or the worker.
- Long-running work belongs in Supabase Queues and the external worker, not request/response paths.
- FFmpeg work belongs only in the external worker.
- Trust Stripe subscription/payment state from webhooks, not client redirects.
- Keep YouTube and Suno adapters mockable behind service boundaries.
- Status strings come from the status vocabulary
  (`status-transition.service.ts`) — never hardcode one that isn't there.
- Store async failure details in clear `failure_reason` fields where the schema supports it — the feed surfaces them verbatim with a Retry button.
- Users bring their own Suno account; plan limits (free tier = trial) are
  enforced server-side in `plan-limits.service` before generation.
- Generation runs on each workspace's own Suno API key: the worker decrypts
  the `connected` row in `suno_connections` per job and marks it `error` on
  auth failures. The env `SUNO_API_KEY` is a dev-only fallback for
  workspaces with no connection — never make it the primary path. The
  generation service refuses to enqueue when no Suno account is connected
  (`SUNO_NOT_CONNECTED`).

## UI Rules

- Follow `docs/design-system.md`; tokens only, no new colors; expressive
  effects only within its "sound made visible" two-tier rules.
- New primitives follow the authoring convention in the design doc: CVA
  variants when a primitive has variants, plain token classes otherwise;
  showcase every primitive in `/design`.
- The single window must keep loading, empty (connect gate), and error states working.
- Mutations surface success/error feedback with toasts; async failures show `failure_reason` plus Retry.
- Add stable `data-testid` selectors for Playwright-relevant UI. The
  canonical inventory is the generated `docs/testids.md` — check it before
  naming a new one, rerun `pnpm docs:testids` after.
- Use lucide-react icons and existing `src/components/ui` primitives.

## Documentation And Task Specs

- `.ai/CONTEXT.md` is the domain glossary — use its terms in code, commits, and docs.
- `docs/README.md` lists the staged task order and what is superseded.
- ACTIVE screen specs: `03_screens/01_auth_login_signup.md`,
  `02_onboarding_connect_accounts.md`, `09_channels_management.md`,
  `10_billing_settings.md`, `11_single_window.md`.
  SUPERSEDED (do not implement against): `03`–`08`.
- Treat each file under `docs/01_backend`, `docs/02_stripe`, `docs/04_tests`, and `docs/05_deployment` as the acceptance source for that task.
- Update or add tests when behavior changes, especially for backend services, validators, queue jobs, and workspace access rules.
