# Public Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `/roadmap` page where visitors see upcoming/in-progress/shipped features, logged-in users can cast one toggle vote (👍) per item, and the admin manages items via `/dashboard/admin/roadmap`. Feature requests are submitted via an authed form that emails the admin.

**Architecture:** Two new Supabase tables (`roadmap_items`, `roadmap_votes`) with a trigger-maintained `vote_count`. Public SSR page reads items + current user's votes. Vote toggle POSTs to an authed API route. Admin mutations go through API routes that check `profiles.is_admin` before using the admin (service-role) client. Feature submissions email the admin via Resend. A small extension to the existing `/auth/login` flow lets us redirect back to `/roadmap` after login.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Auth + RLS), Resend, `marked` (markdown), Jest (tests).

**Spec:** `docs/superpowers/specs/2026-04-16-public-roadmap-design.md`

---

## Pre-flight

> **Read before starting.** `/Users/mikewong/resume-tailor/AGENTS.md` says: *"This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."* Before writing any route handler, page, or middleware change, check `node_modules/next/dist/docs/` for the current App Router / Route Handler API. The project is on **Next.js 16.2.1 + React 19.2**.

Relevant existing infrastructure you should reuse, not reinvent:

- `src/lib/supabase/server.ts` — `createClient()` for SSR + route handlers (cookie-aware).
- `src/lib/supabase/client.ts` — browser client for client components.
- `src/lib/supabase/admin.ts` — `createAdminClient()` for service-role mutations (bypasses RLS).
- `src/lib/resend.ts` — `sendEmail({ to, subject, react })`.
- `src/lib/blog.ts` — uses `marked` to render markdown → HTML; reuse the same approach for roadmap descriptions.
- `src/components/blog/article-content.tsx` — pattern for rendering sanitized HTML with Tailwind prose classes.
- `profiles.is_admin` boolean already exists (added in migration 001). Set it manually via SQL for your user.

Conventions observed in the codebase:
- API routes: `src/app/api/<area>/route.ts`, export named HTTP verb functions.
- Tests: `__tests__/lib/<name>.test.ts`, Jest + ts-jest. **Run with `npx jest <path>` — there is no `test` script in `package.json`.**
- Admin email: `mwong@energy-solution.com` (store in env var, see Task 5).

---

## File Structure

```
New files:
├── supabase/migrations/007_roadmap.sql                 -- Tables, trigger, RLS
├── src/lib/auth/safe-next.ts                           -- Open-redirect-safe ?next= validator (shared)
├── src/lib/roadmap/markdown.ts                         -- renderRoadmapMarkdown(md) → sanitized HTML
├── src/lib/roadmap/types.ts                            -- Shared TS types + status labels + validation
├── src/lib/roadmap/admin-guard.ts                      -- requireAdmin(supabase) helper
├── src/app/roadmap/page.tsx                            -- Public SSR page
├── src/components/roadmap/roadmap-section.tsx          -- Server component: heading + list for one status
├── src/components/roadmap/roadmap-card.tsx             -- Client component: card + 👍 button (with variants)
├── src/components/roadmap/request-form.tsx             -- Client component: textarea + submit
├── src/app/api/roadmap/vote/route.ts                   -- POST, authed, toggle vote
├── src/app/api/roadmap/submit/route.ts                 -- POST, authed, email admin
├── src/app/api/admin/roadmap/route.ts                  -- POST admin, create item
├── src/app/api/admin/roadmap/[id]/route.ts             -- PATCH/DELETE admin
├── src/emails/feature-request.tsx                      -- React Email template for admin notification
├── src/app/dashboard/admin/roadmap/page.tsx            -- Admin table page
├── src/components/roadmap/admin-table.tsx              -- Client component: admin table + edit modal
├── __tests__/lib/roadmap/markdown.test.ts              -- Markdown renderer tests
├── __tests__/lib/roadmap/types.test.ts                 -- Validation tests
├── __tests__/api/roadmap/vote.test.ts                  -- Vote route tests
├── __tests__/api/roadmap/submit.test.ts                -- Submit route tests
├── __tests__/api/admin/roadmap.test.ts                 -- Admin route tests

Modified files:
├── src/app/auth/login/page.tsx                         -- Pass ?next= through to form
├── src/components/auth/magic-link-form.tsx             -- Include ?next= in emailRedirectTo
├── src/app/auth/callback/page.tsx                      -- Honor ?next= on redirect
├── middleware.ts                                       -- Don't drop ?next= when redirecting authed users
├── src/components/footer.tsx                           -- Add /roadmap link
├── src/components/nav/standard-nav.tsx                 -- Add /roadmap link (desktop + mobile sections)
├── .env.example                                        -- ADMIN_NOTIFICATION_EMAIL
```

Each task ships a coherent slice. After Task 2, the public page is viewable (no voting). After Task 4, authed voting works. After Task 5, submissions work. After Task 7, admin can manage items.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/007_roadmap.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/007_roadmap.sql

-- Status enum
CREATE TYPE roadmap_status AS ENUM ('backlog', 'planned', 'in_progress', 'complete');

-- Items
CREATE TABLE roadmap_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      roadmap_status NOT NULL DEFAULT 'backlog',
  vote_count  INTEGER NOT NULL DEFAULT 0,
  shipped_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes (composite PK = one vote per user per item)
CREATE TABLE roadmap_votes (
  roadmap_item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (roadmap_item_id, user_id)
);

CREATE INDEX idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX idx_roadmap_votes_user   ON roadmap_votes(user_id);

-- Keep vote_count in sync. SECURITY DEFINER with a pinned search_path so RLS
-- can't block the count update and search_path can't be hijacked.
CREATE OR REPLACE FUNCTION update_roadmap_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE roadmap_items SET vote_count = vote_count + 1 WHERE id = NEW.roadmap_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE roadmap_items SET vote_count = vote_count - 1 WHERE id = OLD.roadmap_item_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER roadmap_vote_count_trigger
AFTER INSERT OR DELETE ON roadmap_votes
FOR EACH ROW EXECUTE FUNCTION update_roadmap_vote_count();

