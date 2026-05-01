<p align="center">
  <img src="./src/app/favicon.ico" alt="Bussin icon" width="64" />
</p>

# Bussin

Bussin is a Next.js dashboard for generating instrumental tracks with Suno, rendering static-image videos with FFmpeg, and publishing or scheduling them on YouTube.

> [!NOTE]
> The app supports `live` and `mock` modes. Use mock mode for local development without real external credentials.

## What it does

- Collects a music brief and turns it into Suno generation requests
- Polls Suno jobs, previews tracks, and supports approve/reject flows
- Renders MP4s with a static image in the external worker
- Uploads or schedules videos on YouTube
- Manages subscriptions and usage limits with Stripe

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Supabase Auth, Postgres, RLS, Storage, Queues, Cron, Edge Functions
- Stripe billing and webhooks
- External Node.js worker for polling, rendering, and uploads
- Tailwind CSS 4, daisyUI, shadcn-style local UI components
- Zod, React Hook Form, TanStack Query, Vitest, Playwright

## Main areas

- Auth and signup
- Onboarding for Suno and YouTube connections
- Dashboard overview
- Track generation
- Generation queue
- Track preview and approval
- Library
- Scheduled uploads
- Channel management
- Billing and settings

## Repository layout

- `src/app` app routes, layouts, and route handlers
- `src/components` shared UI and common components
- `src/server` server-side services, actions, routes, and validators
- `src/lib` config, env validation, Supabase clients, integrations, and schemas
- `worker/src` external job processor
- `supabase/migrations` schema, RLS, queues, cron, and storage setup
- `supabase/functions` Edge Functions
- `docs` staged implementation docs and task order

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the values you want to use.
2. Install dependencies with `pnpm install`.
3. Start Supabase with `pnpm supabase:start`.
4. Run the app with `pnpm dev`.
5. Run the worker in another terminal with `pnpm worker`.

> [!TIP]
> If the local Supabase binary is not available after install, run `pnpm approve-builds`.

## Scripts

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `pnpm dev`            | Start the Next.js app                |
| `pnpm worker`         | Start the external worker            |
| `pnpm build`          | Build the app for production         |
| `pnpm start`          | Run the production build             |
| `pnpm lint`           | Run ESLint                           |
| `pnpm format`         | Format the codebase                  |
| `pnpm format:check`   | Check formatting                     |
| `pnpm typecheck`      | Run TypeScript checks                |
| `pnpm test`           | Run Vitest                           |
| `pnpm test:e2e`       | Run Playwright tests                 |
| `pnpm supabase:start` | Start the local Supabase stack       |
| `pnpm supabase:stop`  | Stop the local Supabase stack        |
| `pnpm supabase:reset` | Reset local Supabase data            |
| `pnpm db:types`       | Regenerate Supabase TypeScript types |

## Environment

Environment validation lives in `src/lib/env.ts`. The app expects public app and Supabase settings plus server-only keys for:

- Supabase service role
- Stripe secret and webhook secret
- Google OAuth client credentials
- Suno API access and base URL
- Secrets encryption
- Worker tuning values

## Development notes

- FFmpeg work lives only in the external worker.
- Stripe subscription state comes from webhooks, not redirects.
- Workspace-owned data must stay scoped by RLS.
- See `docs/README.md` for the staged implementation order and product scope.
