# AGENTS.md

## Project Overview

Bussin is a Next.js dashboard for generating instrumental tracks through Suno, rendering static-image videos with FFmpeg, and publishing or scheduling them on YouTube.

## Stack

- Next.js 16 App Router, Route Handlers, Server Actions, React 19, TypeScript.
- Supabase Auth, Postgres, RLS, Storage, Queues, Cron, and Edge Functions.
- Stripe checkout, customer portal, and webhooks.
- External Node.js worker for Suno polling, rendering, and YouTube upload jobs.
- Tailwind CSS 4, daisyUI, shadcn-style local UI components, lucide-react.
- Zod, React Hook Form, TanStack Query, Vitest, Playwright.

## Repository Map

- `src/app`: App Router pages, layouts, route handlers, server actions entrypoints.
- `src/components/ui`: shared primitive UI components.
- `src/components/common`: shared product components.
- `src/modules`: feature modules with queries, actions, types, and UI helpers.
- `src/server/services`: server-only business logic and integration orchestration.
- `src/server/validators`: Zod schemas for server-side validation.
- `src/lib/supabase`: Supabase clients and generated database types.
- `worker/src`: external worker jobs, queue client, and service adapters.
- `supabase/migrations`: database schema, RLS policies, queues, cron, and storage setup.
- `supabase/functions`: Supabase Edge Functions.
- `docs`: staged implementation specs; screen work lives in `docs/03_screens`.
- `design-reference`: visual references for screen implementation.
- `tests`: unit, integration, and e2e tests.

## Commands

- Install dependencies with `pnpm install`.
- Format with `pnpm format`; run the relevant Prettier formatting command before reporting coding work as done.
- Check formatting with `pnpm format:check`.
- Lint with `pnpm lint`.
- Typecheck with `pnpm typecheck`.
- Run unit/integration tests with `pnpm test`.
- Run e2e tests with `pnpm test:e2e` only when explicitly asked to test the app.
- Generate Supabase types with `pnpm db:types` after schema changes.

## Runtime Testing Rule

- Never start, open, browse, curl, screenshot, Playwright-test, or otherwise interact with the running app unless the user explicitly asks for app/runtime testing in the prompt.

## Verification

- Code checks such as formatting, lint, typecheck, and focused unit/integration tests are allowed when relevant.
- Prefer focused checks for the changed area before broader suites.
- Do not run e2e/browser/manual app checks unless the prompt explicitly asks for runtime testing.
- If a requested verification needs missing environment variables or credentials, state the blocker and do not invent secrets.

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
- Store async failure details in clear `failure_reason` fields where the schema supports it.

## UI Rules

- Match the existing dark premium creator-SaaS shell and local component patterns.
- Dashboard screens must include loading, empty, and error states where applicable.
- Mutations should surface success/error feedback with toasts or visible state.
- Add stable `data-testid` selectors for Playwright-relevant UI.
- Use lucide-react icons and existing `src/components/ui` primitives when possible.
- For visual screen tasks, follow the matching file in `docs/03_screens` and any relevant image in `design-reference`.

## Documentation And Task Specs

- Use `docs/README.md` for the staged task order.
- Treat each file under `docs/01_backend`, `docs/02_stripe`, `docs/03_screens`, `docs/04_tests`, and `docs/05_deployment` as the acceptance source for that task.
- Update or add tests when behavior changes, especially for backend services, validators, queue jobs, and workspace access rules.
