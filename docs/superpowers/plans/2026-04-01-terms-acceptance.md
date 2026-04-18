# Terms Acceptance Interstitial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate new users behind a terms acceptance screen before they can access the dashboard, while grandfathering all existing users.

**Architecture:** Add `terms_accepted_at` column to `profiles`; backfill existing rows. Dashboard layout queries the column after auth check and redirects to `/auth/accept-terms` if null. The acceptance page is an async server component with a server action in a sibling `actions.ts` file that sets the timestamp and redirects back to `/dashboard`.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (server client from `@/lib/supabase/server`), Tailwind CSS v4, `marked` (markdown rendering), Inter font via CSS variable `--font-inter`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/003_add_terms_accepted_at.sql` | **Create** | Add column, backfill existing rows |
| `src/app/dashboard/layout.tsx` | **Modify** | Add profile query + terms check after auth check |
| `src/app/auth/accept-terms/page.tsx` | **Create** | Async server component — renders wordmark, heading, scrollable terms, form |
| `src/app/auth/accept-terms/actions.ts` | **Create** | `"use server"` file — `acceptTerms()` updates profile, redirects to dashboard |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/003_add_terms_accepted_at.sql`

> **Convention note:** The spec's file map shows `[timestamp]_add_terms_accepted_at.sql` using a timestamp prefix. The project's existing migrations use a sequential-number prefix (`001_initial_schema.sql`, `002_ats_scores.sql`). The plan uses `003_add_terms_accepted_at.sql` to match the established convention — **do not switch to a timestamp prefix**.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/003_add_terms_accepted_at.sql

-- Add terms acceptance timestamp column
ALTER TABLE profiles
  ADD COLUMN terms_accepted_at TIMESTAMPTZ NULL;

-- Grandfather all existing users: they have implicitly accepted
UPDATE profiles
  SET terms_accepted_at = NOW()
  WHERE terms_accepted_at IS NULL;
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
supabase db push
```

Expected: migration runs cleanly, no errors. If using Supabase hosted project directly, run the SQL in the Supabase SQL Editor.

- [ ] **Step 3: Verify column exists**

In the Supabase Table Editor (or SQL Editor), check that `profiles` now has `terms_accepted_at` and that all existing rows have a non-null timestamp.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_add_terms_accepted_at.sql
git commit -m "feat: add terms_accepted_at column to profiles, backfill existing users"
```

---

## Task 2: Dashboard Layout — Terms Check

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

Current state of the file (lines 1–25):
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen font-sans">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4 pt-18 md:p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 1: Add the profile query and terms check**

Insert after the `if (!user)` block, before the `return`:

```tsx
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("user_id", user.id)
    .single();

  if (!profile || !profile.terms_accepted_at) {
    redirect("/auth/accept-terms");
  }
```

The complete file after the edit:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("user_id", user.id)
    .single();

  if (!profile || !profile.terms_accepted_at) {
    redirect("/auth/accept-terms");
  }

  return (
    <div className="flex min-h-screen font-sans">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4 pt-18 md:p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke test — existing user should not be redirected**

Log in as an existing user (one whose `terms_accepted_at` was backfilled). Navigate to `/dashboard`. Should load normally without redirect.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: redirect to terms acceptance gate if terms_accepted_at is null"
```

---

## Task 3: Server Action — `acceptTerms`

**Files:**
- Create: `src/app/auth/accept-terms/actions.ts`

The action lives in a dedicated file so that `"use server"` is a file-level directive. This avoids the mixing restriction (file-level `"use server"` can't appear in a file that also has JSX/server component code).

- [ ] **Step 1: Create `actions.ts`**

```ts
// src/app/auth/accept-terms/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptTerms() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  await supabase
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("user_id", user.id);

  redirect("/dashboard");
}
```

Key constraints honored:
- `redirect()` is **outside** any try/catch — Next.js throws internally, catching it would swallow the redirect.
- Uses `update` (not `upsert`) — the auth trigger in `001_initial_schema.sql` guarantees a profile row exists for every authenticated user.
- TypeScript narrows `user` to non-null after `if (!user) redirect(...)` because `redirect()` is typed as `never`. If the build reports a TypeScript error like "Object is possibly null" on the `.eq("user_id", user.id)` line, add an explicit `return` after the redirect call: `if (!user) { redirect("/auth/login"); return; }`.
- The `update` call has no error handling by design: if the database write fails, the user lands on `/dashboard` with `terms_accepted_at` still null and gets redirected back to `/auth/accept-terms`. This is the desired degraded behavior — they see the gate again on next visit. No silent data corruption occurs.

- [ ] **Step 2: Commit**

```bash
git add src/app/auth/accept-terms/actions.ts
git commit -m "feat: add acceptTerms server action"
```

---

## Task 4: Acceptance Page — `/auth/accept-terms`

**Files:**
- Create: `src/app/auth/accept-terms/page.tsx`

This is an **async server component** (no `"use client"`). It reads the terms markdown from disk and renders it inline in a scrollable box. It imports `acceptTerms` from `./actions` and passes it as the form's `action` prop.

Layout spec (from design doc):
- No `StandardNav`, no `Footer`
- Centered single-column, `max-w-[560px]`, white bg, `min-h-screen`
- Wordmark → Heading → Subtext → Scrollable terms box → "I Agree" button → Fine print

> **TypeScript narrowing:** `redirect()` in Next.js 16 is typed as `never`, so TypeScript narrows `user` to non-null after `if (!user) redirect(...)`. If the build produces a TypeScript error ("Object is possibly null") on any line that uses `user` after the check, add an explicit `return`: `if (!user) { redirect("/auth/login"); return; }`.

> **Already-accepted users:** If an authenticated user who has already accepted visits `/auth/accept-terms` directly, the page queries their profile and redirects them forward to `/dashboard` immediately. This prevents showing the gate a second time and avoids any confusion.

> **`overflow-y-scroll`:** The spec says "overflow-y scroll" (ambiguous). The implementation uses `overflow-y-scroll`, which forces scrollbars to always be visible — intentional for a legal acceptance page so users can see the box is scrollable without having to hover first.

- [ ] **Step 1: Create `page.tsx`**

```tsx
// src/app/auth/accept-terms/page.tsx
import fs from "fs";
import path from "path";
import { marked } from "marked";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptTerms } from "./actions";

