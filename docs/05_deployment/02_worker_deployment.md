# Worker Deployment Runbook

The external worker (`worker/src/index.ts`) consumes Supabase Queues jobs:
Suno generation + polling, FFmpeg video rendering, and YouTube uploads. It
ships as a single Docker image built from `Dockerfile.worker` at the repo
root. The build context must be the repo root because the worker imports
shared code from `src/` (secrets service, Suno/YouTube adapters,
`src/lib/env`). `tsx` runs the TypeScript directly — there is no build step.

## Environment Variables

The worker imports the shared env schema (`src/lib/env.ts`), which validates
at boot. With `NEXT_PUBLIC_APP_MODE=live` (the default), every non-optional
variable in that schema must be set or the process exits immediately — even
the ones the worker never reads. Set them all.

### Required and actually used by the worker

| Variable                    | Purpose                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase project URL (queue + DB access).                          |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for queue consumption and cross-workspace writes. |
| `SECRETS_ENCRYPTION_KEY`    | Decrypts stored Suno API keys and YouTube refresh tokens.          |
| `GOOGLE_CLIENT_ID`          | YouTube OAuth client (token refresh for uploads).                  |
| `GOOGLE_CLIENT_SECRET`      | YouTube OAuth client secret.                                       |
| `SUNO_DEFAULT_API_BASE_URL` | Base URL for the Suno API (e.g. `https://api.sunoapi.org`).        |

### Required only because shared env validation demands them

The worker never reads these, but `src/lib/env.ts` marks them required, and
validation runs when the worker boots. Use the same values as the web app
(dummy values technically pass validation but real ones avoid drift):

| Variable                                                                    | Why required                             |
| --------------------------------------------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                                                       | Required URL in the shared schema.       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Schema requires at least one of the two. |
| `GOOGLE_REDIRECT_URI`                                                       | Required URL in the shared schema.       |
| `STRIPE_SECRET_KEY`                                                         | Required string in the shared schema.    |
| `STRIPE_WEBHOOK_SECRET`                                                     | Required string in the shared schema.    |

Set `NEXT_PUBLIC_APP_MODE=live` explicitly in production. (`mock` would
substitute mock defaults for missing secrets — never use it outside tests.)

### Optional

| Variable                                                  | Default             | Purpose                                                                                                                                                 |
| --------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUNO_API_KEY`                                            | unset               | Dev-only fallback Suno key for workspaces with no connection. Generation runs on each workspace's own connected key; do not rely on this in production. |
| `SUNO_ALLOWED_API_HOSTS`                                  | unset               | Allowlist of Suno API hosts.                                                                                                                            |
| `WORKER_ID`                                               | `worker-<hostname>` | Identifier in logs and job claims.                                                                                                                      |
| `WORKER_MAX_ATTEMPTS`                                     | `5`                 | Max attempts before a job is dead-lettered/failed.                                                                                                      |
| `WORKER_MAX_CONCURRENCY`                                  | `2`                 | Concurrent jobs per worker process.                                                                                                                     |
| `WORKER_POLL_INTERVAL_MS`                                 | `10000`             | Queue poll interval.                                                                                                                                    |
| `WORKER_QUEUE_VISIBILITY_TIMEOUT_SECONDS`                 | `300`               | pgmq visibility timeout while a job is processed.                                                                                                       |
| `WORKER_RETRY_BASE_DELAY_SECONDS`                         | `15`                | Retry backoff base.                                                                                                                                     |
| `WORKER_RETRY_MAX_DELAY_SECONDS`                          | `900`               | Retry backoff cap.                                                                                                                                      |
| `WORKER_HEALTH_PORT`                                      | `8081`              | Port for the `GET /healthz` endpoint (set in the image).                                                                                                |
| `SUPABASE_DB_URL`                                         | unset               | Not used by the worker.                                                                                                                                 |
| `STRIPE_*_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | unset               | Optional in the schema; not used by the worker.                                                                                                         |

## Build and Run

```bash
# From the repo root (the build context MUST be the repo root)
docker build -f Dockerfile.worker -t bussin-worker .

docker run -d \
  --name bussin-worker \
  --restart always \
  --env-file .env.worker.production \
  -p 8081:8081 \
  bussin-worker
```

The image runs as the non-root `node` user, includes `ffmpeg` on PATH, and
declares a `HEALTHCHECK` against
`http://127.0.0.1:${WORKER_HEALTH_PORT:-8081}/healthz`.

When a track has no cover image, the renderer uses an FFmpeg `lavfi` color
source as the video canvas. There is no bundled `assets/default-cover.png`
fallback image and no `assets/` copy step in the worker image.

## Health Check

The worker serves `GET /healthz` on `WORKER_HEALTH_PORT` (default `8081`).
Wire your platform's health/liveness probe to it; the Docker `HEALTHCHECK`
uses the same env var and polls it every 30s with a 20s start period.

## Restart Policy

Run the worker with restart policy **always** (Docker `--restart always`,
Fly.io `restart_policy = "always"`, Railway restarts on crash by default).
Env validation failures exit the process immediately by design — a crash
loop right after deploy almost always means a missing/invalid env var.

## Railway

1. New service from this repo. Set **Dockerfile Path** to `Dockerfile.worker`
   (root directory = repo root).
2. Add all required env vars from the tables above.
3. No public domain needed; optionally point Railway's healthcheck at
   `/healthz` on port `8081`.
4. Railway restarts crashed containers automatically; set restart policy to
   "Always" in service settings.

## Fly.io

```toml
# fly.worker.toml
app = "bussin-worker"

[build]
  dockerfile = "Dockerfile.worker"

[checks.health]
  type = "http"
  port = 8081
  path = "/healthz"
  interval = "30s"
  timeout = "5s"
  grace_period = "20s"

[[restart]]
  policy = "always"
```

```bash
fly launch --no-deploy --config fly.worker.toml
fly secrets set --config fly.worker.toml NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... # etc.
fly deploy --config fly.worker.toml
```

No `[http_service]` section — the worker needs no public traffic, only the
internal health check.

## Logs

The worker logs structured JSON to stdout (`worker/src/logger.ts`). Any log
drain that tails container stdout — `railway logs`, `fly logs`, Better
Stack, Datadog, etc. — can consume and index it without extra configuration.