-- Updated-at trigger for items (reuse the existing pattern if one exists; otherwise inline)
CREATE OR REPLACE FUNCTION roadmap_items_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER roadmap_items_updated_at
BEFORE UPDATE ON roadmap_items
FOR EACH ROW EXECUTE FUNCTION roadmap_items_set_updated_at();

-- RLS
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_items public read"
  ON roadmap_items FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies on roadmap_items -- admin mutations use
-- the service-role client which bypasses RLS.

CREATE POLICY "roadmap_votes read own"
  ON roadmap_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "roadmap_votes insert own"
  ON roadmap_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "roadmap_votes delete own"
  ON roadmap_votes FOR DELETE
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db reset` (nuke local DB and replay all migrations), or `npx supabase migration up` if you want to apply only new ones.
Expected: no errors; new tables visible in Supabase Studio at http://localhost:54323.

- [ ] **Step 3: Manual smoke test in psql / Studio**

```sql
-- Insert a test item
INSERT INTO roadmap_items (title, status) VALUES ('Test', 'backlog') RETURNING id;
-- Insert a vote using the returned id and your own auth.users row; then:
SELECT vote_count FROM roadmap_items WHERE title = 'Test';  -- expect 1
-- Delete the vote, re-query; expect 0
-- Clean up: DELETE FROM roadmap_items WHERE title = 'Test';
```
Expected: `vote_count` increments to 1 on INSERT, decrements to 0 on DELETE.

- [ ] **Step 4: Mark yourself as admin (one-time setup)**

Run in Studio SQL editor:
```sql
UPDATE profiles SET is_admin = TRUE WHERE user_id = (SELECT id FROM auth.users WHERE email = 'mwong@energy-solution.com');
```
Expected: `UPDATE 1`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/007_roadmap.sql
git commit -m "feat(roadmap): add tables, trigger, and RLS"
```

---

## Task 2: Shared roadmap utilities

**Files:**
- Create: `src/lib/roadmap/types.ts`
- Create: `src/lib/roadmap/markdown.ts`
- Create: `__tests__/lib/roadmap/types.test.ts`
- Create: `__tests__/lib/roadmap/markdown.test.ts`

- [ ] **Step 1: Write types + validation**

`src/lib/roadmap/types.ts`:
```ts
import { z } from "zod";

export type RoadmapStatus = "backlog" | "planned" | "in_progress" | "complete";

export const ROADMAP_STATUSES: RoadmapStatus[] = ["backlog", "planned", "in_progress", "complete"];

export const STATUS_LABELS: Record<RoadmapStatus, string> = {
  in_progress: "In Progress",
  planned: "Planned",
  backlog: "Backlog",
  complete: "Complete",
};

// Section render order (top to bottom on /roadmap)
export const SECTION_ORDER: RoadmapStatus[] = ["in_progress", "planned", "backlog", "complete"];

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  vote_count: number;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
};

export const shippedBadge = (item: RoadmapItem): string => {
  const votes = item.vote_count === 1 ? "1 vote" : `${item.vote_count} votes`;
  return `✓ Shipped · ${votes}`;
};

// Request bodies
export const VoteBodySchema = z.object({
  itemId: z.string().uuid(),
});

export const SubmitBodySchema = z.object({
  description: z.string().trim().min(10).max(2000),
});

export const AdminCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).optional().nullable(),
  status: z.enum(["backlog", "planned", "in_progress", "complete"]).default("backlog"),
});

export const AdminPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  status: z.enum(["backlog", "planned", "in_progress", "complete"]).optional(),
});
```

- [ ] **Step 2: Write tests for `shippedBadge` and schemas**

`__tests__/lib/roadmap/types.test.ts`:
```ts
import { shippedBadge, VoteBodySchema, SubmitBodySchema, AdminPatchSchema } from "@/lib/roadmap/types";

describe("shippedBadge", () => {
  it("singularizes one vote", () => {
    expect(shippedBadge({ vote_count: 1 } as never)).toBe("✓ Shipped · 1 vote");
  });
  it("pluralizes for zero or many", () => {
    expect(shippedBadge({ vote_count: 0 } as never)).toBe("✓ Shipped · 0 votes");
    expect(shippedBadge({ vote_count: 42 } as never)).toBe("✓ Shipped · 42 votes");
  });
});

describe("schemas", () => {
  it("VoteBodySchema rejects non-UUIDs", () => {
    expect(VoteBodySchema.safeParse({ itemId: "nope" }).success).toBe(false);
  });
  it("SubmitBodySchema trims and enforces length", () => {
    expect(SubmitBodySchema.safeParse({ description: "short" }).success).toBe(false);
    expect(SubmitBodySchema.safeParse({ description: "  " + "a".repeat(20) + "  " }).success).toBe(true);
    expect(SubmitBodySchema.safeParse({ description: "a".repeat(2001) }).success).toBe(false);
  });
  it("AdminPatchSchema allows empty object", () => {
    expect(AdminPatchSchema.safeParse({}).success).toBe(true);
  });
});
```

- [ ] **Step 3: Run and confirm tests pass**

Run: `npx jest __tests__/lib/roadmap/types.test.ts`
Expected: all green.

- [ ] **Step 4: Write the markdown renderer**

`src/lib/roadmap/markdown.ts`:
```ts
import { marked } from "marked";

// marked is synchronous when async: false. HTML passthrough is on by default
// in marked, but descriptions are admin-only input (trusted), matching the
// blog renderer pattern. If untrusted inputs are ever added here, add
// sanitize-html downstream.
marked.setOptions({ async: false, breaks: true, gfm: true });

export function renderRoadmapMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return marked.parse(md) as string;
}
```

