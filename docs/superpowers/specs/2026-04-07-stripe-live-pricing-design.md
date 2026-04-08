# Stripe Live Pricing & Subscription System

## Overview

Move from Stripe sandbox to live, introduce monthly subscriptions (Pro/Ultimate), simplify credit packs to a single option, and update the pricing page and dashboard account page accordingly.

## Products

| Product | Type | Price | Credits | Stripe Mode |
|---------|------|-------|---------|-------------|
| Pro Monthly | Recurring subscription | $7.99/mo | 60/mo | `subscription` |
| Ultimate Monthly | Recurring subscription | $19.99/mo | 300/mo | `subscription` |
| Credit Pack | One-time payment | $3.99 | 30 | `payment` |

Free tier (10 credits on signup) has no Stripe product — it is handled entirely in the database.

## Environment Variables

Replace all hardcoded sandbox price IDs with env vars:

```
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_ULTIMATE_MONTHLY=price_xxx
STRIPE_PRICE_CREDIT_PACK=price_xxx
```

Existing vars stay (swap to live keys):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Remove deprecated vars:
- `STRIPE_CREDIT_PACK_PRICE_ID`
- `STRIPE_MONTHLY_PRICE_ID`

## Database Changes

### New columns on `profiles`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `stripe_customer_id` | `TEXT` | `NULL` | Links user to Stripe customer |
| `stripe_subscription_id` | `TEXT` | `NULL` | Active subscription ID |
| `subscription_tier` | `TEXT` | `NULL` | `'pro'` or `'ultimate'` (null if free/credit_pack) |
| `subscription_period_end` | `TIMESTAMPTZ` | `NULL` | End of current billing period |

No changes to `credit_transactions` or `plan_type` enum (`free`, `credit_pack`, `subscription`).

## Credit Logic

- **Subscription renewal:** Reset `credits_remaining` to the tier amount (60 or 300). No rollover — unused credits are lost.
- **Credit pack purchase:** Add 30 credits on top of existing balance.
- **Cancellation:** Keep remaining credits until `subscription_period_end`. After period ends (on `customer.subscription.deleted`), set `plan_type` to `free`, clear subscription fields, set `credits_remaining` to 0.

## Webhook Handler

**File:** `src/app/api/webhooks/stripe/route.ts`

**Price-to-tier config** (reads from env vars at module scope):

```ts
const PRICE_CONFIG: Record<string, { tier?: string; credits: number }> = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]: { tier: "pro", credits: 60 },
  [process.env.STRIPE_PRICE_ULTIMATE_MONTHLY!]: { tier: "ultimate", credits: 300 },
  [process.env.STRIPE_PRICE_CREDIT_PACK!]: { credits: 30 },
};
```

**Events to handle:**

### `checkout.session.completed`

- **`mode: 'subscription'`** — First subscription payment.
  1. Store `stripe_customer_id` and `stripe_subscription_id` on the profile.
  2. Look up the price ID from the session's line items. Resolve tier and credits from `PRICE_CONFIG`.
  3. Set `plan_type` to `subscription`, `subscription_tier` to the tier.
  4. Call `add_credits` RPC with the tier's credit amount. Reason: `subscription_started`.

- **`mode: 'payment'`** — Credit pack purchase.
  1. Look up price ID from line items. Resolve credits from `PRICE_CONFIG`.
  2. Call `add_credits` RPC. Reason: `purchase_credit_pack`.
  3. Set `plan_type` to `credit_pack` (only if currently `free`).

### `invoice.paid`

- Skip the first invoice (subscription activation is handled by `checkout.session.completed`).
- On renewal invoices: reset `credits_remaining` to tier amount. Log a `credit_transaction` with reason `subscription_renewal`.

### `customer.subscription.updated`

- If `cancel_at_period_end` changed to `true`: update `subscription_period_end` on the profile from the subscription's `current_period_end`.
- If `cancel_at_period_end` changed to `false` (user re-activated): clear `subscription_period_end`.

### `customer.subscription.deleted`

- Set `plan_type` to `free`.
- Clear `stripe_subscription_id`, `subscription_tier`, `subscription_period_end`.
- Set `credits_remaining` to 0.

## Pricing Page (`/pricing`)

**File:** `src/app/pricing/page.tsx`

### Logged-out users
- No changes to layout or copy. Three-column grid: Free / Pro / Ultimate.
- Add a callout below the grid for the credit pack: "Need a few more credits? 30 credits for $3.99."
- All CTAs link to `/auth/login`.

### Logged-in users
- Detect auth state server-side.
- Pro and Ultimate CTAs redirect to `/dashboard/account`.
- Free tier CTA shows "Current Plan" if user is already signed up.

## Account Page (`/dashboard/account`)

**File:** `src/app/dashboard/account/page.tsx`

### Current plan banner
- Shows plan name, credit balance, and renewal date (if subscribed).
- Cancel subscription link (only for subscribers) — calls Stripe API to set `cancel_at_period_end: true`.

### Upgrade section
- Two cards side-by-side: Pro and Ultimate.
- Current plan gets a "Current" badge and no CTA button.
- Other plan gets an "Upgrade" button that opens Stripe Checkout in `subscription` mode.
- Free users see both as upgrade options.

### Credit pack section
- Single row: "30 Credits — $3.99 — One-time purchase" with a "Buy" button.
- Opens Stripe Checkout in `payment` mode.

### Transaction history
- No changes — same table as current.

## Checkout Flow

Both subscription and credit pack purchases use the existing server action pattern:
1. Form submits to a server action with `priceId` and `mode`.
2. Server action creates a Stripe Checkout session with `client_reference_id` and `metadata.user_id`.
3. Redirects to Stripe Checkout.
4. On success, redirects back to `/dashboard/account?success=true`.

## Migration Checklist (Manual Steps)

1. Create products and prices in live Stripe dashboard.
2. Set up webhook endpoint in live Stripe pointing to `/api/webhooks/stripe` with events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Update `.env` / Vercel env vars with live keys and new price IDs.
4. Run database migration to add new profile columns.
