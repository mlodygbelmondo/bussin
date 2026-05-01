# Screen — Scheduled Uploads

## Agent objective

Build the **Scheduled Uploads** screen.

## Route

```txt
/dashboard/scheduled
```

## Purpose

Show upcoming YouTube uploads and allow reschedule/cancel/publish now.

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

- youtube_uploads
- tracks
- video_renders
- youtube_channels
- image_assets

## Required UI components

- timeline or calendar/list
- upload cards/rows
- thumbnail
- title
- scheduled date/time
- channel
- status
- filters
- timezone display

## Required actions

- reschedule
- cancel scheduled upload
- publish now
- open track

## States

- no scheduled uploads
- scheduled
- queued
- uploading
- uploaded
- failed
- canceled

## Tests required

Component: scheduled upload row, datetime display.
Integration: reschedule/cancel actions.
E2E: schedule appears and can be changed.

## Suggested selectors

```txt
screen-dashboard-scheduled
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build Scheduled Uploads. It should feel reliable and operational: upcoming uploads, schedule times, channels, statuses, and actions to reschedule, cancel, or publish now.
```