- [ ] **Step 5: Write tests**

`__tests__/lib/roadmap/markdown.test.ts`:
```ts
import { renderRoadmapMarkdown } from "@/lib/roadmap/markdown";

describe("renderRoadmapMarkdown", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(renderRoadmapMarkdown(null)).toBe("");
    expect(renderRoadmapMarkdown(undefined)).toBe("");
    expect(renderRoadmapMarkdown("")).toBe("");
  });
  it("converts markdown to HTML", () => {
    const html = renderRoadmapMarkdown("**bold** and [a link](https://x.com)");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('href="https://x.com"');
  });
  it("supports GFM line breaks", () => {
    expect(renderRoadmapMarkdown("line one\nline two")).toContain("<br");
  });
});
```

- [ ] **Step 6: Run**

Run: `npx jest __tests__/lib/roadmap/`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/roadmap __tests__/lib/roadmap
git commit -m "feat(roadmap): add shared types, validation, and markdown renderer"
```

---

## Task 3: Login redirect with `?next=`

**Why:** The spec's logged-out 👍 flow sends users to `/auth/login?next=/roadmap` so they land back on the roadmap after magic-link login. Currently the callback hardcodes `/dashboard`. Three small, defensive edits. Validate `next` is an internal path (must start with `/` and not with `//` or `/\\`) to prevent open-redirect.

