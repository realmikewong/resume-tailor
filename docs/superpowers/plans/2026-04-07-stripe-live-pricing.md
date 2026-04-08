# Stripe Live Pricing & Subscription System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Stripe from sandbox to live, add monthly subscriptions (Pro/Ultimate), simplify credit packs to one option, and update the pricing + account pages.

**Architecture:** Database migration adds subscription columns to `profiles` and a `reset_credits` RPC. Webhook handler expands from one event to four. Pricing page becomes auth-aware. Account page gets a full redesign with subscription management, single credit pack, and cancel flow.

**Tech Stack:** Next.js (App Router), Supabase (Postgres + RPC), Stripe (Checkout, Webhooks), TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-07-stripe-live-pricing-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/005_stripe_subscriptions.sql` | New columns, `reset_credits` RPC, update `handle_new_user` trigger |
| Create | `src/lib/stripe-config.ts` | Price-to-tier config map, shared types |
| Modify | `src/app/api/webhooks/stripe/route.ts` | Handle 4 webhook events |
| Modify | `src/app/dashboard/account/page.tsx` | New UI: plan banner, subscriptions, credit pack, cancel |
| Modify | `src/components/account/account-analytics.tsx` | Update PurchaseButton, add CancelButton |
| Modify | `src/app/pricing/page.tsx` | Auth-aware CTAs, credit pack callout |
| Modify | `.env.example` | New env var names |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/005_stripe_subscriptions.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add subscription columns to profiles
ALTER TABLE profiles
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN subscription_tier TEXT CHECK (subscription_tier IN ('pro', 'ultimate')),
  ADD COLUMN subscription_period_end TIMESTAMPTZ;

-- Update free tier default from 3 to 10 credits
ALTER TABLE profiles ALTER COLUMN credits_remaining SET DEFAULT 10;

-- Update handle_new_user trigger to give 10 credits
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (NEW.id, 10, 'initial_free');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit reset RPC (sets credits to exact amount, no rollover)
CREATE OR REPLACE FUNCTION reset_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE profiles
  SET credits_remaining = p_amount
  WHERE user_id = p_user_id
  RETURNING credits_remaining INTO remaining;

  INSERT INTO credit_transactions (user_id, amount, reason, stripe_payment_id)
  VALUES (p_user_id, p_amount, p_reason, p_stripe_payment_id);

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` or apply via Supabase SQL Editor.
Expected: Migration applies without errors. Verify with:
```bash
npx supabase db diff
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_stripe_subscriptions.sql
git commit -m "feat: add subscription columns, reset_credits RPC, update free tier to 10 credits"
```

---

### Task 2: Stripe Config Module

**Files:**
- Create: `src/lib/stripe-config.ts`
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.example` with new Stripe env var names**

Replace the existing `# Stripe Products` section:

```
# Stripe Products (live)
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_ULTIMATE_MONTHLY=price_xxx
STRIPE_PRICE_CREDIT_PACK=price_xxx
```

Remove the old vars `STRIPE_CREDIT_PACK_PRICE_ID` and `STRIPE_MONTHLY_PRICE_ID`.

- [ ] **Step 2: Create the shared config module**

```ts
// src/lib/stripe-config.ts

export interface PriceConfig {
  tier?: "pro" | "ultimate";
  credits: number;
}

/**
 * Maps Stripe price IDs (from env vars) to their tier and credit amounts.
 * Used by the webhook handler to resolve what a purchase means.
 */
export function getPriceConfig(): Record<string, PriceConfig> {
  return {
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: { tier: "pro", credits: 60 },
    [process.env.STRIPE_PRICE_ULTIMATE_MONTHLY!]: {
      tier: "ultimate",
      credits: 300,
    },
    [process.env.STRIPE_PRICE_CREDIT_PACK!]: { credits: 30 },
  };
}

/** Reverse lookup: get the Stripe price ID for a given tier. */
export function getPriceIdForTier(tier: "pro" | "ultimate"): string {
  return tier === "pro"
    ? process.env.STRIPE_PRICE_PRO_MONTHLY!
    : process.env.STRIPE_PRICE_ULTIMATE_MONTHLY!;
}

export function getCreditPackPriceId(): string {
  return process.env.STRIPE_PRICE_CREDIT_PACK!;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe-config.ts .env.example
git commit -m "feat: add stripe-config module and update env var names"
```

