# Backend 01 — Project foundation

## Agent objective

Set up the base Next.js project foundation for Bussin.

## Scope

- Next.js App Router
- TypeScript strict mode
- Tailwind
- shadcn/ui
- Zod env validation
- basic folder structure
- code quality scripts

## Required structure

```txt
src/
  app/
    (auth)/
    (dashboard)/
    api/
  components/
    ui/
    common/
  modules/
    auth/
    billing/
    dashboard/
    generation/
    integrations/
    library/
    onboarding/
    publishing/
    queue/
    settings/
    youtube/
  server/
    actions/
    routes/
    services/
    validators/
  lib/
  styles/
worker/
  src/
supabase/
  migrations/
  functions/
tests/
  unit/
  integration/
  e2e/
```

## Tasks

### 1. Create Next.js app

- App Router enabled.
- TypeScript enabled.
- `src/` directory enabled.
- Tailwind configured.
- Default dark theme prepared.

### 2. Configure TypeScript

- `strict: true`
- aliases: `@/*`, `@/components/*`, `@/modules/*`, `@/server/*`, `@/lib/*`

### 3. Configure shadcn/ui

Base components:

- Button
- Input
- Textarea
- Card
- Dialog
- Dropdown
- Table
- Badge
- Toast
- Skeleton
- EmptyState

### 4. Scripts

```json
{
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write ."
}
```

### 5. Env validation

Create `src/lib/env.ts` with Zod validation.

Initial envs:

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SECRETS_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
SUNO_DEFAULT_API_BASE_URL=
```

## Routes to stub

```txt
/
/login
/signup
/dashboard
/dashboard/generate
/dashboard/queue
/dashboard/library
/dashboard/scheduled
/dashboard/channels
/dashboard/settings
/dashboard/billing
/onboarding
```

## Acceptance criteria

- App starts locally.
- TypeScript passes.
- Lint passes.
- Tailwind works.
- shadcn components are available.
- Env validation exists.
- Dashboard shell route exists.
- No Supabase/Stripe business logic yet.

## Tests required

- env parser throws on missing required env
- EmptyState renders title/description

## Agent constraints

- Do not implement Supabase schema here.
- Do not implement Stripe here.
- Do not implement full product screens here.