**Files:**
- Create: `src/lib/auth/safe-next.ts`
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/components/auth/magic-link-form.tsx`
- Modify: `src/app/auth/callback/page.tsx`
- Modify: `middleware.ts`

- [ ] **Step 1: Add a shared `safeNext` helper**

`src/lib/auth/safe-next.ts`:
```ts
/**
 * Validate that a `?next=<value>` param is a safe internal path.
 * Rejects absolute URLs, protocol-relative URLs (//evil.com), and backslash tricks.
 * Used by the login form, auth callback, and middleware to prevent open redirects.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
```

- [ ] **Step 2: Accept the `next` prop in the login page and pass it to the form**

Replace `src/app/auth/login/page.tsx` contents with:
```tsx
import { MagicLinkForm } from "@/components/auth/magic-link-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Taylor Resum&eacute;</h1>
        <p className="text-center text-gray-600 mb-8">
          Sign in with your email — no password needed.
        </p>
        <div className="flex justify-center">
          <MagicLinkForm next={next ?? null} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Thread `next` through the magic link and callback URL**

Edit `src/components/auth/magic-link-form.tsx`:

- Import: `import { safeNextPath } from "@/lib/auth/safe-next";`
- Add `next: string | null` to the component props.
- In `handleSubmit`, compute the callback URL: if `next` is a safe path, append `?next=<encoded>` to `emailRedirectTo`.

```tsx
export function MagicLinkForm({ next }: { next: string | null }) {
  // ...existing state...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const nextPath = safeNextPath(next);
    const redirectTo = `${window.location.origin}/auth/callback${
      nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
    }`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    // ...existing success/error handling...
  };
  // ...unchanged JSX...
}
```

- [ ] **Step 4: Honor `next` in the callback redirect**

Edit `src/app/auth/callback/page.tsx`:
- Import: `import { safeNextPath } from "@/lib/auth/safe-next";`
- In the `SIGNED_IN` branch, read `next` from `window.location.search` and use `safeNextPath`; fall back to `/dashboard`.

```tsx
// Replace the `router.replace("/dashboard")` call in the SIGNED_IN branch with:
const rawNext = new URLSearchParams(window.location.search).get("next");
const destination = safeNextPath(rawNext) ?? "/dashboard";
router.replace(destination);
```

Leave the `PASSWORD_RECOVERY` branch pointing at `/dashboard` — password recovery is a sensitive flow that should land in a known place, not follow a `next` param.

- [ ] **Step 5: Preserve `next` in middleware's authed-user bounce**

Edit `middleware.ts`:
- Import: `import { safeNextPath } from "@/lib/auth/safe-next";`
- When an authed user hits `/auth/*` and we bounce them, send them to `next` if present and safe, otherwise `/dashboard`.

Replace the existing authed-user redirect block with:
```ts
if (
  user &&
  request.nextUrl.pathname.startsWith("/auth") &&
  !AUTH_ROUTES_ACCESSIBLE_WHEN_AUTHENTICATED.includes(request.nextUrl.pathname)
) {
  const destination = safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/dashboard";
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = ""; // drop ?next= so we don't loop
  return NextResponse.redirect(url);
}
```

- [ ] **Step 6: Manual smoke test**

Run `npm run dev`. In a logged-out browser:
1. Visit `http://localhost:3000/auth/login?next=/blog` — sign in with a magic link.
2. Click the magic link → expect to land on `/blog`, not `/dashboard`.
3. Visit `/auth/login?next=//evil.com` while logged in → expect redirect to `/dashboard` (not evil.com).
4. Visit `/auth/login?next=/dashboard/generations` while logged out → expect to land on `/dashboard/generations` after login.

- [ ] **Step 7: Typecheck + build**

Run: `npm run build`
Expected: build succeeds (no type errors).

- [ ] **Step 8: Commit**

```bash
git add src/app/auth/login/page.tsx src/components/auth/magic-link-form.tsx src/app/auth/callback/page.tsx middleware.ts
git commit -m "feat(auth): honor ?next= param in login → callback redirect"
```

---

## Task 4: Public `/roadmap` page (read-only)

Ship a viewable public page first — no voting, no submission. Logged-out visitors see cards with 👍 links to `/auth/login?next=/roadmap`. Logged-in visitors see the same cards plus a disabled voting button (wired in Task 5).

**Files:**
- Create: `src/app/roadmap/page.tsx`
- Create: `src/components/roadmap/roadmap-section.tsx`
- Create: `src/components/roadmap/roadmap-card.tsx`

- [ ] **Step 1: Create the card (client component)**

`src/components/roadmap/roadmap-card.tsx`:
```tsx
"use client";

import { useState } from "react";
import type { RoadmapItem } from "@/lib/roadmap/types";
import { shippedBadge } from "@/lib/roadmap/types";

type Props = {
  item: RoadmapItem;
  descriptionHtml: string;
  variant: "authed" | "anon" | "shipped";
  initiallyVoted: boolean;
};

export function RoadmapCard({ item, descriptionHtml, variant, initiallyVoted }: Props) {
  const [voted, setVoted] = useState(initiallyVoted);
  const [count, setCount] = useState(item.vote_count);
  const [busy, setBusy] = useState(false);

  async function toggleVote() {
    if (busy || variant !== "authed") return;
    const prevVoted = voted;
    const prevCount = count;
    setVoted(!prevVoted);
    setCount(prevCount + (prevVoted ? -1 : 1));
    setBusy(true);
    try {
      const res = await fetch("/api/roadmap/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) throw new Error("vote failed");
      const data = (await res.json()) as { voted: boolean; vote_count: number };
      setVoted(data.voted);
      setCount(data.vote_count);
    } catch {
      setVoted(prevVoted);
      setCount(prevCount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border border-gray-200 rounded-lg p-5 bg-white flex gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-sans font-semibold text-lg text-gray-900">{item.title}</h3>
        {descriptionHtml && (
          <div
            className="prose prose-sm mt-2 max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
      </div>
      <div className="shrink-0">
        {variant === "shipped" ? (
          <span className="inline-flex items-center px-3 py-2 rounded-md bg-green-50 text-green-800 text-sm font-medium">
            {shippedBadge(item)}
          </span>
        ) : variant === "anon" ? (
          <a
            href="/auth/login?next=/roadmap"
            className="inline-flex flex-col items-center px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <span aria-hidden>👍</span>
            <span className="text-sm">{count}</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={toggleVote}
            disabled={busy}
            aria-pressed={voted}
            className={`inline-flex flex-col items-center px-3 py-2 rounded-md border ${
              voted ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span aria-hidden>👍</span>
            <span className="text-sm">{count}</span>
          </button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Create the section (server component)**

`src/components/roadmap/roadmap-section.tsx`:
```tsx
import { RoadmapCard } from "./roadmap-card";
import { renderRoadmapMarkdown } from "@/lib/roadmap/markdown";
import type { RoadmapItem, RoadmapStatus } from "@/lib/roadmap/types";
import { STATUS_LABELS } from "@/lib/roadmap/types";

export function RoadmapSection({
  status,
  items,
  userVotes,
  userIsAuthed,
}: {
  status: RoadmapStatus;
  items: RoadmapItem[];
  userVotes: Set<string>;
  userIsAuthed: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-sans text-xl font-bold text-gray-900 mb-4">{STATUS_LABELS[status]}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <RoadmapCard
            key={item.id}
            item={item}
            descriptionHtml={renderRoadmapMarkdown(item.description)}
            variant={status === "complete" ? "shipped" : userIsAuthed ? "authed" : "anon"}
            initiallyVoted={userVotes.has(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create the page**

`src/app/roadmap/page.tsx`:
```tsx
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RoadmapSection } from "@/components/roadmap/roadmap-section";
import type { RoadmapItem, RoadmapStatus } from "@/lib/roadmap/types";
import { SECTION_ORDER } from "@/lib/roadmap/types";

export const metadata: Metadata = {
  title: "Roadmap | Taylor Resumé",
  description: "See what we're building next and vote on what matters to you.",
};

export const dynamic = "force-dynamic"; // Need fresh counts + per-user vote state.

export default async function RoadmapPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: itemsData, error: itemsError } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const items = (itemsData ?? []) as RoadmapItem[];

  let userVotes = new Set<string>();
  if (user) {
    const { data: votes } = await supabase
      .from("roadmap_votes")
      .select("roadmap_item_id")
      .eq("user_id", user.id);
    userVotes = new Set((votes ?? []).map((v) => v.roadmap_item_id as string));
  }

  const grouped: Record<RoadmapStatus, RoadmapItem[]> = {
    backlog: [], planned: [], in_progress: [], complete: [],
  };
  for (const item of items) grouped[item.status].push(item);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <header>
        <h1 className="font-sans text-3xl font-bold text-gray-900">Roadmap</h1>
        <p className="mt-2 text-gray-600">
          What we&apos;re planning, building, and have shipped. Logged-in users can vote to help us prioritize.
        </p>
      </header>

      {SECTION_ORDER.map((status) => (
        <RoadmapSection
          key={status}
          status={status}
          items={grouped[status]}
          userVotes={userVotes}
          userIsAuthed={Boolean(user)}
        />
      ))}

      {items.length === 0 && (
        <p className="mt-10 text-center text-gray-500">Nothing here yet. Check back soon.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Seed 2–3 test items via Studio**

In Supabase Studio SQL editor, insert items across statuses to verify grouping:
```sql
INSERT INTO roadmap_items (title, description, status) VALUES
  ('AI cover letter tone picker', 'Choose **formal / casual / enthusiastic** when generating.', 'in_progress'),
  ('LinkedIn one-click import', 'Paste a LinkedIn URL and we fetch your profile to pre-fill the resume.', 'planned'),
  ('Stripe invoice download', 'Direct PDF invoice download from the billing page.', 'backlog'),
  ('Magic-link email redesign', 'Cleaner, branded sign-in email template.', 'complete');

UPDATE roadmap_items SET shipped_at = NOW() WHERE status = 'complete';
```

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`. In a logged-out browser visit `http://localhost:3000/roadmap`.
Expected:
- Four sections in order: In Progress → Planned → Backlog → Complete.
- Each card shows title, rendered markdown description, and 👍 button with count 0.
- Complete card shows `✓ Shipped · 0 votes` badge, no button.
- Clicking any 👍 navigates to `/auth/login?next=/roadmap`.

- [ ] **Step 6: Typecheck + build**

Run: `npm run build`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add src/app/roadmap src/components/roadmap
git commit -m "feat(roadmap): public page with grouped sections and anon voting CTA"
```

---

## Task 5: Vote API route + interactive toggle

Wire the authed 👍 button to actually toggle votes.

**Files:**
- Create: `src/app/api/roadmap/vote/route.ts`
- Create: `__tests__/api/roadmap/vote.test.ts`

- [ ] **Step 1: Implement the route**

`src/app/api/roadmap/vote/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VoteBodySchema } from "@/lib/roadmap/types";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = VoteBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { itemId } = parsed.data;

  // Fetch the item to check status exists + not complete
  const { data: item, error: itemErr } = await supabase
    .from("roadmap_items")
    .select("id, status, vote_count")
    .eq("id", itemId)
    .single();
  if (itemErr || !item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.status === "complete") {
    return NextResponse.json({ error: "Voting closed for shipped features" }, { status: 400 });
  }

  // Does the user already have a vote?
  const { data: existing } = await supabase
    .from("roadmap_votes")
    .select("roadmap_item_id")
    .eq("roadmap_item_id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  let voted: boolean;
  if (existing) {
    const { error } = await supabase.from("roadmap_votes").delete()
      .eq("roadmap_item_id", itemId).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Vote toggle failed" }, { status: 500 });
    voted = false;
  } else {
    const { error } = await supabase.from("roadmap_votes").insert({
      roadmap_item_id: itemId,
      user_id: user.id,
    });
    // 23505 = unique_violation (e.g., double-click race). Treat as idempotent.
    if (error && (error as { code?: string }).code !== "23505") {
      return NextResponse.json({ error: "Vote toggle failed" }, { status: 500 });
    }
    voted = true;
  }

  // Re-read the updated count (trigger has fired)
  const { data: refreshed } = await supabase
    .from("roadmap_items")
    .select("vote_count")
    .eq("id", itemId)
    .single();

  return NextResponse.json({ voted, vote_count: refreshed?.vote_count ?? item.vote_count });
}
```

- [ ] **Step 2: Write tests (mocked Supabase client)**

`__tests__/api/roadmap/vote.test.ts`:
```ts
/**
 * @jest-environment node
 */
