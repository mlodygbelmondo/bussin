# Screen — Track Preview & Approval

## Agent objective

Build the **Track Preview & Approval** screen.

## Route

```txt
/dashboard/tracks/[trackId]
```

## Purpose

Let user listen to generated track, review metadata and approve/reject before YouTube upload.

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

- tracks
- generation_requests
- image_assets
- youtube_channels
- video_renders
- youtube_uploads
- signed audio URL
- signed image URL

## Required UI components

- audio player
- cover preview
- metadata preview
- title
- description
- tags
- target channel
- generation details
- approve/reject buttons
- publish/schedule buttons

## Required actions

- approve track
- reject track
- publish now
- schedule later
- lightweight metadata edit optional

## States

- audio loading
- preview_ready
- approved
- rejected
- rendering
- rendered
- uploading
- uploaded
- failed

## Tests required

Component: audio player, metadata preview.
Integration: approve enqueues render, reject prevents upload.
E2E: open preview and approve.

## Suggested selectors

```txt
screen-dashboard-tracks-[trackId]
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build the Track Preview & Approval screen. Focus on decision-making: listen, review YouTube title/description/tags, see cover image, then approve, reject, publish now, or schedule.
```
