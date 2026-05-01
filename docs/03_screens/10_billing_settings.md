# Screen — Billing & Settings

## Agent objective

Build the **Billing & Settings** screen.

## Route

```txt
/dashboard/settings and /dashboard/billing
```

## Purpose

Manage subscription, usage, billing portal and default publishing settings.

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

- subscriptions
- usage_counters
- plan config
- workspace settings
- youtube_channels
- image_assets

## Required UI components

- settings navigation
- current plan card
- usage indicators
- upgrade CTA
- manage billing button
- default upload settings
- timezone
- default privacy
- asset defaults
- notification prefs placeholder

## Required actions

- start Stripe checkout
- open Stripe portal
- update workspace defaults

## States

- trial
- active paid
- past_due/canceled
- usage near limit
- usage exceeded
- loading portal

## Tests required

Component: plan card, usage bar, settings form.
Integration: billing query, update defaults, checkout route.
E2E: open billing and start upgrade.

## Suggested selectors

```txt
screen-dashboard-settings and -dashboard-billing
primary-action
empty-state
error-state
loading-state
```

## Agent prompt

```txt
Build Billing & Settings. Make it premium and trustworthy: current plan, usage limits, upgrade CTA, Stripe-style billing management, and default upload settings.
```
