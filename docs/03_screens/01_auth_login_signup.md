# Screen — Login / Sign up

## Agent objective

Build the **Login / Sign up** screen.

## Route

```txt
/login and /signup
```

## Purpose

Allow user to create an account or sign in before accessing Bussin. First trust-building screen.

## Visual direction

- premium creator SaaS
- dark mode default
- clean and serious
- subtle purple/blue/cyan accents
- rounded cards
- desktop-first
- practical SaaS UX

## Common acceptance criteria

- Matches app shell.
- Loading, empty and error states exist.
- All data comes from typed queries/actions.
- Mutations show success/error toasts.
- User cannot access data outside workspace.
- Stable `data-testid` selectors exist for Playwright.

## Required data sources

- Supabase Auth
- current session
- redirect target

## Required UI components

- auth card
- email/password form
- social auth placeholder optional
- value proposition panel
- error alert
- loading button
- login/signup links

## Required actions

- sign up
- sign in
- forgot password placeholder
- redirect authenticated users to dashboard/onboarding

## States

- loading
- invalid credentials
- signup success
- email already used
- authenticated redirect

## Tests required

Component: form renders, disabled while loading, error display.
E2E: user can sign up, sign in, logged-in user redirected.

## Suggested selectors

```txt
screen-login and -signup
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build Bussin auth screens with a premium dark SaaS layout. Include value proposition: generate instrumental AI music, preview it, and publish to YouTube. Keep forms simple and production-ready.
```
