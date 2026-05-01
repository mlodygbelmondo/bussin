# Screen — Onboarding / Connect accounts

## Agent objective

Build the **Onboarding / Connect accounts** screen.

## Route

```txt
/onboarding
```

## Purpose

Guide new user through connecting Suno, connecting YouTube, choosing defaults, and creating first generation.

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

- workspaces.onboarding_completed
- suno_connections
- youtube_connections
- youtube_channels
- workspace defaults/settings

## Required UI components

- 4-step stepper
- Suno connection card
- YouTube connection card
- defaults form
- first generation CTA
- connection status badges

## Required actions

- save/test Suno
- start YouTube OAuth
- sync/select default channel
- save defaults
- mark onboarding complete

## States

- no Suno
- Suno connected/error
- no YouTube
- YouTube connected
- default channel missing
- completed

## Tests required

Component: stepper, connection cards.
Integration: save Suno, set default channel.
E2E: complete onboarding with mocked integrations.

## Suggested selectors

```txt
screen-onboarding
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build a multi-step onboarding screen: Connect Suno, Connect YouTube, Choose defaults, Create first generation. Make it fast, low-friction and clear.
```
