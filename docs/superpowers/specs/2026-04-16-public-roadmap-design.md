# Public Roadmap Design Spec

## Overview

A public product roadmap at `/roadmap` where visitors can see planned, in-progress, and shipped features. Logged-in users can cast a single toggle vote (👍) per item to prioritize what gets built next. The admin (identified by `profiles.is_admin = true`) manages items through a dashboard page; new feature requests come in by email, not through a public submission form, to prevent spam.

## Goals

- Let the public see what's coming and what's shipped, without needing an account.
- Let signed-in users signal demand via a single-click toggle vote.
- Give the admin a low-friction UI to add items and change status.
- Reuse existing infrastructure (Supabase auth, `profiles.is_admin`, Resend) rather than adding new services.
- Use the 👍 interaction as a signup prompt for anonymous visitors.

## Non-goals

- Public feature submission forms. Requests come in via an authed form that emails the admin — no open write path to the item list.
- Downvoting, comments, or threaded discussion. Items have a title, a description, and a count.
- Per-user "hide this" / personalization.
- Category tags, filters, or per-item target quarters.
- Manual sort ordering. Items within a section sort by votes, ties broken by creation date.
- A full CMS. The admin UI is a table with inline edits, nothing more.

## User flows

### Logged-out visitor on `/roadmap`
1. Lands on `/roadmap` from SEO, blog, or direct link.
2. Sees four sections stacked vertically: **In Progress → Planned → Backlog → Complete**. Empty sections are hidden.
3. Each card shows title, markdown-rendered description, and a 👍 button with the current vote count.
4. Clicking any 👍 button redirects to `/login?next=/roadmap`.
5. After login, the user lands back on `/roadmap` and can click 👍 to record the vote.

### Logged-in user on `/roadmap`
1. Page renders the same four sections, but the current user's existing votes are marked (filled-in 👍).
2. Clicking 👍 toggles their vote: adds if absent, removes if present. UI updates optimistically and reconciles on the API response.
3. Complete items show a `✓ Shipped · N votes` badge instead of a button — no new votes accepted.
4. Below the list is a "Request a feature" section with a textarea and submit button. Submitting emails the admin and clears the textarea.

### Admin (`profiles.is_admin = true`) on `/dashboard/admin/roadmap`
1. Navigates to the admin page. Non-admins are redirected to `/dashboard`.
2. Sees a table of every roadmap item with columns: title, status, votes, created_at, actions.
3. Can add a new item (title + markdown description), edit title/description, change status via inline `<select>`, or delete with confirmation.
4. Changing status to `complete` automatically stamps `shipped_at` server-side; changing away clears it.

## Architecture

```
Public (anon or authed) ──► GET /roadmap  (SSR)
  │
  ├─► Read roadmap_items grouped by status (vote_count DESC, created_at ASC)
  └─► If session: read current user's roadmap_votes

Authed user clicks 👍 ──► POST /api/roadmap/vote  { itemId }
  │
  ├─► Check item.status != 'complete'
  ├─► Toggle row in roadmap_votes (INSERT if absent, DELETE if present)
  └─► Trigger updates roadmap_items.vote_count

Authed user submits request ──► POST /api/roadmap/submit  { description }
  │
  ├─► Validate description length (10–2000 chars)
  └─► Resend → email to mwong@energy-solution.com with user.email + description

Admin ──► /dashboard/admin/roadmap
  │
  └─► Create / update / delete via
      POST   /api/admin/roadmap
      PATCH  /api/admin/roadmap/[id]
      DELETE /api/admin/roadmap/[id]
```

Three pages, five API routes, two new tables, one DB trigger. No new external services.

## Data model

Migration: `supabase/migrations/007_roadmap.sql`

```sql
CREATE TYPE roadmap_status AS ENUM ('backlog', 'planned', 'in_progress', 'complete');

CREATE TABLE roadmap_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,                                 -- markdown, optional
  status      roadmap_status NOT NULL DEFAULT 'backlog',
  vote_count  INTEGER NOT NULL DEFAULT 0,           -- denormalized, maintained by trigger
  shipped_at  TIMESTAMPTZ,                          -- set when status becomes 'complete'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roadmap_votes (
  roadmap_item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (roadmap_item_id, user_id)
);

CREATE INDEX idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX idx_roadmap_votes_user   ON roadmap_votes(user_id);

-- Keep vote_count in sync so the public page does one query, not N
CREATE FUNCTION update_roadmap_vote_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE roadmap_items SET vote_count = vote_count + 1 WHERE id = NEW.roadmap_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE roadmap_items SET vote_count = vote_count - 1 WHERE id = OLD.roadmap_item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_vote_count_trigger
AFTER INSERT OR DELETE ON roadmap_votes
FOR EACH ROW EXECUTE FUNCTION update_roadmap_vote_count();
```

Design choices:
- **Denormalized `vote_count`**: avoids N+1 count queries on every page load. The trigger runs inside the same transaction as the vote write, so the count is always consistent with the underlying rows.
- **Composite PK** on `roadmap_votes(roadmap_item_id, user_id)`: enforces one-vote-per-user at the DB level. A race on double-click produces a constraint violation, not a duplicate row.
- **`shipped_at`**: populated by the PATCH handler when status transitions to `complete`, so the shipped badge can show a date. Cleared if an item is moved back out of `complete`.
- **No manual sort column**: sort order is always `(vote_count DESC, created_at ASC)`. If manual reordering is ever needed, add a `sort_order INTEGER` column and a nullable comparator — out of scope for v1.

## Row-level security

