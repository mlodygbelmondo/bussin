# Stripe — Billing, subscriptions and plan limits

## Agent objective

Implement Stripe subscriptions for Bussin.

## Plans

### trial

- youtubeChannels: 1
- monthlyUploads: 10
- monthlyGenerationRequests: 10
- scheduledUploads: 5

### creator — $19/mo

- youtubeChannels: 2
- monthlyUploads: 100
- monthlyGenerationRequests: 100
- scheduledUploads: 100

### pro — $49/mo

- youtubeChannels: 5
- monthlyUploads: 500
- monthlyGenerationRequests: 500
- scheduledUploads: 500

### studio — $99/mo

- youtubeChannels: 15
- monthlyUploads: 2000
- monthlyGenerationRequests: 2000
- scheduledUploads: 2000

## Env vars

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_CREATOR_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_STUDIO_PRICE_ID=
```

## Files

```txt
src/modules/billing/
  billing-page.queries.ts
  billing.actions.ts
  billing.types.ts
  plan-config.ts

src/server/services/billing/
  stripe.service.ts
  subscription.service.ts
  plan-limits.service.ts
  usage.service.ts

src/app/api/stripe/checkout/route.ts
src/app/api/stripe/portal/route.ts
supabase/functions/stripe-webhook/
```

## Tasks

### 1. Plan config

Map each plan to:

- Stripe price ID
- display name
- price
- limits
- features

### 2. Stripe customer service

Implement:

```ts
getOrCreateStripeCustomer(workspaceId);
```

Rules:

- customer belongs to workspace
- avoid duplicates
- save `stripe_customer_id`

### 3. Checkout route

`POST /api/stripe/checkout`

Input:

```ts
{
  plan: "creator" | "pro" | "studio";
}
```

Behavior:

- require auth
- require workspace access
- validate plan
- create/fetch customer
- create checkout session
- return checkout URL
- do not upgrade before webhook

### 4. Customer portal route

`POST /api/stripe/portal`

Behavior:

- require auth
- require workspace
- require Stripe customer
- return portal URL

### 5. Stripe webhook Edge Function

Handle:

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed
- invoice.payment_succeeded

Rules:

- verify signature
- map Stripe price ID to plan
- update subscriptions
- write audit log `billing.changed`

### 6. Usage counters

Used by:

- billing page
- dashboard
- plan limit service
- generation creation
- channel connection
- scheduled uploads
- upload completion

## Billing page data contract

```ts
{
  plan: "trial" | "creator" | "pro" | "studio",
  status: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: string | null,
  usage: {
    generatedTracks: number,
    uploadedVideos: number,
    connectedChannels: number,
    scheduledUploads: number
  },
  limits: {
    youtubeChannels: number,
    monthlyUploads: number,
    monthlyGenerationRequests: number,
    scheduledUploads: number
  },
  upgradeOptions: Array<unknown>
}
```

## Acceptance criteria

- User can start checkout.
- User can open customer portal.
- Webhook updates subscription.
- Invalid signatures rejected.
- Plan controls limits.
- Usage visible to UI.
- Limits enforced server-side.

## Tests required

Unit:

- plan config
- price ID to plan mapping
- limit enforcement

Integration:

- checkout route mocked Stripe
- portal route mocked Stripe
- webhook signature verify
- subscription.created updates DB
- subscription.deleted downgrades/cancels access
- invalid signature rejected