export default async function AcceptTermsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Forward already-accepted users directly to the dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("user_id", user!.id)
    .single();

  if (profile?.terms_accepted_at) redirect("/dashboard");

  const filePath = path.join(process.cwd(), "content", "legal", "terms-of-use.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  const html = await marked(raw);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[560px] flex flex-col gap-6">
        {/* Wordmark */}
        <p className="font-sans text-xl font-bold tracking-tight text-center">
          Taylor Resum&eacute;
        </p>

        {/* Heading */}
        <h1 className="font-sans text-2xl font-bold text-center">
          Before you get started
        </h1>

        {/* Subtext */}
        <p className="font-serif text-base text-gray-600 text-center">
          Please review and accept our Terms of Use to continue.
        </p>

        {/* Scrollable terms box — h-80 = 320px per spec; overflow-y-scroll always shows scrollbar */}
        <div
          className="h-80 overflow-y-scroll border border-gray-200 rounded p-4 prose prose-gray prose-sm max-w-none prose-headings:font-sans prose-p:font-serif prose-li:font-serif"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* I Agree form */}
        <form action={acceptTerms}>
          <button
            type="submit"
            className="w-full bg-[#1a1a1a] text-white font-sans uppercase tracking-widest text-sm py-3 rounded hover:bg-black transition-colors"
          >
            I Agree
          </button>
        </form>

        {/* Fine print */}
        <p className="font-sans text-[11px] text-gray-400 text-center">
          By clicking I Agree, you confirm you are at least 16 years old and
          accept our{" "}
          <a href="/terms" className="underline hover:text-gray-600">
            Terms of Use
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-gray-600">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify route is outside dashboard group**

The file lives at `src/app/auth/accept-terms/page.tsx` — under `(app)/auth/`, not under `(app)/dashboard/`. Confirm it is **not** wrapped by `dashboard/layout.tsx` by checking the route hierarchy. The dashboard layout only applies to routes under `src/app/dashboard/`, so no redirect loop is possible.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/accept-terms/page.tsx
git commit -m "feat: add /auth/accept-terms acceptance page"
```

---

## Task 5: Build Verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors, no missing imports.

- [ ] **Step 2: Manual end-to-end test — new user flow**

1. Create a new test user (magic link flow)
2. Accept the magic link — should land at `/dashboard`
3. Dashboard layout queries `terms_accepted_at` — it is `NULL` for the new user
4. Gets redirected to `/auth/accept-terms`
5. Page renders wordmark, heading, subtext, scrollable terms, button
6. Click "I Agree" — server action runs, sets `terms_accepted_at`, redirects to `/dashboard`
7. Dashboard loads normally

- [ ] **Step 3: Manual test — existing user flow**

1. Log in as an existing user (backfilled row)
2. Navigate to `/dashboard` — loads directly, no interstitial shown

- [ ] **Step 4: Manual test — unauthenticated access**

1. Visit `/auth/accept-terms` while logged out
2. Should redirect to `/auth/login` immediately (auth check in page component)

- [ ] **Step 5: Commit build verification**

```bash
git commit --allow-empty -m "chore: verify terms acceptance build passes"
```

(Only if no code changes were needed; otherwise commit actual fixes.)
