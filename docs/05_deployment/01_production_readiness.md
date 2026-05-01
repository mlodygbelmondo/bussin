# Production readiness and deployment checklist

## Objective

Prepare Bussin for staging/production deployment.

## Deployment parts

- Next.js app
- Supabase project
- Supabase migrations
- Supabase Storage buckets
- Supabase Queues
- Supabase Cron
- Supabase Edge Functions
- External Node worker
- Stripe webhooks
- Google OAuth callbacks
- logging/monitoring

## Env variables

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
APP_SECRET_KEY=
SECRETS_ENCRYPTION_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_CREATOR_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_STUDIO_PRICE_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
SUNO_DEFAULT_API_BASE_URL=
WORKER_ID=
WORKER_POLL_INTERVAL_MS=5000
FFMPEG_PATH=
WORKER_MAX_CONCURRENCY=2
```

## Supabase checklist

- [ ] migrations applied
- [ ] RLS enabled
- [ ] policies verified
- [ ] storage buckets created
- [ ] storage access tested
- [ ] queues created
- [ ] cron jobs configured
- [ ] Edge Functions deployed
- [ ] service role key stored securely
- [ ] backups documented

## Stripe checklist

- [ ] products created
- [ ] prices created
- [ ] price IDs added to env
- [ ] webhook endpoint configured
- [ ] webhook secret added
- [ ] test checkout works
- [ ] customer portal configured
- [ ] subscription lifecycle tested

## Google/YouTube checklist

- [ ] OAuth app configured
- [ ] callback URL added
- [ ] scopes documented
- [ ] test user can connect
- [ ] refresh token flow tested
- [ ] channel sync tested
- [ ] upload tested on safe/private channel

## Worker checklist

- [ ] worker deploy target selected
- [ ] FFmpeg available
- [ ] service role env configured
- [ ] worker can consume queues
- [ ] worker can access Storage
- [ ] worker logs errors
- [ ] worker restarts on crash
- [ ] concurrency limits configured

## Production acceptance criteria

- Fresh user can sign up.
- User can complete onboarding.
- User can connect Suno.
- User can connect YouTube.
- User can generate track.
- Worker processes Suno job.
- User can preview and approve.
- Worker renders video.
- User can publish/schedule.
- Worker uploads to YouTube.
- Billing checkout works.
- Stripe webhook updates DB.
- RLS prevents cross-workspace access.
- E2E smoke tests pass.