import { POST } from "@/app/api/roadmap/vote/route";

jest.mock("@/lib/supabase/server");
import { createClient } from "@/lib/supabase/server";

type MockClient = ReturnType<typeof buildMock>;

function buildMock(overrides: {
  user?: { id: string } | null;
  item?: { id: string; status: string; vote_count: number } | null;
  existingVote?: boolean;
  refreshedCount?: number;
} = {}) {
  const {
    user = { id: "user-1" },
    item = { id: "00000000-0000-0000-0000-000000000001", status: "backlog", vote_count: 0 },
    existingVote = false,
    refreshedCount = 1,
  } = overrides;

  const from = jest.fn((table: string) => {
    if (table === "roadmap_items") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: item, error: item ? null : { message: "not found" } }),
          }),
        }),
      } as never;
    }
    if (table === "roadmap_votes") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: existingVote ? { roadmap_item_id: item?.id } : null }),
            }),
          }),
        }),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        insert: async () => ({ error: null }),
      } as never;
    }
    throw new Error(`unmocked table ${table}`);
  });

  // For the second roadmap_items call (count refresh), return refreshedCount
  let itemsCall = 0;
  from.mockImplementation((table: string) => {
    if (table === "roadmap_items") {
      itemsCall += 1;
      if (itemsCall === 1) {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: item, error: item ? null : { message: "x" } }) }) }) } as never;
      }
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { vote_count: refreshedCount }, error: null }) }) }) } as never;
    }
    if (table === "roadmap_votes") {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existingVote ? { roadmap_item_id: item?.id } : null }) }) }) }),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        insert: async () => ({ error: null }),
      } as never;
    }
    throw new Error(`unmocked table ${table}`);
  });

  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from,
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/roadmap/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/roadmap/vote", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 401 when unauthed", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ user: null }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on bad body", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock());
    const res = await POST(makeRequest({ itemId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on complete item", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ item: { id: "00000000-0000-0000-0000-000000000001", status: "complete", vote_count: 5 } }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Voting closed for shipped features" });
  });

  it("inserts a vote when none exists", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ existingVote: false, refreshedCount: 1 }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ voted: true, vote_count: 1 });
  });

  it("deletes a vote when one exists", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ existingVote: true, refreshedCount: 0 }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ voted: false, vote_count: 0 });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx jest __tests__/api/roadmap/vote.test.ts`
Expected: all green.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`. Log in (magic link) as a user. Visit `/roadmap`:
- Click 👍 on a non-complete card → count increments, button becomes filled/pressed.
- Click again → count decrements, button returns to unpressed.
- Try complete card → no button shown (OK).
- Open DevTools Network tab; confirm POST to `/api/roadmap/vote` returns 200.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/roadmap/vote __tests__/api/roadmap/vote.test.ts
git commit -m "feat(roadmap): authed vote toggle API"
```

---

## Task 6: Feature request form + submit API

**Files:**
- Create: `src/emails/feature-request.tsx`
- Create: `src/app/api/roadmap/submit/route.ts`
- Create: `src/components/roadmap/request-form.tsx`
- Create: `__tests__/api/roadmap/submit.test.ts`
- Modify: `src/app/roadmap/page.tsx` (add request section at bottom)
- Modify: `.env.example` (add `ADMIN_NOTIFICATION_EMAIL`)

- [ ] **Step 1: Add env var**

Append to `.env.example`:
```
# Roadmap feature requests are emailed here
ADMIN_NOTIFICATION_EMAIL=mwong@energy-solution.com
```

And set it in your local `.env.local` / Vercel environment.

- [ ] **Step 2: React Email template**

`src/emails/feature-request.tsx`:
```tsx
import { Html, Body, Heading, Text, Container, Preview } from "@react-email/components";