---

### Task 3: Webhook Handler — Full Rewrite

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Rewrite the webhook handler**

Replace the entire contents of `src/app/api/webhooks/stripe/route.ts`:

```ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPriceConfig } from "@/lib/stripe-config";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const priceConfig = getPriceConfig();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (!userId) break;

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id
      );
      const priceId = lineItems.data[0]?.price?.id;
      if (!priceId) break;

      const config = priceConfig[priceId];
      if (!config) break;

      if (session.mode === "subscription") {
        // First subscription payment — set up the subscription
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await admin
          .from("profiles")
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_tier: config.tier,
            plan_type: "subscription",
            subscription_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("user_id", userId);

        // Reset credits to tier amount (don't add on top of free credits)
        await admin.rpc("reset_credits", {
          p_user_id: userId,
          p_amount: config.credits,
          p_reason: "subscription_started",
        });
      } else if (session.mode === "payment") {
        // Credit pack purchase — add on top of existing balance
        await admin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: config.credits,
          p_reason: "purchase_credit_pack",
          p_stripe_payment_id: session.payment_intent as string,
        });

        // Only upgrade plan_type if currently free
        const { data: profile } = await admin
          .from("profiles")
          .select("plan_type")
          .eq("user_id", userId)
          .single();

        if (profile?.plan_type === "free") {
          await admin
            .from("profiles")
            .update({ plan_type: "credit_pack" })
            .eq("user_id", userId);
        }
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;

      // Skip the first invoice — handled by checkout.session.completed
      if (invoice.billing_reason === "subscription_create") break;

      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
      if (!subscriptionId) break;

      // Look up user by subscription ID
      const { data: profile } = await admin
        .from("profiles")
        .select("user_id, subscription_tier")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (!profile?.subscription_tier) break;

      const tier = profile.subscription_tier as "pro" | "ultimate";
      const credits = tier === "pro" ? 60 : 300;

      // Reset credits (no rollover)
      await admin.rpc("reset_credits", {
        p_user_id: profile.user_id,
        p_amount: credits,
        p_reason: "subscription_renewal",
      });

      // Update period end for renewal date display
      await admin
        .from("profiles")
        .update({
          subscription_period_end: new Date(
            invoice.period_end * 1000
          ).toISOString(),
        })
        .eq("user_id", profile.user_id);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const previousAttributes = event.data
        .previous_attributes as Partial<Stripe.Subscription>;

      // Only act when cancel_at_period_end changes
      if (previousAttributes?.cancel_at_period_end === undefined) break;

      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (!profile) break;

      // Always store current_period_end (for renewal date display)
      await admin
        .from("profiles")
        .update({
          subscription_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
        })
        .eq("user_id", profile.user_id);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (!profile) break;

      await admin
        .from("profiles")
        .update({
          plan_type: "free",
          stripe_subscription_id: null,
          subscription_tier: null,
          subscription_period_end: null,
          credits_remaining: 0,
        })
        .eq("user_id", profile.user_id);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npx next build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: expand webhook handler for subscriptions, renewals, cancellations"
```

---

### Task 4: Account Page — Cancel Subscription Server Action

**Files:**
- Modify: `src/components/account/account-analytics.tsx`

- [ ] **Step 1: Add CancelButton client component**

Replace the entire contents of `src/components/account/account-analytics.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function AccountAnalytics({
  creditBalance,
}: {
  creditBalance: number;
}) {
  useEffect(() => {
    if (creditBalance === 0) {
      trackEvent("credits_exhausted");
    }
  }, [creditBalance]);
  return null;
}

export function PurchaseButton({
  planLabel,
  currentPlanType,
  children,
}: {
  planLabel: string;
  currentPlanType: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      onClick={() =>
        trackEvent("upgrade_clicked", {
          plan: planLabel,
          plan_type: currentPlanType,
        })
      }
      className="w-full bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200 hover:border-blue-500 text-left"
    >
      {children}
    </button>
  );
}

export function CancelButton({
  cancelAction,
}: {
  cancelAction: () => Promise<void>;
}) {
  return (
    <button
      onClick={async () => {
        if (
          confirm(
            "Are you sure you want to cancel your subscription? You'll keep your credits until the end of your billing period."
          )
        ) {
          trackEvent("subscription_cancel_clicked");
          await cancelAction();
        }
      }}
      className="text-sm text-gray-400 underline hover:text-gray-600 transition-colors"
    >
      Cancel subscription
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/account/account-analytics.tsx
git commit -m "feat: add CancelButton component for subscription cancellation"
```

