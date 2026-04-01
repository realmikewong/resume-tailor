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

The check lives in `src/app/dashboard/layout.tsx`, which already runs server-side and fetches the authenticated user. After the existing auth check, add:

```ts
if (!profile.terms_accepted_at) {
  redirect("/auth/accept-terms");
}
```

`/auth/accept-terms` is outside the dashboard route group so it is not itself subject to this check — no redirect loop.

---

## Acceptance Page — `/auth/accept-terms`

### Layout
- No StandardNav, no Footer
- Centered single-column layout, max-width 560px
- White background, full viewport height

### Content (top to bottom)
1. **Wordmark** — "Taylor Resumé" in Inter, same style as the nav logo
2. **Heading** — "Before you get started" (Inter, 24px, bold)
3. **Subtext** — "Please review and accept our Terms of Use to continue." (Georgia, 16px, gray-600)
4. **Scrollable terms box** — fixed height (~320px), overflow-y scroll, border border-gray-200, rounded, p-4, renders the full Terms of Use markdown (same source file as `/terms`)
5. **"I Agree" button** — full-width, solid black (`bg-[#1a1a1a]`), Inter, uppercase tracking, white text
6. **Fine print** — "By clicking I Agree, you confirm you are at least 16 years old and accept our [Terms of Use](/terms) and [Privacy Policy](/privacy)." (Inter, 11px, gray-400, centered)

### Server Action
`acceptTerms()` — a Next.js server action in the page file:
- Creates a Supabase server client
- Gets the authenticated user
- Updates `profiles` set `terms_accepted_at = NOW()` where `id = user.id`
- Calls `redirect("/dashboard")`

If the user is not authenticated, redirect to `/auth/login`.

---

## Existing Users

All existing `profiles` rows receive `terms_accepted_at = NOW()` in the migration. They will never see the acceptance page.

---

## Files Changed

| File | Action |
|---|---|
| `supabase/migrations/[timestamp]_add_terms_accepted_at.sql` | New — adds column, backfills existing rows |
| `src/app/dashboard/layout.tsx` | Add `terms_accepted_at` check after auth check |
| `src/app/auth/accept-terms/page.tsx` | New — acceptance page with server action |

---

## Out of Scope

- Re-acceptance when terms are updated (future feature)
- Email notification of terms updates
- A "Decline" flow — users who do not accept simply close the browser
- Any changes to the `/terms` page itself