type Props = { userEmail: string; userId: string; description: string };

export function FeatureRequestEmail({ userEmail, userId, description }: Props) {
  return (
    <Html>
      <Preview>New feature request from {userEmail}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "8px" }}>
          <Heading as="h1">New feature request</Heading>
          <Text><strong>From:</strong> {userEmail}</Text>
          <Text><strong>User ID:</strong> {userId}</Text>
          <Heading as="h2" style={{ fontSize: "18px", marginTop: "24px" }}>Request</Heading>
          <Text style={{ whiteSpace: "pre-wrap" }}>{description}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Implement the route**

`src/app/api/roadmap/submit/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";
import { SubmitBodySchema } from "@/lib/roadmap/types";
import { FeatureRequestEmail } from "@/emails/feature-request";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = SubmitBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Description must be 10–2000 characters" }, { status: 400 });
  }

  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    console.error("[roadmap/submit] ADMIN_NOTIFICATION_EMAIL not set");
    return NextResponse.json({ error: "Feature not configured" }, { status: 500 });
  }

  const { error } = await sendEmail({
    to,
    subject: `Feature request from ${user.email}`,
    react: FeatureRequestEmail({
      userEmail: user.email,
      userId: user.id,
      description: parsed.data.description,
    }),
  });

  if (error) return NextResponse.json({ error: "Couldn't send — try again" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Write tests**

`__tests__/api/roadmap/submit.test.ts`:
```ts
/**
 * @jest-environment node
 */
import { POST } from "@/app/api/roadmap/submit/route";

jest.mock("@/lib/supabase/server");
jest.mock("@/lib/resend");

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/roadmap/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/roadmap/submit", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
    (sendEmail as jest.Mock).mockResolvedValue({ id: "msg-1", error: null });
  });

  it("401 when unauthed", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await POST(makeReq({ description: "a".repeat(20) }));
    expect(res.status).toBe(401);
  });

  it("400 when description too short", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    const res = await POST(makeReq({ description: "hi" }));
    expect(res.status).toBe(400);
  });

  it("sends email with user context on happy path", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    const res = await POST(makeReq({ description: "a".repeat(20) }));
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(call.to).toBe("admin@example.com");
    expect(call.subject).toContain("u@x.com");
  });

  it("500 when Resend errors", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    (sendEmail as jest.Mock).mockResolvedValue({ id: null, error: "boom" });
    const res = await POST(makeReq({ description: "a".repeat(20) }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx jest __tests__/api/roadmap/submit.test.ts`
Expected: green.

- [ ] **Step 6: Build the form (client component)**

`src/components/roadmap/request-form.tsx`:
```tsx
"use client";

import { useState } from "react";

export function RequestForm() {
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setState("error");
      setErrorMsg("Please describe your request in at least 10 characters.");
      return;
    }
    setState("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/roadmap/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't submit");
      }
      setState("sent");
      setDescription("");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Couldn't submit");
    }
  }

  if (state === "sent") {
    return <p className="mt-2 text-green-700">Thanks — your request is in. I read every one.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="What would you like to see?"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
      {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Mount the section on `/roadmap`**

At the bottom of `src/app/roadmap/page.tsx`, below the section loop, add:

```tsx
      <section className="mt-14 border-t pt-8">
        <h2 className="font-sans text-xl font-bold text-gray-900">Don&apos;t see what you want?</h2>
        {user ? (
          <>
            <p className="mt-1 text-gray-600">Send me a note — I read every request.</p>
            <RequestForm />
          </>
        ) : (
          <p className="mt-1 text-gray-600">
            <a href="/auth/login?next=/roadmap" className="text-blue-600 underline">Log in</a> to request a feature.
          </p>
        )}
      </section>
```

Import `RequestForm` at the top of the file.

- [ ] **Step 8: Manual smoke test**

Log in, visit `/roadmap`, scroll to the section, type >10 chars, submit. Confirm the admin email arrives (check Resend dashboard or inbox).

- [ ] **Step 9: Commit**

```bash
git add src/app/api/roadmap/submit src/components/roadmap/request-form.tsx src/emails/feature-request.tsx src/app/roadmap/page.tsx __tests__/api/roadmap/submit.test.ts .env.example
git commit -m "feat(roadmap): authed feature-request form emails admin via Resend"
```

---

## Task 7: Admin API routes

**Files:**
- Create: `src/lib/roadmap/admin-guard.ts`
- Create: `src/app/api/admin/roadmap/route.ts`
- Create: `src/app/api/admin/roadmap/[id]/route.ts`
- Create: `__tests__/api/admin/roadmap.test.ts`

- [ ] **Step 1: Admin guard helper**

`src/lib/roadmap/admin-guard.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

/** Checks that the current request is from an authed admin user. */
export async function requireAdmin(supabase: SupabaseClient): Promise<AdminCheck> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, userId: user.id };
}
```

- [ ] **Step 2: Create + list route**

`src/app/api/admin/roadmap/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/roadmap/admin-guard";
import { AdminCreateSchema } from "@/lib/roadmap/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const check = await requireAdmin(supabase);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json().catch(() => null);
  const parsed = AdminCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("roadmap_items")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
```

- [ ] **Step 3: Update + delete route**

`src/app/api/admin/roadmap/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/roadmap/admin-guard";
import { AdminPatchSchema } from "@/lib/roadmap/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const check = await requireAdmin(supabase);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AdminPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = createAdminClient();

  // Build the update object. If the new status is 'complete', stamp shipped_at.
  // If transitioning away from 'complete', clear it. Handling the "clear on
  // transition away" case requires knowing the current status, so fetch it first.
  let current: { status: string } | null = null;
  if (parsed.data.status) {
    const { data } = await admin.from("roadmap_items").select("status").eq("id", id).single();
    current = data;
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "complete") update.shipped_at = new Date().toISOString();
  else if (current?.status === "complete" && parsed.data.status && parsed.data.status !== "complete") {
    update.shipped_at = null;
  }

  const { data, error } = await admin
    .from("roadmap_items")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const check = await requireAdmin(supabase);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("roadmap_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Write tests**

`__tests__/api/admin/roadmap.test.ts`:
```ts
/**
 * @jest-environment node
 */
import { POST } from "@/app/api/admin/roadmap/route";
import { PATCH, DELETE } from "@/app/api/admin/roadmap/[id]/route";

jest.mock("@/lib/supabase/server");
jest.mock("@/lib/supabase/admin");
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function serverMock({ user, isAdmin }: { user: { id: string } | null; isAdmin?: boolean }) {
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: user ? { is_admin: isAdmin ?? false } : null }) }) }),
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  };
}

