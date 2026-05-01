# Testing plan — Vitest + Playwright

## Objective

Set up and implement the test strategy for Bussin.

## Stack

- Vitest for unit tests
- Vitest integration project for server/service tests
- React Testing Library for components
- Playwright for E2E
- Supabase local test DB
- mocked external APIs for Suno, YouTube and Stripe

## Scripts

```json
{
  "test": "pnpm test:unit && pnpm test:integration",
  "test:unit": "vitest run --config vitest.unit.config.ts",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

## Unit tests

Required:

- prompt composer
- metadata composer
- plan limits
- status transitions
- encryption service
- validators
- queue helper logic
- Suno/YouTube error normalization

## Integration tests

Required:

- auth workspace creation
- RLS isolation
- generation request creation
- Supabase Queues enqueue/consume
- scheduled publish dispatcher
- Stripe webhook with mocked Stripe
- Suno adapter mocked
- YouTube upload mocked
- render worker with fixture files

## E2E tests

Required flows:

1. Sign up and onboarding
2. Create generation request
3. Preview and approval
4. Schedule upload
5. Billing upgrade start
6. Library filters and generate similar
7. Channels management

## Factories

Create typed factories for:

- user
- workspace
- subscription
- Suno connection
- YouTube channel
- generation request
- track
- render
- upload

## Selectors

Use stable selectors:

```txt
screen-dashboard
screen-generate
screen-queue
screen-library
screen-scheduled
screen-channels
screen-billing
primary-action
empty-state
error-state
loading-state
```

## Acceptance criteria

- Unit tests run locally.
- Integration tests run against local Supabase or isolated test DB.
- E2E tests start app automatically.
- External APIs are mocked.
- Tests are deterministic.