```sql
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_votes ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authed) can read items.
CREATE POLICY "roadmap_items public read"
  ON roadmap_items FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies on roadmap_items: admin mutations go through
-- API routes using the admin (service role) client, which bypasses RLS.
-- The API route explicitly checks profiles.is_admin before mutating.

-- A user can only see, insert, or delete their own vote rows.
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

Security model:
- **Public reads** of items are open; that's the point of a public roadmap.
- **Vote writes** are scoped to `auth.uid() = user_id` at the DB level. Even if the API route had a bug, a user could not vote as someone else.
- **Item writes** have no RLS policy — they're impossible over the public client. Admin mutations route through the admin client with an explicit `profiles.is_admin` check.
- **Vote counts** are derived by the trigger; no user can manipulate them directly.

## Pages and routes

### `/roadmap` (server component, public)

1. Query `roadmap_items` ordered by `(status, vote_count DESC, created_at ASC)`.
2. If a session exists, query that user's `roadmap_votes` (just the `roadmap_item_id` list) so the UI can mark voted cards.
3. Group items in memory into four buckets; render in order: **In Progress → Planned → Backlog → Complete**. Hide empty sections.
4. Each card renders a `RoadmapCard` client component:
   - **Logged in, not complete**: active 👍 button. Toggles optimistically (count ±1, filled-in state swaps), POSTs to `/api/roadmap/vote`, reconciles on response, rolls back on error.
   - **Logged out**: the 👍 slot is an anchor to `/login?next=/roadmap` styled like the button. No client state.
   - **Complete**: no button. `✓ Shipped · {vote_count} votes` badge with `shipped_at` date.
5. Below the list, a "Request a feature" section:
   - **Logged in**: textarea + submit → `/api/roadmap/submit`.
   - **Logged out**: "Log in to request a feature" link to `/login?next=/roadmap`.

### `/dashboard/admin/roadmap` (admin only)

- Page-level guard: read session → load profile → if `!is_admin`, `redirect('/dashboard')`. No middleware change.
- Table of every item (title, status, votes, created_at, actions).
- "Add feature" button → inline form (title input + markdown textarea) → POST `/api/admin/roadmap`.
- Per-row status `<select>` — changes immediately via PATCH.
- "Edit" → inline or modal form → PATCH for title/description.
- "Delete" → confirm dialog → DELETE.

### API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/roadmap/vote` | POST | authed | body `{ itemId }`; toggles current user's vote; rejects if item status is `complete` |
| `/api/roadmap/submit` | POST | authed | body `{ description }`; emails request to `mwong@energy-solution.com` via Resend |
| `/api/admin/roadmap` | POST | admin | create item |
| `/api/admin/roadmap/[id]` | PATCH | admin | update title / description / status; sets or clears `shipped_at` on status transitions |
| `/api/admin/roadmap/[id]` | DELETE | admin | delete item |

Every admin route performs the same check before mutating:
1. Read session from the server-side Supabase client.
2. Load `profiles.is_admin` for that user.
3. If false (or no session), return 403.
4. Only then use the admin client to mutate.

## Error handling & edge cases

- **Vote on complete item.** `/api/roadmap/vote` returns 400 `{ error: "Voting closed for shipped features" }`. The UI doesn't surface the button on complete cards, so this is defense-in-depth.
- **Double-click race.** Composite PK on `roadmap_votes` means the second INSERT fails with a constraint violation. The handler catches and re-reads state; the UI reconciles.
- **User deletes account.** `ON DELETE CASCADE` on both FKs removes votes; the trigger decrements counts on each deletion. No orphans.
- **Admin deletes an item with votes.** `ON DELETE CASCADE` removes votes; trigger decrements. N update statements at delete time, which is fine at this scale.
- **Status transition to `complete`.** PATCH handler sets `shipped_at = NOW()` when transitioning into `complete`, clears it when transitioning out. Done in the same `UPDATE` statement.
- **Empty or abusive feature submission.** API validates `description` is 10–2000 chars before calling Resend. No rate limiter in v1 — the route is gated behind login, so abuse requires a real account.
- **Resend failure on submission.** Returns 500 with a generic message; UI shows a toast "Couldn't submit — try again." No server-side retry.
- **Admin-only UI bypassed via direct API call.** Every admin route re-checks `is_admin`. Page-level redirect is UX, not security.
- **Markdown XSS on descriptions.** Descriptions are admin-only input (low risk), but render via a sanitizing markdown pipeline (reuse whatever the blog system uses under `src/app/blog`). No raw HTML pass-through.
- **Concurrent admin edits.** Unlikely (single admin), but PATCH is last-write-wins. No version column.

## Testing

- **DB trigger:** insert a vote → assert `vote_count = 1`; delete → assert `0`. Cover the denormalized count.
- **RLS:** user A cannot delete user B's vote; anon cannot insert a vote. Use the existing Supabase test harness.
- **`/api/roadmap/vote`:** authed happy path (add, then remove); 400 on complete item; 401 when unauthed.
- **`/api/roadmap/submit`:** mocks Resend, asserts called with correct `to:`, subject including the user's email, and body containing the description; rejects empty / too-long.
- **Admin API routes:** non-admin user → 403; admin user can create/PATCH/DELETE; PATCH to `complete` sets `shipped_at`; PATCH away from `complete` clears it.
- **Page rendering:** snapshot of `/roadmap` with mixed statuses including an empty section; snapshot of admin page.
- Skip E2E for v1 unless the codebase already has a Playwright/Cypress harness to extend.

## Open questions for implementation

- **Markdown renderer.** The blog system likely uses `react-markdown` or MDX — the implementation plan should pick whichever is already installed and reuse its sanitization config. No new markdown dependency.
- **Optimistic-update library.** Stock `useState` + `useTransition` is fine; no SWR/React Query needed for this one route.
- **Post-login "you're back" banner.** Nice-to-have UX polish mentioned in flows; skip in v1 if it complicates login redirect handling.