function adminMock({
  insertError = null,
  currentStatus,
  updateError = null,
  deleteError = null,
  returned = { id: "i1", status: "backlog" },
}: {
  insertError?: unknown;
  currentStatus?: string;
  updateError?: unknown;
  deleteError?: unknown;
  returned?: unknown;
} = {}) {
  return {
    from: (_table: string) => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: returned, error: insertError }) }) }),
      select: () => ({ eq: () => ({ single: async () => ({ data: currentStatus ? { status: currentStatus } : null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: returned, error: updateError }) }) }) }),
      delete: () => ({ eq: async () => ({ error: deleteError }) }),
    }),
  };
}

const makeReq = (body?: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });

const ctx = { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) };

describe("admin roadmap routes", () => {
  beforeEach(() => jest.resetAllMocks());

  describe("POST /api/admin/roadmap", () => {
    it("401 when unauthed", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: null }));
      const res = await POST(makeReq({ title: "X" }));
      expect(res.status).toBe(401);
    });

    it("403 when not admin", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: false }));
      const res = await POST(makeReq({ title: "X" }));
      expect(res.status).toBe(403);
    });

    it("400 on bad body", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      (createAdminClient as jest.Mock).mockReturnValue(adminMock());
      const res = await POST(makeReq({ title: "" }));
      expect(res.status).toBe(400);
    });

    it("201 on happy path", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      (createAdminClient as jest.Mock).mockReturnValue(adminMock({ returned: { id: "i1", title: "X" } }));
      const res = await POST(makeReq({ title: "New idea", status: "backlog" }));
      expect(res.status).toBe(201);
    });
  });

  describe("PATCH /api/admin/roadmap/[id]", () => {
    it("sets shipped_at when transitioning to complete", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      const update = jest.fn().mockImplementation((u: Record<string, unknown>) => {
        expect(u.status).toBe("complete");
        expect(typeof u.shipped_at).toBe("string");
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: "i1", status: "complete" }, error: null }) }) }) };
      });
      (createAdminClient as jest.Mock).mockReturnValue({
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: { status: "in_progress" } }) }) }),
          update,
        }),
      });
      const res = await PATCH(makeReq({ status: "complete" }), ctx);
      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledTimes(1);
    });

    it("clears shipped_at when transitioning away from complete", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      const update = jest.fn().mockImplementation((u: Record<string, unknown>) => {
        expect(u.status).toBe("backlog");
        expect(u.shipped_at).toBeNull();
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: "i1", status: "backlog" }, error: null }) }) }) };
      });
      (createAdminClient as jest.Mock).mockReturnValue({
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: { status: "complete" } }) }) }),
          update,
        }),
      });
      const res = await PATCH(makeReq({ status: "backlog" }), ctx);
      expect(res.status).toBe(200);
    });

    it("403 when not admin", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: false }));
      const res = await PATCH(makeReq({ title: "new" }), ctx);
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/admin/roadmap/[id]", () => {
    it("200 on happy path", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      (createAdminClient as jest.Mock).mockReturnValue(adminMock());
      const res = await DELETE(makeReq(), ctx);
      expect(res.status).toBe(200);
    });

    it("403 when not admin", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: false }));
      const res = await DELETE(makeReq(), ctx);
      expect(res.status).toBe(403);
    });
  });
});
```

- [ ] **Step 5: Run**

Run: `npx jest __tests__/api/admin/roadmap.test.ts`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/roadmap/admin-guard.ts src/app/api/admin/roadmap __tests__/api/admin/roadmap.test.ts
git commit -m "feat(roadmap): admin API routes for create/update/delete"
```

---

## Task 8: Admin page `/dashboard/admin/roadmap`

**Files:**
- Create: `src/app/dashboard/admin/roadmap/page.tsx`
- Create: `src/components/roadmap/admin-table.tsx`

- [ ] **Step 1: Page (server component, guards admin)**

`src/app/dashboard/admin/roadmap/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTable } from "@/components/roadmap/admin-table";
import type { RoadmapItem } from "@/lib/roadmap/types";

export const dynamic = "force-dynamic";

export default async function AdminRoadmapPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/admin/roadmap");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  const { data: itemsData } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (itemsData ?? []) as RoadmapItem[];

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-sans text-3xl font-bold text-gray-900">Roadmap admin</h1>
      <p className="mt-1 text-gray-600">Add, edit, and change the status of roadmap items.</p>
      <AdminTable initialItems={items} />
    </main>
  );
}
```

- [ ] **Step 2: Admin table (client component)**

