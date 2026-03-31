# Analytics Implementation Plan

**Date:** 2026-03-30
**Spec:** `docs/superpowers/specs/2026-03-30-analytics-design.md`
**Status:** Ready

---

## Overview

9 files to touch. All changes are additive (no existing behavior changes). Tasks 2–9 depend on Task 1 (the shared helper), but are otherwise independent of each other.

---

### Task 1: Create `trackEvent()` helper

**File:** `src/lib/analytics.ts` (new file)

```ts
"use client"; // not a directive — this file is safe for server imports too

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...properties });
}
```

No dependencies. No tests required (trivial wrapper).

- [ ] Create `src/lib/analytics.ts`
- [ ] Commit: `feat: add trackEvent analytics helper`

---

### Task 2: Auth events

**File:** `src/app/auth/callback/page.tsx`

In the `SIGNED_IN` handler, after successful session exchange:
- Check if `user.created_at` is within 60 seconds of now → fire `user_signed_up`
- Otherwise → fire `user_logged_in`

```ts
import { trackEvent } from "@/lib/analytics";

// inside onAuthStateChange, after SIGNED_IN:
const createdAt = new Date(session.user.created_at).getTime();
const isNewUser = Date.now() - createdAt < 60_000;
trackEvent(isNewUser ? "user_signed_up" : "user_logged_in", {
  user_id: session.user.id,
});
```

Note: `onAuthStateChange` callback receives `(event, session)` — use `session.user` not `data.user`.

- [ ] Add auth events to `src/app/auth/callback/page.tsx`

---

### Task 3: Resume upload events

**File:** `src/components/resumes/upload-zone.tsx`

Three events in `handleFile`:
1. `resume_upload_started` — at the top of `handleFile`, before fetch
2. `resume_uploaded` — after `res.ok` check passes
3. `resume_upload_failed` — in the `!res.ok` branch

```ts
import { trackEvent } from "@/lib/analytics";

// top of handleFile:
trackEvent("resume_upload_started");

// on success:
trackEvent("resume_uploaded");

// on error:
trackEvent("resume_upload_failed", { error_message: data.error });
```

- [ ] Add upload events to `src/components/resumes/upload-zone.tsx`

---

### Task 4: Resume delete event

**File:** `src/components/resumes/resume-list.tsx`

Find the delete handler (likely a `handleDelete` function or inline click). Fire after successful Supabase delete:

```ts
import { trackEvent } from "@/lib/analytics";

trackEvent("resume_deleted");
```

- [ ] Add `resume_deleted` to `src/components/resumes/resume-list.tsx`

---

### Task 5: Generation flow events

**File:** `src/app/dashboard/jobs/new/page.tsx`

Four events across the multi-step flow:

1. **`job_description_submitted`** — when step advances to `details` (after job input is submitted/scraped)
2. **`generation_started`** — just before or after `/api/generate` is called
3. **`generation_completed`** — inside the Realtime subscription when status becomes `completed`
4. **`generation_failed`** — inside the Realtime subscription when status becomes `failed`

For `generation_completed` and `generation_failed`, include `generation_id`.

```ts
import { trackEvent } from "@/lib/analytics";

// Step transition to details:
trackEvent("job_description_submitted");

// Before fetch to /api/generate:
trackEvent("generation_started");

// In Realtime handler, on completed:
trackEvent("generation_completed", {
  generation_id: generationId,
  has_cover_letter: true, // check if cover letter content present
});
trackEvent("job_added"); // job is auto-added at this point

// On failed:
trackEvent("generation_failed", { generation_id: generationId });
```

- [ ] Add generation events to `src/app/dashboard/jobs/new/page.tsx`

---

### Task 6: Download events

**File:** `src/components/generations/download-buttons.tsx`

Fire in `handleDownload` — identify whether it's a resume or cover letter, and word or pdf, from the `path` parameter or by adding a `docType` parameter to the function.

Simplest approach: pass `docType` alongside `fileName`:

```ts
const handleDownload = async (
  path: string,
  fileName: string,
  docType: "resume" | "cover_letter",
  fileFormat: "word" | "pdf"
) => {
  // ... existing download logic ...
  trackEvent(docType === "resume" ? "resume_downloaded" : "cover_letter_downloaded", {
    file_format: fileFormat,
  });
};
```

Update each button's `onClick` to pass the two new args.

- [ ] Add download events to `src/components/generations/download-buttons.tsx`

---

### Task 7: ATS score viewed event

**File:** `src/components/ats/ats-score-loader.tsx`

Fire `ats_score_viewed` once when scores are first displayed. Use a `useEffect` with a ref to ensure it only fires once even if the component re-renders:

```ts
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

const hasFired = useRef(false);
useEffect(() => {
  if (scores && !hasFired.current) {
    hasFired.current = true;
    trackEvent("ats_score_viewed");
  }
}, [scores]);
```

- [ ] Add `ats_score_viewed` to `src/components/ats/ats-score-loader.tsx`

---

### Task 8: Account / billing events

**File:** `src/app/dashboard/account/page.tsx`

This is a server component. The upgrade button click must be handled client-side. Options:
- Extract the upgrade button into a small `"use client"` component: `src/components/account/upgrade-button.tsx`
- Or check if the page already has client interactions

For `credits_exhausted`: fire on mount if `creditBalance === 0`. This also needs a client component.

Create `src/components/account/analytics-events.tsx` as a tiny client component:

```tsx
"use client";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function AccountAnalytics({ creditBalance }: { creditBalance: number }) {
  useEffect(() => {
    if (creditBalance === 0) {
      trackEvent("credits_exhausted");
    }
  }, [creditBalance]);
  return null;
}

export function UpgradeButton({ planLabel }: { planLabel: string }) {
  return (
    <button
      onClick={() => trackEvent("upgrade_clicked", { plan: planLabel })}
      // ... existing button styles
    >
      {planLabel}
    </button>
  );
}
```

Use `<AccountAnalytics creditBalance={credits} />` in the server component.
Replace existing upgrade buttons with `<UpgradeButton>` or add `onClick` handlers.

- [ ] Add account analytics events via client wrapper component

---

### Task 9: Job status updated event

**File:** `src/components/jobs/job-tracker-table.tsx`

Find the status dropdown change handler. Fire after successful Supabase update:

```ts
import { trackEvent } from "@/lib/analytics";

trackEvent("job_status_updated", { status: newStatus });
```

- [ ] Add `job_status_updated` to `src/components/jobs/job-tracker-table.tsx`

---

### Task 10: Build verification

- [ ] Run `npm run build` — must pass with zero errors
- [ ] Verify `window.dataLayer` pushes in browser devtools on: upload, generation complete, download
- [ ] Commit all changes: `feat: instrument app with custom analytics events`

---

## Commit Strategy

Single feature branch, one commit per logical group:
1. `feat: add trackEvent analytics helper`
2. `feat: add auth, resume, generation, download analytics events`
3. `feat: add ats score, account, job tracker analytics events`
