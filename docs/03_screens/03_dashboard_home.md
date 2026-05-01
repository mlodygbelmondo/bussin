# Screen — Dashboard Home

## Agent objective

Build the **Dashboard Home** screen.

## Route

```txt
/dashboard
```

## Purpose

Show operational overview: generation status, uploads, limits, recent activity and quick actions.

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

- usage_counters
- generation_requests
- tracks
- youtube_uploads
- suno_connections
- audit_logs
- subscriptions

## Required UI components

- KPI cards
- recent activity feed
- queue overview widget
- quick actions panel
- Suno limits card
- pending approvals card
- scheduled uploads card

## Required actions

- navigate to new generation
- navigate to queue
- navigate to library
- navigate to scheduled
- navigate to channels

## States

- new user empty state
- populated
- Suno disconnected
- YouTube disconnected
- pending approvals
- failed jobs

## Tests required

Component: KPI card, empty state.
Integration: dashboard query counts.
E2E: seeded metrics and quick actions visible.

## Suggested selectors

```txt
screen-dashboard
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build the dashboard as an operations cockpit for AI music publishing: generated tracks, pending approvals, scheduled uploads, uploaded this week, Suno limits, queue status and recent activity.
```