`src/components/roadmap/admin-table.tsx`:
```tsx
"use client";

import { useState } from "react";
import type { RoadmapItem, RoadmapStatus } from "@/lib/roadmap/types";
import { ROADMAP_STATUSES, STATUS_LABELS } from "@/lib/roadmap/types";

export function AdminTable({ initialItems }: { initialItems: RoadmapItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roadmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDescription || null, status: "backlog" }),
      });
      if (!res.ok) throw new Error("create failed");
      const { item } = (await res.json()) as { item: RoadmapItem };
      setItems([item, ...items]);
      setNewTitle("");
      setNewDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: RoadmapStatus) {
    const prev = items;
    setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));
    const res = await fetch(`/api/admin/roadmap/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setItems(prev);
    else {
      const { item } = (await res.json()) as { item: RoadmapItem };
      setItems((cur) => cur.map((i) => (i.id === id ? item : i)));
    }
  }

  async function updateContent(id: string, patch: { title?: string; description?: string | null }) {
    const res = await fetch(`/api/admin/roadmap/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { item } = (await res.json()) as { item: RoadmapItem };
      setItems((cur) => cur.map((i) => (i.id === id ? item : i)));
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item? Votes are also deleted.")) return;
    const res = await fetch(`/api/admin/roadmap/${id}`, { method: "DELETE" });
    if (res.ok) setItems(items.filter((i) => i.id !== id));
  }

  return (
    <div className="mt-6">
      <form onSubmit={createItem} className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-sans font-bold">Add feature</h2>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 border border-gray-300 rounded"
          required
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Markdown description (optional)"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </form>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b">
            <th className="py-2">Title</th>
            <th>Status</th>
            <th>Votes</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <AdminRow
              key={item.id}
              item={item}
              onStatusChange={(s) => updateStatus(item.id, s)}
              onEdit={(patch) => updateContent(item.id, patch)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminRow({
  item,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  item: RoadmapItem;
  onStatusChange: (s: RoadmapStatus) => void;
  onEdit: (patch: { title?: string; description?: string | null }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");

  return (
    <tr className="border-b align-top">
      <td className="py-3 pr-3">
        {editing ? (
          <div className="space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-2 py-1 border rounded" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-2 py-1 border rounded font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => {
                onEdit({ title, description: description || null });
                setEditing(false);
              }}
              className="text-blue-600 text-sm"
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="ml-3 text-gray-500 text-sm">
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <div className="font-medium">{item.title}</div>
            {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <select
          value={item.status}
          onChange={(e) => onStatusChange(e.target.value as RoadmapStatus)}
          className="px-2 py-1 border rounded"
        >
          {ROADMAP_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-3 text-sm">{item.vote_count}</td>
      <td className="py-3 pr-3 text-sm text-gray-500">
        {new Date(item.created_at).toLocaleDateString()}
      </td>
      <td className="py-3 text-sm whitespace-nowrap">
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-blue-600 mr-3">Edit</button>
        )}
        <button type="button" onClick={onDelete} className="text-red-600">Delete</button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 3: Manual smoke test**

1. Ensure your user has `is_admin = true` (from Task 1 Step 4).
2. Log in as you, visit `/dashboard/admin/roadmap`. Expect the admin table.
3. Add an item → see it at the top.
4. Change status via dropdown → confirm it persists on reload.
5. Change status to `complete` → check Studio: `shipped_at` populated.
6. Change status back to `backlog` → `shipped_at` should be `NULL`.
7. Visit `/dashboard/admin/roadmap` as a non-admin test user → expect redirect to `/dashboard`.
8. Delete an item → confirm votes are cleaned up (re-query `roadmap_votes` in Studio).

- [ ] **Step 4: Typecheck + build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin src/components/roadmap/admin-table.tsx
git commit -m "feat(roadmap): admin page at /dashboard/admin/roadmap"
```

---

## Task 9: Navigation entry + final polish

**Files:**
- Modify: `src/components/footer.tsx`
- Modify: `src/components/nav/standard-nav.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Add `/roadmap` link to the footer**

Open `src/components/footer.tsx` and add a link to `/roadmap` next to privacy/terms, styled consistently.

- [ ] **Step 2: Add `/roadmap` to the nav's product/resource section**

Open `src/components/nav/standard-nav.tsx` and add a `/roadmap` `<Link>` alongside the existing blog/pricing links in both the desktop and mobile link lists.

Also check `src/components/nav/sticky-nav.tsx` — if it has its own link list, add `/roadmap` there too so both navs stay in sync.

- [ ] **Step 3: Add `/roadmap` to the sitemap**

Open `src/app/sitemap.ts`, add an entry for `/roadmap` with `changeFrequency: "weekly"` and a moderate priority.

- [ ] **Step 4: Manual smoke test**

Reload the homepage — confirm `/roadmap` links appear in the nav and footer. Visit `/sitemap.xml` — confirm `/roadmap` is listed.

- [ ] **Step 5: Run the full test suite**

Run: `npx jest`
Expected: all tests pass.

- [ ] **Step 6: Typecheck + build**

Run: `npm run build`
Expected: success, no new TS or ESLint errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/footer.tsx src/components/nav/standard-nav.tsx src/app/sitemap.ts
git commit -m "feat(roadmap): link roadmap from nav, footer, and sitemap"
```

---

## Verification checklist (before merging)

- [ ] `npx jest` → all green.
- [ ] `npm run build` → clean.
- [ ] `/roadmap` loads logged-out: four sections render, each 👍 links to `/auth/login?next=/roadmap`.
- [ ] After login via `?next=/roadmap`, you land back on `/roadmap`.
- [ ] Clicking 👍 when logged in toggles vote + count; double-click doesn't double-count.
- [ ] `/roadmap` complete items show `✓ Shipped · N votes` with no button.
- [ ] Submitting a feature request emails `ADMIN_NOTIFICATION_EMAIL`.
- [ ] `/dashboard/admin/roadmap` loads for admin; non-admin gets redirected to `/dashboard`.
- [ ] PATCHing an item to `complete` stamps `shipped_at`; moving away clears it.
- [ ] `supabase/migrations/007_roadmap.sql` replayable from scratch via `supabase db reset`.
