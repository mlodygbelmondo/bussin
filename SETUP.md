# Bussin Setup Guide

Everything you need to take the app from a fresh clone to production. Each
section tells you which env vars it produces and exactly where to get them.
Copy `.env.example` to `.env.local` (web app) and fill values in as you go;
the worker reads the same variables (via `.env` or its host's env settings).

Quick mental model: **Supabase** stores everything and runs the cron
dispatcher, **Stripe** handles money, **Google** handles YouTube uploads,
**Suno** generates audio (each user connects their own key; you only set the
API base URL), and the **worker** does all long-running work.

---

## 1. Supabase (database, auth, storage, queues)

Produces: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Project Settings → **API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     (legacy anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works; you
     only need one of the two)
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
     (server/worker only — never expose it to the browser)
3. Project Settings → **Database** → Connection string (URI) →
   `SUPABASE_DB_URL` (only used for local tooling; optional in production).
4. Apply the schema (includes RLS, queues, cron jobs, storage buckets):

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

5. Verify the cron jobs exist (SQL editor):

   ```sql
   select jobname, schedule from cron.job;
   -- expect: scheduled-publish-dispatcher (*/1), stale-job-recovery (*/5),
   --         sync-suno-limits (0 */6), cleanup-temp-assets (0 3)
   ```

6. Auth → **URL Configuration**: set the Site URL to your production domain
   and add `https://<your-domain>/reset-password` to the redirect allow-list
   (the forgot-password flow sends users there).
7. After any future schema change run `pnpm db:types` to regenerate
   `src/lib/supabase` types (needs the project linked or local Supabase
   running).

## 2. Secrets encryption key

Produces: `SECRETS_ENCRYPTION_KEY`

Used to encrypt Suno API keys and YouTube OAuth tokens at rest. Generate one
and use the **same value** for the web app and the worker:

```bash
openssl rand -base64 32
```

Production boot now fails on purpose if this is still the mock default.

## 3. Stripe (billing)

Produces: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_CREATOR_PRICE_ID`, `STRIPE_PRO_PRICE_ID`,
`STRIPE_STUDIO_PRICE_ID`

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Developers →
   **API keys**: secret key → `STRIPE_SECRET_KEY`, publishable key →
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. (Use test-mode keys until launch.)
2. Product catalog → create three recurring monthly products matching
   `src/modules/billing/plan-config.ts`: Creator $19, Pro $49, Studio $149.
   Copy each price id (`price_...`) into the matching `STRIPE_*_PRICE_ID`.
3. Developers → **Webhooks** → Add endpoint:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`,
     `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`,
     `invoice.payment_succeeded`
   - Signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`
4. Settings → Billing → **Customer portal**: enable it (the in-app "Manage
   billing" button opens it).
5. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   and use the printed `whsec_...` as your local `STRIPE_WEBHOOK_SECRET`.

## 4. Google / YouTube (uploads)

Produces: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

1. [console.cloud.google.com](https://console.cloud.google.com) → create a
   project → APIs & Services → **Enable APIs** → enable **YouTube Data API v3**.
2. **OAuth consent screen**: External, add scopes
   `youtube.upload`, `youtube.readonly`, `userinfo.email`. While the app is
   in "Testing" status, add your own Google account under Test users
   (tokens then expire after 7 days — fine for testing; submit for
   verification before real users).
3. **Credentials** → Create credentials → OAuth client ID → Web application:
   - Authorized redirect URI:
     `https://<your-domain>/api/youtube/oauth/callback`
     (and `http://localhost:3000/api/youtube/oauth/callback` for dev)
   - Client ID → `GOOGLE_CLIENT_ID`, client secret → `GOOGLE_CLIENT_SECRET`
   - The redirect URI you registered → `GOOGLE_REDIRECT_URI`

Note: videos uploaded by unverified API projects may be locked private by
YouTube until the project passes an API audit — plan for that before launch.

## 5. Suno

Produces: `SUNO_DEFAULT_API_BASE_URL`, `SUNO_ALLOWED_API_HOSTS`, and the
optional dev-only `SUNO_API_KEY`

Users bring their own Suno API access: each workspace connects its own key
(stored encrypted in `suno_connections`) during onboarding. You only
configure:

- `SUNO_DEFAULT_API_BASE_URL=https://api.sunoapi.org`
- `SUNO_ALLOWED_API_HOSTS=api.sunoapi.org` (hosts users may point their
  connection at)
- `SUNO_API_KEY` — optional, dev-only fallback for workspaces without a
  connection. **Leave it unset in production.** Get a key for your own
  testing from [sunoapi.org](https://sunoapi.org).

## 6. App basics

- `NEXT_PUBLIC_APP_URL` — your public URL (e.g. `https://bussin.app`).
- `NEXT_PUBLIC_APP_MODE=live` — `mock` is now rejected at production boot.

## 7. Deploy the web app (Vercel or similar)

1. Import the repo, framework Next.js, build with `pnpm`.
2. Set every variable from sections 1–6 in the host's env settings
   (the `WORKER_*` vars are not needed by the web app).
3. Deploy, then point the Stripe webhook and Google redirect URI at the
   final domain.

## 8. Deploy the worker

The worker polls Supabase Queues and does Suno polling, FFmpeg rendering,
and YouTube uploads. Full runbook:
`docs/05_deployment/02_worker_deployment.md`.

Short version (Railway/Fly/any Docker host):

```bash
docker build -f Dockerfile.worker -t bussin-worker .
docker run --env-file .env.worker --restart always -p 8081:8081 bussin-worker
```

- Required env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SECRETS_ENCRYPTION_KEY` (same as web), `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, plus the shared-validation vars listed in the
  runbook (`NEXT_PUBLIC_APP_URL`, `GOOGLE_REDIRECT_URI`, Stripe keys,
  `SUNO_DEFAULT_API_BASE_URL`).
- Health check: `GET http://<worker>:8081/healthz` (200 = polling, 503 =
  stalled). Wire it into your host's health monitoring and set restart
  policy to "always".
- Logs are JSON on stdout — point your host's log drain (Railway logs,
  Fly logs, Better Stack, ...) at them and alert on `"level":"error"`.

## 9. Pre-launch verification

Walk `docs/launch-checklist.md`. The two things code cannot verify for you:

1. **The money path** (test mode): subscribe via checkout → plan limit
   raises; let a test card fail → access drops to trial limits; pay again →
   restored.
2. **The one real journey**: sign up → connect Suno + YouTube → generate →
   preview → Publish now → video appears on the channel → schedule one
   +5 minutes → it dispatches on time.