---

### Task 5: Account Page — Full Redesign

**Files:**
- Modify: `src/app/dashboard/account/page.tsx`

- [ ] **Step 1: Rewrite the account page**

Replace the entire contents of `src/app/dashboard/account/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import {
  AccountAnalytics,
  PurchaseButton,
  CancelButton,
} from "@/components/account/account-analytics";
import { getCreditPackPriceId, getPriceIdForTier } from "@/lib/stripe-config";

async function createCheckoutSession(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const priceId = formData.get("priceId") as string;
  const mode = formData.get("mode") as "payment" | "subscription";
  const headerList = await headers();
  const origin = headerList.get("origin") || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/account?success=true`,
    cancel_url: `${origin}/dashboard/account?canceled=true`,
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { user_id: user.id },
  });

  redirect(session.url!);
}

async function cancelSubscription() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) return;

  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  redirect("/dashboard/account");
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const planType = profile?.plan_type ?? "free";
  const subscriptionTier = profile?.subscription_tier;
  const isSubscribed = planType === "subscription";
  const periodEnd = profile?.subscription_period_end
    ? new Date(profile.subscription_period_end).toLocaleDateString()
    : null;

  // Check if subscription is set to cancel
  let cancelAtPeriodEnd = false;
  if (isSubscribed && profile?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(
        profile.stripe_subscription_id
      );
      cancelAtPeriodEnd = sub.cancel_at_period_end;
    } catch {
      // Subscription may have been deleted
    }
  }

  const planDisplayName = isSubscribed
    ? subscriptionTier === "ultimate"
      ? "Ultimate"
      : "Pro"
    : planType === "credit_pack"
      ? "Credit Pack"
      : "Free";

  return (
    <div className="max-w-2xl">
      <AccountAnalytics creditBalance={profile?.credits_remaining ?? 0} />
      <h1 className="text-2xl font-bold mb-6">Account & Billing</h1>

      {/* Current Plan Banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
              Current Plan
            </p>
            <p className="text-2xl font-bold mt-1">{planDisplayName}</p>
            {isSubscribed && periodEnd && (
              <p className="text-sm text-gray-500 mt-1">
                {cancelAtPeriodEnd
                  ? `Cancels ${periodEnd}`
                  : `Renews ${periodEnd}`}
                {subscriptionTier === "pro" ? " · $7.99/mo" : " · $19.99/mo"}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">
              {profile?.credits_remaining ?? 0}
            </p>
            <p className="text-xs text-gray-500">credits remaining</p>
          </div>
        </div>
        {isSubscribed && !cancelAtPeriodEnd && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <CancelButton cancelAction={cancelSubscription} />
          </div>
        )}
        {isSubscribed && cancelAtPeriodEnd && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-amber-600">
              Your subscription will end on {periodEnd}. You&rsquo;ll keep your
              remaining credits until then.
            </p>
          </div>
        )}
      </div>

      {/* Subscription Plans */}
      {(!isSubscribed || cancelAtPeriodEnd) && (
        <>
          <h2 className="text-lg font-medium mb-3">
            {isSubscribed ? "Resubscribe" : "Upgrade Plan"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Pro */}
            <div
              className={`rounded-lg p-5 relative ${
                subscriptionTier === "pro" && !cancelAtPeriodEnd
                  ? "border-2 border-gray-900"
                  : "border border-gray-200"
              }`}
            >
              {subscriptionTier === "pro" && !cancelAtPeriodEnd && (
                <span className="absolute -top-2.5 left-4 bg-gray-900 text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Current
                </span>
              )}
              <p className="text-xs font-semibold tracking-wider uppercase text-gray-500">
                Pro
              </p>
              <p className="text-3xl font-bold mt-2">
                $7.99
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                60 credits per month
              </p>
              {(subscriptionTier !== "pro" || cancelAtPeriodEnd) && (
                <form action={createCheckoutSession} className="mt-4">
                  <input
                    type="hidden"
                    name="priceId"
                    value={getPriceIdForTier("pro")}
                  />
                  <input type="hidden" name="mode" value="subscription" />
                  <PurchaseButton
                    planLabel="Pro"
                    currentPlanType={planType}
                  >
                    <span className="block text-center text-xs font-semibold tracking-wider uppercase">
                      {isSubscribed ? "Resubscribe" : "Get Pro"}
                    </span>
                  </PurchaseButton>
                </form>
              )}
            </div>

            {/* Ultimate */}
            <div
              className={`rounded-lg p-5 relative bg-[#fafaf9] ${
                subscriptionTier === "ultimate" && !cancelAtPeriodEnd
                  ? "border-2 border-gray-900"
                  : "border border-gray-200"
              }`}
            >
              <span className="absolute -top-2.5 left-4 bg-gray-900 text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                {subscriptionTier === "ultimate" && !cancelAtPeriodEnd
                  ? "Current"
                  : "Best Value"}
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-gray-500">
                Ultimate
              </p>
              <p className="text-3xl font-bold mt-2">
                $19.99
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                300 credits per month
              </p>
              {(subscriptionTier !== "ultimate" || cancelAtPeriodEnd) && (
                <form action={createCheckoutSession} className="mt-4">
                  <input
                    type="hidden"
                    name="priceId"
                    value={getPriceIdForTier("ultimate")}
                  />
                  <input type="hidden" name="mode" value="subscription" />
                  <PurchaseButton
                    planLabel="Ultimate"
                    currentPlanType={planType}
                  >
                    <span className="block text-center text-xs font-semibold tracking-wider uppercase">
                      {subscriptionTier === "ultimate" && cancelAtPeriodEnd
                        ? "Resubscribe"
                        : "Upgrade"}
                    </span>
                  </PurchaseButton>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* Credit Pack */}
      <h2 className="text-lg font-medium mb-3">Buy Credits</h2>
      <div className="border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-bold">30 Credits</p>
            <p className="text-sm text-gray-500">
              One-time purchase &middot; no subscription required
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-2xl font-bold">$3.99</p>
            <form action={createCheckoutSession}>
              <input
                type="hidden"
                name="priceId"
                value={getCreditPackPriceId()}
              />
              <input type="hidden" name="mode" value="payment" />
              <PurchaseButton planLabel="30 Credits" currentPlanType={planType}>
                <span className="block text-center text-xs font-semibold tracking-wider uppercase">
                  Buy
                </span>
              </PurchaseButton>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <h2 className="text-lg font-medium mb-3">Transaction History</h2>
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium">
                  Reason
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium">
                  Credits
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions?.map(
                (t: {
                  id: string;
                  created_at: string;
                  reason: string;
                  amount: number;
                }) => (
                  <tr key={t.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-sm">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {t.reason.replace(/_/g, " ")}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium ${
                        t.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.amount > 0 ? "+" : ""}
                      {t.amount}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npx next build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/account/page.tsx
git commit -m "feat: redesign account page with subscription plans, credit pack, and cancel flow"
```

---

### Task 6: Pricing Page — Auth-Aware CTAs + Credit Pack Callout

**Files:**
- Modify: `src/app/pricing/page.tsx`

- [ ] **Step 1: Make the pricing page a server component with auth detection**

Replace the entire contents of `src/app/pricing/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing | Taylor Resumé",
  description:
    "Honest pricing for job seekers. Start free, no credit card required.",
};

const FEATURES = [
  "ATS score checker",
  "Download Word (.docx)",
  "Download PDF",
  "Job status tracker",
];

const SOLID_CTA =
  "block w-full text-center font-sans text-xs font-semibold tracking-[1.5px] uppercase bg-[#1a1a1a] text-white px-4 py-3 hover:bg-[#333] transition-colors mt-6";

const OUTLINE_CTA =
  "block w-full text-center font-sans text-xs font-semibold tracking-[1.5px] uppercase border border-gray-300 text-foreground px-4 py-3 hover:border-gray-500 transition-colors mt-6";

function FeatureList() {
  return (
    <ul className="flex-1 space-y-0">
      {FEATURES.map((feature, i) => (
        <li
          key={feature}
          className={`font-sans text-sm text-gray-700 py-1.5 flex items-start gap-2 ${
            i < FEATURES.length - 1 ? "border-b border-gray-100" : ""
          }`}
        >
          <span
            aria-hidden="true"
            className="font-sans text-xs text-foreground mt-0.5 shrink-0"
          >
            ✓
          </span>
          {feature}
        </li>
      ))}
    </ul>
  );
}

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  // For logged-in users, CTAs go to account page; for logged-out, to login
  const freeCta = isLoggedIn ? "/dashboard" : "/auth/login";
  const paidCta = isLoggedIn ? "/dashboard/account" : "/auth/login";
  const freeCtaLabel = isLoggedIn ? "Current Plan" : "Get Started Free";

  return (
    <div>
      {/* Header */}
      <p className="font-sans text-[11px] font-semibold tracking-[2.5px] uppercase text-gray-500 mb-3">
        Pricing
      </p>
      <h1 className="font-sans text-3xl font-bold text-foreground mb-3">
        Honest pricing for honest job seekers.
      </h1>
      <p className="font-serif text-base text-gray-600 leading-relaxed max-w-[520px] mb-10">
        Job searching is expensive enough. We keep our prices in check so you
        can focus on landing the role, not watching the meter.
      </p>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-gray-200 border border-gray-200">
        {/* Free */}
        <div className="bg-white p-8 flex flex-col">
          <div className="h-[22px]" />
          <p className="font-sans text-xs font-semibold tracking-[2px] uppercase text-gray-500 mb-4">
            FREE
          </p>
          <p className="font-sans text-4xl font-bold text-foreground leading-none">
            $0
          </p>
          <p className="font-sans text-sm text-gray-400 mt-1">
            no credit card required
          </p>
          <p className="font-sans text-[11px] text-gray-500 mt-3 mb-6 pb-6 border-b border-gray-200">
            Free to get started
          </p>
          <p className="font-sans text-[28px] font-bold text-foreground leading-none mb-1">
            10
          </p>
          <p className="font-sans text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200">
            resum&eacute;s + cover letters
          </p>
          <FeatureList />
          <Link href={freeCta} className={OUTLINE_CTA}>
            {freeCtaLabel}
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-white p-8 flex flex-col">
          <div className="h-[22px]" />
          <p className="font-sans text-xs font-semibold tracking-[2px] uppercase text-gray-500 mb-4">
            PRO
          </p>
          <p className="font-sans text-4xl font-bold text-foreground leading-none">
            $7.99
          </p>
          <p className="font-sans text-sm text-gray-400 mt-1">
            /month &middot; cancel anytime
          </p>
          <p className="font-sans text-[11px] text-gray-500 mt-3 mb-6 pb-6 border-b border-gray-200">
            ~$0.13 per resum&eacute; + cover letter
          </p>
          <p className="font-sans text-[28px] font-bold text-foreground leading-none mb-1">
            60
          </p>
          <p className="font-sans text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200">
            resum&eacute;s + cover letters / mo
          </p>
          <FeatureList />
          <Link href={paidCta} className={SOLID_CTA}>
            Get Pro
          </Link>
        </div>

        {/* Ultimate */}
        <div className="bg-[#fafaf9] p-8 flex flex-col">
          <span className="inline-block font-sans text-[10px] font-bold tracking-[1.5px] uppercase bg-[#1a1a1a] text-white px-2 py-0.5 mb-4 self-start">
            Best Value
          </span>
          <p className="font-sans text-xs font-semibold tracking-[2px] uppercase text-gray-500 mb-4">
            ULTIMATE
          </p>
          <p className="font-sans text-4xl font-bold text-foreground leading-none">
            $19.99
          </p>
          <p className="font-sans text-sm text-gray-400 mt-1">
            /month &middot; cancel anytime
          </p>
          <p className="font-sans text-[11px] text-gray-500 mt-3 mb-6 pb-6 border-b border-gray-200">
            ~$0.07 per resum&eacute; + cover letter
          </p>
          <p className="font-sans text-[28px] font-bold text-foreground leading-none mb-1">
            300
          </p>
          <p className="font-sans text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200">
            resum&eacute;s + cover letters / mo
          </p>
          <FeatureList />
          <Link href={paidCta} className={SOLID_CTA}>
            Get Ultimate
          </Link>
        </div>
      </div>

      {/* Credit pack callout */}
      <div className="border-l-[3px] border-gray-300 bg-gray-50 px-5 py-4 mt-6">
        <p className="text-sm text-gray-500 leading-relaxed">
          <strong className="font-sans font-semibold text-gray-700">
            Need a few more credits?
          </strong>{" "}
          Get 30 credits for $3.99 &mdash; no subscription required.{" "}
          {isLoggedIn ? (
            <Link
              href="/dashboard/account"
              className="underline hover:text-gray-600 transition-colors"
            >
              Buy credits
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="underline hover:text-gray-600 transition-colors"
            >
              Sign up to buy credits
            </Link>
          )}
        </p>
      </div>

      {/* Reset policy callout */}
      <div className="border-l-[3px] border-gray-300 bg-gray-50 px-5 py-4 mt-2">
        <p className="text-sm text-gray-500 leading-relaxed">
          <strong className="font-sans font-semibold text-gray-700">
            Credits reset monthly.
          </strong>{" "}
          Unused credits don&rsquo;t roll over &mdash; apply them now and keep
          your job search moving. Every plan includes the job status tracker so
          you can manage all your applications in one place.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 space-y-1">
        <p className="font-sans text-sm text-gray-400">
          Every new account starts with 10 free credits. No credit card
          required.
        </p>
        <p className="font-sans text-sm text-gray-400">
          Questions?{" "}
          <a
            href="mailto:hello@taylorresume.com"
            className="underline hover:text-gray-600 transition-colors"
          >
            hello@taylorresume.com
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npx next build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "feat: make pricing page auth-aware, add credit pack callout"
```

---

### Task 7: Manual Stripe Setup & Environment Variables

This task is done manually in the Stripe dashboard and Vercel — no code changes.

- [ ] **Step 1: Create products in live Stripe**

In the Stripe dashboard (live mode):
1. Create product "Pro Monthly" → add price $7.99/month recurring
2. Create product "Ultimate Monthly" → add price $19.99/month recurring
3. Create product "Credit Pack" → add price $3.99 one-time

Copy the three `price_xxx` IDs.

- [ ] **Step 2: Set up webhook in live Stripe**

In Stripe Dashboard → Developers → Webhooks:
1. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
2. Select events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the webhook signing secret.

- [ ] **Step 3: Update environment variables**

In `.env.local` and Vercel dashboard:
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_ULTIMATE_MONTHLY=price_xxx
STRIPE_PRICE_CREDIT_PACK=price_xxx
```

Remove old vars: `STRIPE_CREDIT_PACK_PRICE_ID`, `STRIPE_MONTHLY_PRICE_ID`.

- [ ] **Step 4: Apply database migration to production**

Run the SQL from Task 1 against your production Supabase instance via the SQL Editor.

---

### Task 8: End-to-End Verification

- [ ] **Step 1: Test credit pack purchase flow**

1. Log in as a free user
2. Go to `/dashboard/account`
3. Click "Buy" on the 30 credits pack
4. Complete Stripe Checkout with test card `4242 4242 4242 4242`
5. Verify: credits increase by 30, transaction logged, plan_type is `credit_pack`

- [ ] **Step 2: Test subscription flow**

1. Click "Get Pro" on the account page
2. Complete Stripe Checkout
3. Verify: credits reset to 60, plan_type is `subscription`, subscription_tier is `pro`, renewal date shows

- [ ] **Step 3: Test cancellation flow**

1. Click "Cancel subscription" on the account page
2. Confirm the dialog
3. Verify: banner shows "Cancels [date]", subscription still active until period end

- [ ] **Step 4: Test pricing page auth behavior**

1. Visit `/pricing` logged out → CTAs should link to `/auth/login`
2. Visit `/pricing` logged in → Pro/Ultimate CTAs should link to `/dashboard/account`, Free shows "Current Plan"
3. Credit pack callout should show appropriate link based on auth state

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after Stripe live pricing verification"
```
