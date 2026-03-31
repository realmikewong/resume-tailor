# Analytics Design — Hybrid GTM + Custom Events

**Date:** 2026-03-30
**Status:** Approved

---

## Goal

Instrument the Taylor Resumé app with a hybrid analytics strategy:
- **GTM auto-tracking** for all logged-out marketing pages (no code changes needed)
- **Custom `dataLayer` events** from React components for the logged-in product experience

All custom events are pushed to `window.dataLayer` and forwarded to GA4 via GTM. This avoids a direct GA4 SDK dependency in the app.

---

## Architecture

### GTM is already installed

`NEXT_PUBLIC_GTM_ID=GTM-PBRRPSKN` is set and the GTM `<Script>` tag is live in `src/app/layout.tsx`. GTM handles pageviews and auto-click tracking on marketing pages without additional code.

### Custom events use a shared helper

All logged-in event tracking goes through a single `trackEvent()` function in `src/lib/analytics.ts`. This function:
- Pushes to `window.dataLayer` (picked up by GTM → GA4)
- Is a no-op during SSR (no `window` available) and during tests
- Accepts a typed `AnalyticsEvent` union so event names and properties are enforced at compile time

---

## Naming Convention

`noun_verb` in snake_case, past tense. Examples: `resume_uploaded`, `generation_started`.

---

## Event Catalog

### GTM Auto-Track (logged-out, no code changes)

Configure these as triggers in GTM:

| Event | Trigger | Notes |
|---|---|---|
| `page_view` | All pages | GA4 built-in |
| `cta_clicked` | Click on "Get Started" buttons | GTM click trigger |
| `pricing_viewed` | `/pricing` pageview | GTM pageview trigger |
| `plan_selected` | Click on pricing tier CTA | GTM click trigger |
| `ats_tool_used` | Free ATS form submit | GTM form submit trigger |
| `blog_article_viewed` | `/blog/[slug]` pageview | GTM pageview trigger |
| `login_clicked` | Click on Login nav link | GTM click trigger |

### Custom Code Events (logged-in app)

#### Auth

| Event | File | Trigger |
|---|---|---|
| `user_logged_in` | `src/app/auth/callback/page.tsx` | `SIGNED_IN` auth state change |
| `user_signed_up` | `src/app/auth/callback/page.tsx` | `SIGNED_IN` + account created within last 60s |

**New user detection:** Compare `user.created_at` to `Date.now()`. If within 60 seconds, treat as signup.

#### Resumes

| Event | File | Trigger |
|---|---|---|
| `resume_upload_started` | `src/components/resumes/upload-zone.tsx` | File selected/dropped |
| `resume_uploaded` | `src/components/resumes/upload-zone.tsx` | Upload API success |
| `resume_upload_failed` | `src/components/resumes/upload-zone.tsx` | Upload API error |
| `resume_deleted` | `src/components/resumes/resume-list.tsx` | Delete confirmed |

#### Generation Flow

| Event | File | Trigger |
|---|---|---|
| `job_description_submitted` | `src/app/dashboard/jobs/new/page.tsx` | Step advances to `details` |
| `generation_started` | `src/app/dashboard/jobs/new/page.tsx` | `/api/generate` called |
| `generation_completed` | `src/app/dashboard/jobs/new/page.tsx` | Realtime status → `completed` |
| `generation_failed` | `src/app/dashboard/jobs/new/page.tsx` | Realtime status → `failed` |

#### Downloads

| Event | File | Trigger |
|---|---|---|
| `resume_downloaded` | `src/components/generations/download-buttons.tsx` | Resume Word or PDF button click |
| `cover_letter_downloaded` | `src/components/generations/download-buttons.tsx` | Cover letter Word or PDF button click |

Event properties for downloads:
- `file_format`: `"word"` or `"pdf"`

#### ATS Score

| Event | File | Trigger |
|---|---|---|
| `ats_score_viewed` | `src/components/ats/ats-score-loader.tsx` | Scores successfully loaded/rendered |

#### Job Tracker

| Event | File | Trigger |
|---|---|---|
| `job_added` | `src/app/dashboard/jobs/new/page.tsx` | Generation completed (job is auto-added) |
| `job_status_updated` | `src/components/jobs/job-tracker-table.tsx` | Status dropdown changed |

#### Account / Billing

| Event | File | Trigger |
|---|---|---|
| `upgrade_clicked` | `src/app/dashboard/account/page.tsx` | Upgrade plan button clicked |
| `credits_exhausted` | `src/app/dashboard/account/page.tsx` | Credits balance is 0 on page load |

---

## Standard Event Properties

All custom events include these base properties where available:

```ts
{
  event: string;           // The event name, e.g. "resume_uploaded"
  user_id?: string;        // Supabase user UUID
  plan_tier?: string;      // "free" | "pro" | "ultimate"
  credit_balance?: number; // Current credits remaining
}
```

Generation events additionally include:
```ts
{
  generation_id?: string;
  has_cover_letter?: boolean;
}
```

Download events additionally include:
```ts
{
  file_format: "word" | "pdf";
}
```

---

## `trackEvent()` API

```ts
// src/lib/analytics.ts
trackEvent(eventName: string, properties?: Record<string, unknown>): void
```

Pushes `{ event: eventName, ...properties }` to `window.dataLayer`. Safe to call from any client component.

---

## Files Changed

| File | Action |
|---|---|
| `src/lib/analytics.ts` | Create — `trackEvent()` helper |
| `src/app/auth/callback/page.tsx` | Add `user_logged_in` / `user_signed_up` |
| `src/components/resumes/upload-zone.tsx` | Add resume upload events |
| `src/components/resumes/resume-list.tsx` | Add `resume_deleted` |
| `src/app/dashboard/jobs/new/page.tsx` | Add generation flow events |
| `src/components/generations/download-buttons.tsx` | Add download events |
| `src/components/ats/ats-score-loader.tsx` | Add `ats_score_viewed` |
| `src/app/dashboard/account/page.tsx` | Add `upgrade_clicked`, `credits_exhausted` |
| `src/components/jobs/job-tracker-table.tsx` | Add `job_status_updated` |

---

## Out of Scope

- GTM trigger configuration (done in GTM UI, not code)
- GA4 custom dimension setup (done in GA4 UI)
- Conversion funnel configuration in GA4
- Any server-side event tracking (Measurement Protocol)
- A/B testing or feature flags
