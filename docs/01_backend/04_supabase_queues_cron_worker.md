# Backend 04 — Supabase Queues, Cron and external worker

## Agent objective

Set up async processing using Supabase Queues and an external Node.js worker.

## Required queues

- generation-jobs
- suno-polling-jobs
- render-jobs
- youtube-upload-jobs
- scheduled-publish-jobs
- maintenance-jobs

## Payloads

### generation-jobs

```json
{ "workspaceId": "uuid", "generationRequestId": "uuid", "trackId": "uuid" }
```

### suno-polling-jobs

```json
{
  "workspaceId": "uuid",
  "trackId": "uuid",
  "sunoTrackId": "string",
  "attempt": 1
}
```

### render-jobs

```json
{ "workspaceId": "uuid", "trackId": "uuid", "videoRenderId": "uuid" }
```

### youtube-upload-jobs

```json
{
  "workspaceId": "uuid",
  "trackId": "uuid",
  "videoRenderId": "uuid",
  "youtubeUploadId": "uuid"
}
```

## Worker structure

```txt
worker/src/
  index.ts
  config.ts
  logger.ts
  queue/
    queue-client.ts
    queue-types.ts
    retry-policy.ts
  jobs/
    process-generation.ts
    poll-suno.ts
    render-video.ts
    upload-youtube.ts
    publish-scheduled.ts
  services/
    suno/
    youtube/
    ffmpeg/
    storage/
    database/
```

## Worker requirements

- TypeScript
- graceful shutdown
- configurable concurrency
- structured logging
- worker ID env
- service role Supabase client only in worker
- retries with backoff
- readable failure reasons
- DB status updates

## Queue abstraction

Implement helpers:

- enqueueGenerationJob
- enqueueSunoPollingJob
- enqueueRenderJob
- enqueueYoutubeUploadJob
- consumeQueue
- ackMessage
- retryMessage
- failMessage

## Job processors

### process-generation

1. consume `generation-jobs`
2. set track `generating`
3. call Suno `createCustomGeneration`
4. save `suno_track_id`
5. set `polling`
6. enqueue `suno-polling-jobs`

### poll-suno

1. consume `suno-polling-jobs`
2. call Suno `getTrackStatus`
3. if not ready, re-enqueue with delay
4. if ready, save audio URL
5. copy/download audio to `audio-assets`
6. mark `preview_ready`
7. audit log `track.preview_ready`

### render-video

1. consume `render-jobs`
2. set track `rendering`
3. fetch audio/image
4. run FFmpeg
5. upload MP4 to `video-renders`
6. set render `rendered`
7. set track `rendered`
8. if publish_now, enqueue upload

### upload-youtube

1. consume `youtube-upload-jobs`
2. set upload `uploading`
3. refresh YouTube token
4. upload video
5. save YouTube video ID
6. set upload `uploaded`
7. set track `uploaded`
8. increment usage
9. audit log

## Supabase Cron

Jobs:

```txt
*/1 * * * * scheduled-publish-dispatcher
*/5 * * * * stale-job-recovery
0 */6 * * * sync-suno-limits
0 3 * * * cleanup-temp-assets
```

## Acceptance criteria

- Queues configured.
- Worker starts locally.
- Worker consumes test queue message.
- Worker updates DB status.
- Retry/backoff exists.
- Scheduled dispatcher enqueues due uploads.
- No FFmpeg in Next.js route handlers.

## Tests required

Unit:

- retry policy
- payload validation
- job error mapping

Integration:

- enqueue/consume message
- process-generation with mocked Suno
- poll-suno ready state
- scheduled dispatcher ignores future uploads
- scheduled dispatcher enqueues due uploads
