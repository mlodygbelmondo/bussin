# Single-Window Redesign — Design

Date: 2026-06-12
Status: approved (interview with product owner)

## Goal

Collapse the nine-screen dashboard into one bolt.new-style window: a single
prompt box, a feed that carries every track from generation to YouTube, and
nothing else visible. Reduce pre-launch surface area; hide (not delete)
everything that is not on the critical path.

## Decisions

1. **Structured input, no LLM.** One textarea for the track description plus
   exactly three controls: track count (1–4), duration, Create. Mood/style is
   expressed in the text. No natural-language intent parsing for MVP.
2. **Human approval survives as one click.** Each finished track appears in
   the feed as a card with playback and **Publish ▾ / Discard**. Title,
   description, and tags are auto-composed (`metadata-composer.service`);
   an "Edit details" disclosure is collapsed by default.
3. **One authenticated route.** `/dashboard` is the app. Feed scrollback is
   the library and history. Channels, billing, and settings open as modals
   from an avatar menu. KPI dashboard, library page, calendar page, and queue
   page are removed from navigation; their modules stay in the repo unused.
4. **Scheduling is per-track, on the card.** Publish is a split button:
   _Publish now_ / _Schedule for…_ (datetime picker). Scheduled cards show
   `⏰ <time>` with Cancel. The pg_cron dispatcher
   (`dispatch_scheduled_youtube_uploads()`) is the single dispatch path; the
   orphaned `scheduled-publish-jobs` worker path is deleted and the
   cron/publish-now double-enqueue race is guarded.
5. **Stripe stays live.** Users connect their own Suno account (their
   credits). Free tier = trial plan limits; hitting the limit shows an
   upgrade prompt; billing is reachable from the avatar menu.
6. **Design system: violet identity, systematized.** Documented OKLch tokens
   in `globals.css` + `docs/design-system.md`. Remove `.bussin-grid` /
   `.bussin-waveform` textures and glassmorphism; flat surfaces with subtle
   borders; solid violet primary buttons; cyan demoted to links/info states.
   `src/components/ui` primitives consume tokens only.

## The single window

- **Top bar**: logo; right side shows remaining free generations
  ("7/10 left") and an avatar menu (Channels, Billing, Settings, Sign out —
  each a modal/sheet).
- **Prompt area**: centered when the feed is empty ("What do you want to
  make?"), docked at top once history exists.
- **Feed**: newest first; each submission is a job group:
  1. Generating: prompt text + live status line.
  2. Per finished track: card with auto title, cover thumbnail, play button,
     Publish ▾ / Discard, collapsed Edit details.
  3. After publish: state badges — Rendering → Uploading → ✓ Published
     (YouTube link) or ⏰ Scheduled (Cancel). Failures show `failure_reason`
     with Retry.
- **Connections**: if Suno/YouTube are not connected, the empty state shows
  connect cards instead of the prompt box; `/onboarding` is absorbed.
- **Publishing target**: the workspace default channel; channel management
  lives in the avatar modal.

## Architecture changes

- Routes deleted: `/dashboard/{generate,queue,tracks/[trackId],library,scheduled}`
  (server actions and services are reused by the feed). `/dashboard/{channels,settings,billing}`
  pages redirect to `/dashboard`; their modules render in modals.
- New thin `feed` query returning the unified job-group view (tracks +
  renders + uploads joined), workspace-scoped under RLS.
- Live updates: one TanStack Query poll on recent jobs, every few seconds
  only while something is in flight; quiet when idle. (Supabase Realtime
  deferred.)
- Metadata auto-composed at generation time instead of a form.
- Worker: delete `worker/src/jobs/publish-scheduled.ts` and its queue
  registration; pg_cron is the only scheduler.
- Backend services, queues, RLS otherwise untouched.

## AGENTS.md revision

- Overview rewritten for the single-window app; hidden legacy modules named
  explicitly so agents do not resurrect them.
- Design System section pointing at `docs/design-system.md`.
- Stack corrections: Tailwind 4 via PostCSS plugin, local CVA components
  (not shadcn/daisyUI), OKLch tokens.
- `docs/03_screens/*` marked superseded by the single-window spec.

## Pre-launch checklist (docs/launch-checklist.md)

- Code health: format, lint, typecheck, tests; new tests for feed query,
  publish/schedule/discard actions, cron race guard.
- Security: RLS workspace scoping on all feed queries and modal actions;
  service-role key server-only; Suno secret encryption; Stripe webhook
  signature verification; no secrets in client bundle.
- Money path: checkout → webhook → limits raised; cancel → trial limits;
  limit-hit shows upgrade prompt.
- End-to-end (explicit runtime test): prompt → generate → preview → publish
  now → on YouTube; prompt → schedule → cron fires → uploads on time;
  failure paths (Suno failure reason + retry, YouTube token expiry).
- Housekeeping: finish Supabase publishable-key migration; readable env
  validation errors; Playwright smoke test for the single window.
