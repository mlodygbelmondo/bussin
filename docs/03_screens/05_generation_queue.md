# Screen — Generation Queue

## Agent objective

Build the **Generation Queue** screen.

## Route

```txt
/dashboard/queue
```

## Purpose

Show active and historical generation requests with per-track status.

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

- generation_requests
- tracks
- video_renders
- youtube_uploads
- audit_logs optional

## Required UI components

- request list/table
- per-track status rows
- progress indicators
- filters
- search
- retry failed action
- open preview action
- failure reason display

## Required actions

- open request details
- open track preview
- retry failed job
- cancel request if supported

## States

- empty queue
- queued
- generating
- polling
- preview_ready
- rendering
- uploading
- uploaded
- failed

## Tests required

Component: status chip, progress.
Integration: queue query workspace-only.
E2E: queued request appears, preview opens.

## Suggested selectors

```txt
screen-dashboard-queue
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build the Generation Queue screen. Make async processing understandable: grouped requests, per-track statuses, progress, retry/cancel actions, and readable failure reasons.
```
