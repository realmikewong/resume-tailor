# Pricing Page Redesign

**Date:** 2026-03-27
**Status:** Approved

---

## Goal

Replace the current resume-metaphor pricing page with a clean, standalone pricing page that uses the Taylor Resumé brand (Inter + Georgia) but reads as a conventional pricing layout. The page communicates value clearly — especially the volume of resumés/cover letters per plan — and is honest about the monthly reset policy.

---

## Product Changes (not just visual)

- **Free tier increases from 5 to 10 credits.** This is intentional.
- **Credit Pack tier is retired from the public pricing page.** It will be available in the account dashboard for users who want to top up (placeholder: 10 credits for $2.00 one-time). It does not appear on `/pricing`.
- **Pro and Ultimate are new subscription plans replacing the old "Monthly" tier.** New Stripe products will need to be created separately.

---

## Plans

| Plan | Price | Volume | Cost per pair | CTA Label | Notes |
|------|-------|--------|---------------|-----------|-------|
| Free | $0 | 10 | — | "Get Started Free" | No credit card required |
| Pro | $7.99/mo | 60/mo | ~$0.13 | "Get Pro" | Cancel anytime |
| Ultimate | $19.99/mo | 300/mo | ~$0.07 | "Get Ultimate" | Cancel anytime · Best Value badge |

All plans include: ATS score checker, Word (.docx) download, PDF download, Job status tracker.

---

## Page Structure

### Metadata
```tsx
export const metadata: Metadata = {
  title: "Pricing | Taylor Resumé",
  description: "Honest pricing for job seekers. Start free — no credit card required.",
};
```

### Header block
- Eyebrow: "Pricing" (Inter, 11px, uppercase, letter-spaced, `text-gray-500`)
- Headline: "Honest pricing for honest job seekers." (Inter, 32px, bold)
- Subheadline: "Job searching is expensive enough. We keep our prices in check so you can focus on landing the role, not watching the meter." (Georgia / `font-serif`, 16px, `text-gray-600`, max-width 520px)

### Pricing grid

Three-column grid on desktop, single column on mobile (`grid-cols-1 md:grid-cols-3`).

**Implementation:** The grid wrapper has `gap-0 bg-gray-200` and a `border border-gray-200`. Each card has `bg-white` — the gray background between zero-gap cards creates the 1px divider effect. No individual card borders needed.

Each card has `p-8` internal padding.

Each card structure (top to bottom):

1. **Badge row** — `<span>` with "Best Value" text for Ultimate, styled as solid black pill. All other cards get an empty `<div className="h-[22px]">` spacer to keep cards vertically aligned. The spacer is retained on mobile (it becomes invisible padding, no harm).
   - Badge styles: `inline-block font-sans text-[10px] font-bold tracking-[1.5px] uppercase bg-[#1a1a1a] text-white px-2 py-0.5`

2. **Plan name** — `font-sans text-xs font-semibold tracking-[2px] uppercase text-gray-500`

3. **Price** — `font-sans text-4xl font-bold text-foreground`

4. **Price sub-label:**
   - Free: "no credit card required"
   - Pro/Ultimate: "/month · cancel anytime"
   - Styles: `font-sans text-sm text-gray-400 mt-1`

5. **Cost-per-pair line:**
   - Free: "Free to get started"
   - Pro: "~$0.13 per resumé + cover letter"
   - Ultimate: "~$0.07 per resumé + cover letter"
   - Styles: `font-sans text-[11px] text-gray-500 mb-6 pb-6 border-b border-gray-200`

6. **Volume number** — `font-sans text-[28px] font-bold text-foreground leading-none mb-1`
   - Values: 10, 60, 300

7. **Volume label** — "resumés + cover letters" (Free) / "resumés + cover letters / mo" (Pro/Ultimate)
   - Styles: `font-sans text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200`

8. **Feature list** — `<ul>` with 4 items:
   - ✓ ATS score checker
   - ✓ Download Word (.docx)
   - ✓ Download PDF
   - ✓ Job status tracker
   - List item styles: `font-sans text-sm text-gray-700 py-1.5 border-b border-gray-100 flex items-start gap-2` — feature list text uses **Inter** (`font-sans`), not Georgia
   - Checkmark: `font-sans text-xs text-foreground mt-0.5 shrink-0`
   - Last item: `border-b-0`
   - `flex-1` on the `<ul>` to push CTA to bottom of card

9. **CTA button** — full-width, block-level link to `/auth/login`
   - **Free (outline):** `block w-full text-center font-sans text-xs font-semibold tracking-[1.5px] uppercase border border-gray-300 text-foreground px-4 py-3 hover:border-gray-500 transition-colors mt-6`
   - **Pro / Ultimate (solid):** `block w-full text-center font-sans text-xs font-semibold tracking-[1.5px] uppercase bg-[#1a1a1a] text-white px-4 py-3 hover:bg-[#333] transition-colors mt-6`

### Ultimate card treatment
- Background: `bg-[#fafaf9]` (subtle off-white, same border behavior as other cards via the grid gap technique)
- No additional border or ring — the gap divider handles separation

### Reset policy callout
Below the grid. Left-bordered callout:
```
border-l-[3px] border-gray-300 bg-gray-50 px-5 py-4 mt-6
```
Copy — single `<p>` element:
```tsx
<p className="text-sm text-gray-500 leading-relaxed">
  <strong className="font-sans font-semibold text-gray-700">Credits reset monthly.</strong>{" "}
  Unused credits don't roll over — apply them now and keep your job search moving.
  Every plan includes the job status tracker so you can manage all your applications in one place.
</p>
```
The `<strong>` is inline within the paragraph. The rest of the sentence uses default body (Georgia via `font-serif`).

### Footer
Centered below the callout, `mt-8`:
- "Every new account starts with 10 free credits. No credit card required." — `font-sans text-sm text-gray-400`
- "Questions? hello@taylorresume.com" — `font-sans text-sm text-gray-400`

---

## Layout

The page sits inside `src/app/pricing/layout.tsx` which wraps it with StandardNav and a centered content container. No changes to the layout file.

The pricing page content should NOT have its own outer padding wrapper — the layout provides that. The pricing content starts directly with the eyebrow label.

---

## Typography

- **Inter** (`font-sans`) — all labels, prices, plan names, volume numbers, volume labels, feature list items, CTAs, callout bold text, footer
- **Georgia** (`font-serif` / default body) — subheadline, callout body sentence

Note: Feature list items use `font-sans` (Inter) for consistency with the UI label style. Georgia is reserved for the subheadline and the callout's body sentence only.

---

## Files Changed

| File | Action |
|------|--------|
| `src/app/pricing/page.tsx` | Full rewrite |
| `src/app/pricing/layout.tsx` | No change |

---

## Additional Notes

**CTA auth-awareness:** The page is a static server component. All CTAs link unconditionally to `/auth/login`. No auth-checking or conditional rendering is needed.

**Layout width:** The existing `layout.tsx` uses `max-w-4xl` (896px). Three equal-column cards at this width are intentionally compact — this is acceptable for the current design.

**Free plan volume label:** The Free card omits "/mo" from the volume label ("resumés + cover letters" not "resumés + cover letters / mo"). This is intentional — Free credits are a one-time allocation, not a monthly renewal.

**Credit Pack dashboard UI:** The current dashboard/account page shows only a credits balance. There is no Credit Pack purchase UI to remove — it was never built. The dashboard Credit Pack feature is a future task.

---

## Out of Scope

- Stripe product creation (separate manual task)
- Credit Pack purchase UI in the account dashboard (separate future task)
- Any changes to `/auth/login`, `/dashboard`, or Stripe webhook logic
