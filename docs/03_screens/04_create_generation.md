# Screen — Create Generation

## Agent objective

Build the **Create Generation** screen.

## Route

```txt
/dashboard/generate
```

## Purpose

Core product screen. User requests instrumental tracks without editing prompts manually.

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

- youtube_channels
- image_assets
- subscriptions/plan limits
- usage_counters
- generation defaults

## Required UI components

- style input
- mood input
- duration select/input
- track count input
- target channel select
- image picker/uploader
- publish mode selector
- schedule datetime picker
- smart brief summary
- estimated jobs count
- CTA

## Required actions

- create generation request
- upload/select image
- validate plan limits
- redirect to queue

## States

- no YouTube channel
- no Suno connection
- validation errors
- plan limit reached
- submitting
- success

## Tests required

Unit: form validation.
Integration: create generation creates request/tracks/queue jobs.
E2E: user creates generation and lands on queue.

## Suggested selectors

```txt
screen-dashboard-generate
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build the Create Generation screen. Keep it simple: style, mood, duration, number of tracks, target YouTube channel, optional image, publish mode. Show smart brief preview but no advanced prompt editing.
```
