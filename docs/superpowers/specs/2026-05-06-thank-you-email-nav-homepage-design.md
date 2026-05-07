# Thank You Email — Navigation & Home Page Integration

**Date:** 2026-05-06
**Status:** Approved

## Overview

Surface the newly launched Thank You Email Generator in two places: the site navigation and the home page. Both changes follow existing patterns in the codebase.

## Navigation

**Component:** `src/components/nav/standard-nav.tsx`

Add a "Tools" dropdown to `StandardNav`. The component is already a client component with `useState`, so a second state variable (`toolsOpen: boolean`) is added.

### Desktop behavior
- "Tools" renders as a `<button>` instead of a `<Link>`
- Clicking toggles `toolsOpen`
- When open, an absolutely-positioned popover appears below the button containing two links:
  - ATS Score Checker → `/tools/ats-score`
  - Thank You Email → `/tools/thank-you-email`
- Clicking outside the popover closes it (via a `useEffect` with a `mousedown` listener or a transparent backdrop)
- Link styling matches existing flat nav links (`text-sm font-medium text-gray-600 hover:text-foreground`)

### Mobile behavior
- "Tools" renders as an expandable accordion item in the existing mobile menu
- Tapping it toggles a nested list of the same two links inline
- No popover — links expand in-place, consistent with the flat mobile menu structure

### Scope note
`StickyNav` wraps `StandardNav` and requires no changes — it automatically picks up the updated nav.

## Home Page

**Component:** `src/app/page.tsx`

Add a second resume-entry block inside the existing "Volunteer Work" section, below the ATS Score entry.

### Separator
```
<div className="border-t border-gray-200 mt-7 pt-7">
```

### Entry content
| Field | Value |
|---|---|
| Title | Post-Interview Correspondent |
| Subtitle | Community Service. Free, no sign-up required. |
| Description | Had a great interview but unsure how to follow up? Get a personalized thank you email in seconds, no account needed. |
| CTA link text | Write Your Thank You Email → |
| CTA link href | `/tools/thank-you-email` |

CTA link styling matches the existing ATS entry: `inline-block mt-3 font-sans text-sm font-medium text-blue-600 border-b border-blue-600 pb-px hover:text-blue-800 hover:border-blue-800 transition-colors`.

## Files Changed

| File | Change |
|---|---|
| `src/components/nav/standard-nav.tsx` | Add `toolsOpen` state, convert "Tools" to dropdown button, add popover (desktop) and accordion (mobile) |
| `src/app/page.tsx` | Add second entry to "Volunteer Work" section |

No new files, no new routes, no database changes.
