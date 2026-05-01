# Backend 03 — Backend services and validation layer

## Agent objective

Create reusable server-side services used by UI, Edge Functions and worker.

## Required modules

```txt
src/server/services/
  workspace.service.ts
  usage.service.ts
  audit-log.service.ts
  plan-limits.service.ts
  prompt-composer.service.ts
  metadata-composer.service.ts
  status-transition.service.ts
  image-asset.service.ts
  generation-request.service.ts
  track.service.ts
  video-render.service.ts
  youtube-upload.service.ts
  secrets.service.ts

src/server/validators/
  generation.validator.ts
  image-asset.validator.ts
  youtube-upload.validator.ts
  suno-connection.validator.ts
  youtube-connection.validator.ts
  billing.validator.ts
```

## Services

### workspace.service.ts

- get current user's workspace
- check membership
- check owner/admin role
- create default workspace
- update workspace settings

### usage.service.ts

- get current usage period
- increment generated tracks
- increment uploaded videos
- increment connected channels
- return usage summary

### audit-log.service.ts

- create audit log
- list recent activity
- support metadata jsonb

Actions:

- integration.connected
- integration.disconnected
- generation.created
- track.preview_ready
- track.approved
- track.rejected
- render.completed
- upload.scheduled
- upload.completed
- upload.failed
- billing.changed

### plan-limits.service.ts

Limits:

```ts
trial: { youtubeChannels: 1, monthlyUploads: 10, monthlyGenerationRequests: 10, scheduledUploads: 5 }
creator: { youtubeChannels: 2, monthlyUploads: 100, monthlyGenerationRequests: 100, scheduledUploads: 100 }
pro: { youtubeChannels: 5, monthlyUploads: 500, monthlyGenerationRequests: 500, scheduledUploads: 500 }
studio: { youtubeChannels: 15, monthlyUploads: 2000, monthlyGenerationRequests: 2000, scheduledUploads: 2000 }
```

Return blocked result:

```ts
{ allowed: false, reason: string, currentPlan: string, requiredPlan?: string }
```

### prompt-composer.service.ts

Input:

- style
- mood
- duration_seconds
- track_count

Output:

- final_prompt
- prompt_summary
- title_seed
- suggested_tags

Rules:

- instrumental-only by default
- no advanced prompt editing in MVP
- avoid specific artist impersonation
- concise prompt

### metadata-composer.service.ts

Output:

- YouTube title
- description
- tags
- privacy default
- target channel

Rules:

- no forced AI disclaimer by default
- title YouTube-friendly
- tags relevant, not spammy

### status-transition.service.ts

Strict transitions for:

- generation_requests
- tracks
- video_renders
- youtube_uploads

Invalid transition throws typed error.

### generation-request.service.ts

- validate input with Zod
- enforce plan limits
- create generation_request
- create N tracks
- enqueue generation jobs
- create prompt_history
- write audit log

### track.service.ts

- get by ID with workspace guard
- update status
- save Suno ID
- save audio path
- approve/reject
- list tracks

### secrets.service.ts

- encrypt
- decrypt
- mask secret for UI

## Validators

### createGenerationRequestSchema

- style: string min 2 max 300
- mood: string min 2 max 300
- duration_seconds: number min 30 max 600
- track_count: number min 1 max 20
- target_youtube_channel_id: uuid optional
- image_asset_id: uuid optional
- publish_mode: draft/publish_now/schedule_later
- scheduled_at: datetime optional

## Acceptance criteria

- Services are typed.
- Mutations validate with Zod.
- Business logic is testable without UI.
- Secrets encrypted through secrets service.
- Plan checks are server-side.

## Tests required

Unit:

- prompt composer
- metadata composer
- plan limits
- status transitions
- secrets encryption/masking
- validators

Integration:

- generation request creates N tracks
- generation request enqueues jobs with queue mock
- approve track creates render job
- schedule upload creates scheduled row
- audit logs created
