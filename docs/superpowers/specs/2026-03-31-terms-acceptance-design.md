# Terms Acceptance Interstitial

**Date:** 2026-03-31
**Status:** Approved

---

## Goal

Require new users to explicitly accept the Terms of Use before accessing the dashboard. Existing users are grandfathered in. Acceptance is timestamped and stored in the database.

---

## Data Layer

Add `terms_accepted_at TIMESTAMPTZ NULL` to the `profiles` table.

Migration behavior:
- All existing rows: set `terms_accepted_at = NOW()` so current users are never shown the gate
- New users: `terms_accepted_at` remains `NULL` until they accept

No other schema changes required.

---

## User Flow

1. User receives magic link, clicks it
2. `/auth/callback` exchanges the code and redirects to `/dashboard`
3. Dashboard `layout.tsx` fetches the user's profile and checks `terms_accepted_at`
4. If `NULL` → redirect to `/auth/accept-terms`
5. User reads the terms and clicks "I Agree"
6. Server action sets `terms_accepted_at = NOW()` on the profile row
7. Redirect to `/dashboard`
8. Dashboard layout check passes — user proceeds normally

---

## Interception Point

The check lives in `src/app/dashboard/layout.tsx`. The layout already creates a Supabase client and calls `supabase.auth.getUser()`. Reuse that same `supabase` instance — do not create a second client. After the existing auth check, add:

```ts
const { data: profile } = await supabase
  .from("profiles")
  .select("terms_accepted_at")
  .eq("user_id", user.id)
  .single();

if (!profile || !profile.terms_accepted_at) {
  redirect("/auth/accept-terms");
}
```

The `user_id` column is the foreign key on the `profiles` table (not `id`). If the profile row does not exist yet (null result), treat it the same as unaccepted and redirect to the gate.

`/auth/accept-terms` is outside the dashboard route group so it is not itself subject to this check — no redirect loop.

---

## Acceptance Page — `/auth/accept-terms`

This is an **async server component**. Auth is checked at render time using the Supabase server client (`@/lib/supabase/server`). If the user is not authenticated, call `redirect("/auth/login")` before rendering.

### Layout
- No StandardNav, no Footer
- Centered single-column layout, max-width 560px
- White background, full viewport height

### Content (top to bottom)
1. **Wordmark** — "Taylor Resumé" in Inter, same style as the nav logo
2. **Heading** — "Before you get started" (Inter, 24px, bold)
3. **Subtext** — "Please review and accept our Terms of Use to continue." (Georgia, 16px, gray-600)
4. **Scrollable terms box** — fixed height (~320px), overflow-y scroll, border border-gray-200, rounded, p-4, renders the full Terms of Use markdown (same source file as `/terms`)
5. **"I Agree" button** — full-width, solid black (`bg-[#1a1a1a]`), Inter, uppercase tracking, white text, inside a `<form>` that POSTs to the server action
6. **Fine print** — "By clicking I Agree, you confirm you are at least 16 years old and accept our [Terms of Use](/terms) and [Privacy Policy](/privacy)." (Inter, 11px, gray-400, centered)

### Server Action

The server action lives in a **separate file**: `src/app/auth/accept-terms/actions.ts`. Using a dedicated file allows `"use server"` as a file-level directive without conflicting with the server component in `page.tsx`.

The action uses `update` (not `upsert`) because the auth trigger in `001_initial_schema.sql` guarantees a profile row exists for every authenticated user. Upsert is unnecessary and risks clobbering other profile columns on the insert path.

The action:
1. Creates a Supabase server client
2. Gets the authenticated user — if none, calls `redirect("/auth/login")`. Note: because `redirect()` throws, TypeScript will narrow `user` to non-null after this call at runtime; no further null check is needed.
3. Updates `profiles` set `terms_accepted_at = NOW()` where `user_id = user.id`
4. Calls `redirect("/dashboard")` **outside any try/catch block** — Next.js `redirect()` throws internally and must not be caught

```ts
// src/app/auth/accept-terms/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptTerms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("user_id", user.id);

  redirect("/dashboard");
}
```

`page.tsx` imports and passes `acceptTerms` as the form's `action` prop:
```tsx
import { acceptTerms } from "./actions";
// ...
<form action={acceptTerms}>
  <button type="submit">I Agree</button>
</form>
```

This works with or without JavaScript (progressive enhancement) and requires no client component boundary.

### RLS

No new RLS policies are needed. The existing `"Users read own profile"` (SELECT) and `"Users update own profile"` (UPDATE) policies in `001_initial_schema.sql` already cover both the layout check query and the server action update.

---

## Existing Users

All existing `profiles` rows receive `terms_accepted_at = NOW()` in the migration. They will never see the acceptance page.

---

## Files Changed

| File | Action |
|---|---|
| `supabase/migrations/[timestamp]_add_terms_accepted_at.sql` | New — adds column, backfills existing rows |
| `src/app/dashboard/layout.tsx` | Add profile query + `terms_accepted_at` check after auth check |
| `src/app/auth/accept-terms/page.tsx` | New — async server component, renders form with `acceptTerms` action |
| `src/app/auth/accept-terms/actions.ts` | New — `"use server"` file containing the `acceptTerms` server action |

---

## Out of Scope

- Re-acceptance when terms are updated (future feature)
- Email notification of terms updates
- A "Decline" flow — users who do not accept simply close the browser
- Any changes to the `/terms` page itself
