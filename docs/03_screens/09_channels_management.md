# Screen — Channels Management

## Agent objective

Build the **Channels Management** screen.

## Route

```txt
/dashboard/channels
```

## Purpose

Manage connected YouTube channels and Suno connection status.

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

- youtube_connections
- youtube_channels
- suno_connections
- subscription plan limits

## Required UI components

- YouTube channel cards/list
- avatar
- name
- default badge
- status
- last sync
- connect CTA
- Suno status card
- empty guidance

## Required actions

- connect YouTube
- sync channels
- set default
- disconnect/reconnect
- test Suno connection

## States

- no channels
- connected
- default channel
- YouTube expired/error
- Suno connected/error
- plan limit reached

## Tests required

Component: integration status card, channel card.
Integration: set default and sync mocked.
E2E: set default channel.

## Suggested selectors

```txt
screen-dashboard-channels
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build Channels Management. Show multiple YouTube channels with avatar, name, status, default badge, last sync and actions. Include small Suno connection status section.
```
