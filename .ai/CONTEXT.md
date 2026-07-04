# Bussin

Bussin turns a text prompt into an instrumental track (via the user's own
Suno account) and publishes it as a static-image video on the user's
YouTube channel. The entire authenticated product is one screen: the
single window at `/dashboard`.

## Language

**Workspace**:
The tenant that owns every row in the database; all queries and mutations are scoped to it.
_Avoid_: team, organization, account

**Single Window**:
The one authenticated screen at `/dashboard` — hero prompt plus the Feed.
_Avoid_: dashboard home, studio screen (the UI copy says "studio", the code says feed)

**Feed**:
The reverse-chronological list of Job Groups in the single window, polled every 4s while work is active.
_Avoid_: queue, library, history

**Job Group**:
One generation request and the 1–4 Tracks it produced, rendered as one card.
_Avoid_: batch, request card

**Track**:
One instrumental piece moving through the pipeline; its DB `status` must be a value from the shared status vocabulary.
_Avoid_: song, audio

**Render**:
The FFmpeg job (external Worker only) that turns a Track's audio plus a static image into an MP4 (`video_renders` row).
_Avoid_: encode, export

**Upload**:
A `youtube_uploads` row tying a Render to a YouTube channel, either draft (publish now) or scheduled.
_Avoid_: publish job, video post

**Scheduled Publish**:
An Upload with `status = "scheduled"`; dispatched ONLY by the pg_cron job `scheduled-publish-dispatcher` (there is no worker-side consumer — never add one).

**Connection**:
A workspace's link to an external account — `suno_connections` (encrypted per-workspace API key) or `youtube_connections` (OAuth tokens).
_Avoid_: integration, credential

**Worker**:
The external Node process (`worker/src`) that consumes pgmq queues: Suno polling, FFmpeg rendering, YouTube uploads.
_Avoid_: background service, daemon

**Status Vocabulary**:
The canonical status values and transitions per entity, defined once in `src/server/services/status-transition.service.ts` and imported by app and Worker alike.

**Plan Limits**:
Server-side caps derived from the Stripe subscription (free tier = trial), enforced in `plan-limits.service` before generation and before creating Uploads.

**Mock Mode**:
`isMockMode` short-circuits every query/action with fixtures from `src/modules/dev/mock-data.ts`; only mocks for live screens exist.

## Relationships

- A **Workspace** has many **Job Groups**; a **Job Group** has 1–4 **Tracks**.
- A **Track** has at most one active **Render**; an **Upload** references exactly one **Track** and one **Render**.
- A **Track**'s Feed status is _derived_ (`deriveTrackStatus`) from the raw statuses of the track + render + upload rows.
- Generation requires a connected Suno **Connection**; publishing requires a connected YouTube **Connection** with a channel.

## Example dialogue

> **Dev:** "When the user clicks Publish on a **Track**, do we upload immediately?"
> **Domain expert:** "Only if its **Render** is finished. Otherwise we create the **Upload** as a draft and the **Worker** enqueues the upload right after the render completes. A **Scheduled Publish** additionally waits for the pg_cron dispatcher — which skips it if the render isn't done."

## Flagged ambiguities

- "queue" used to mean both the pgmq work queues and a deleted legacy screen — resolved: **Feed** is the UI, "queue" refers only to pgmq.
- "publish" vs "upload" — resolved: _publish_ is the user intent (now or scheduled); **Upload** is the record/job that fulfils it.
