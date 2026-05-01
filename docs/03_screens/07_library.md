# Screen — Library

## Agent objective

Build the **Library** screen.

## Route

```txt
/dashboard/library
```

## Purpose

Browse, search and reuse all generated tracks.

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
- youtube_channels
- image_assets
- youtube_uploads
- prompt_history

## Required UI components

- searchable track list
- card/list toggle optional
- filters by status/style/channel/date
- cover thumbnail
- title
- style/mood
- duration
- status chip
- linked channel
- actions menu

## Required actions

- preview
- generate similar
- reuse image
- open details
- publish if eligible

## States

- empty library
- populated
- no filter results
- uploaded
- failed
- preview-ready

## Tests required

Component: track card/list item, filters.
Integration: library query filters workspace/status.
E2E: filter and generate similar prefill.

## Suggested selectors

```txt
screen-dashboard-library
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build the Library screen as a premium media library for generated instrumental tracks, with search, filters, status chips, quick actions and generate similar.
```
