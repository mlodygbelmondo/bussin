# Screen: Single Window (supersedes screens 03–08)

Status: ACTIVE — this is the only authenticated screen. The specs
`03_dashboard_home.md`, `04_create_generation.md`, `05_generation_queue.md`,
`06_track_preview_approval.md`, `07_library.md`, and `08_scheduled_uploads.md`
are SUPERSEDED and must not be used as acceptance criteria. Their modules
remain in `src/modules` unrouted. `09_channels_management.md` and
`10_billing_settings.md` remain valid for the pages reachable from the
avatar menu.

## Purpose

`/dashboard` is the entire app: one prompt box, one feed. The user types
what they want, tracks appear in the feed, and each track is published or
scheduled with one click. See `docs/plans/2026-06-12-single-window-redesign-design.md`.

## Layout

- **Top bar**: logo (left); remaining generations badge and avatar menu
  (right). Avatar menu: Channels, Billing, Settings (legacy pages with a
  "Back to studio" bar), Sign out.
- **Prompt box** (`src/modules/feed/single-window.tsx`): textarea + track
  count (1–4) + duration (1–5 min) + Create. Centered with the headline
  "What do you want to make?" when the feed is empty; docked (sticky) on
  top once history exists. Cmd/Ctrl+Enter submits.
- **Feed** (`src/modules/feed/feed-cards.tsx`): newest first; one job group
  per generation request; one track card per track.

## Track card states

`deriveTrackStatus` in `src/modules/feed/feed.queries.ts`:
generating → preview_ready → rendering → uploading → published, with
scheduled, failed (shows `failure_reason` + Retry), and discarded branches.

Actions per state:

- preview_ready: **Publish now** (split button ▾ → _Schedule for…_),
  Edit details (collapsed title/description/tags form), Discard.
- scheduled: Publish early, Cancel schedule, scheduled time shown.
- published: Watch on YouTube link.
- failed: failure reason + Retry (`retryFailedQueueItem`).

## Data flow

- Server render: `getFeedData(userId)` (workspace-scoped under RLS).
- Live updates: TanStack Query polls `GET /api/feed` every 4 s only while
  `hasActiveWork`; quiet otherwise.
- Connections gate: if Suno or YouTube is not connected, the prompt box is
  replaced by connect cards linking to `/onboarding`.
- Publishing targets the workspace default channel.

## Test ids

`screen-single-window`, `prompt-input`, `prompt-submit`,
`track-count-select`, `duration-select`, `feed`, `job-group`, `track-card`,
`play-track`, `publish-now`, `publish-options`, `schedule-option`,
`schedule-dialog`, `schedule-input`, `schedule-confirm`, `discard-track`,
`edit-details`, `save-details`, `publish-early`, `cancel-schedule`,
`watch-on-youtube`, `track-retry`, `cancel-generation`, `usage-counter`,
`account-menu-trigger`, `connect-gate`, `sign-out`, `back-to-studio`.
