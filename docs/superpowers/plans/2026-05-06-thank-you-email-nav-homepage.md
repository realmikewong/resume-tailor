# Thank You Email — Navigation & Home Page Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tools" dropdown to the site nav and a second entry to the home page "Volunteer Work" section, surfacing the Thank You Email Generator alongside the ATS Score tool.

**Architecture:** Two focused edits — `StandardNav` gets a click-toggled dropdown (desktop) and accordion (mobile) for Tools, and the home page gets a second resume-entry block in the existing Volunteer Work section. No new files, routes, or data fetching required.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, `next/link`

---

## File Map

| File | Change |
|---|---|
| `src/components/nav/standard-nav.tsx` | Add `toolsOpen` state + `toolsRef`, click-outside `useEffect`, Tools dropdown (desktop), Tools accordion (mobile) |
| `src/app/page.tsx` | Add Thank You Email entry inside existing Volunteer Work section |

---

## Task 1: Add Tools dropdown to `StandardNav`

**Files:**
- Modify: `src/components/nav/standard-nav.tsx`

- [ ] **Step 1: Replace the file with the updated nav**

Replace the entire contents of `src/components/nav/standard-nav.tsx` with:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function StandardNav() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    if (toolsOpen) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [toolsOpen]);

  return (
    <nav className="max-w-6xl mx-auto px-8 py-4">
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="font-sans text-base font-bold text-foreground tracking-wide"
        >
          Taylor Resum&eacute;
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/blog"
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/roadmap"
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Roadmap
          </Link>

          {/* Tools dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors flex items-center gap-1"
            >
              Tools
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-gray-200 shadow-sm py-1 z-10">
                <Link
                  href="/tools/ats-score"
                  onClick={() => setToolsOpen(false)}
                  className="block px-4 py-2 font-sans text-sm text-gray-600 hover:text-foreground hover:bg-gray-50 transition-colors"
                >
                  ATS Score Checker
                </Link>
                <Link
                  href="/tools/thank-you-email"
                  onClick={() => setToolsOpen(false)}
                  className="block px-4 py-2 font-sans text-sm text-gray-600 hover:text-foreground hover:bg-gray-50 transition-colors"
                >
                  Thank You Email
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/auth/login"
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/login"
            className="font-sans text-xs font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-4 py-2 hover:bg-[#333] transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Hamburger button (mobile only) */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden font-sans text-foreground p-1"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 9h16.5m-16.5 6.75h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden mt-4 pb-2 border-t border-gray-200 pt-4 flex flex-col gap-3">
          <Link
            href="/blog"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/roadmap"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Roadmap
          </Link>

          {/* Tools accordion */}
          <div>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors w-full text-left flex items-center justify-between"
            >
              Tools
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={toolsOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                />
              </svg>
            </button>
            {toolsOpen && (
              <div className="mt-2 pl-3 flex flex-col gap-2">
                <Link
                  href="/tools/ats-score"
                  onClick={() => { setOpen(false); setToolsOpen(false); }}
                  className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
                >
                  ATS Score Checker
                </Link>
                <Link
                  href="/tools/thank-you-email"
                  onClick={() => { setOpen(false); setToolsOpen(false); }}
                  className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
                >
                  Thank You Email
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="inline-block text-center font-sans text-xs font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-4 py-2.5 hover:bg-[#333] transition-colors mt-1"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify nav manually**

```bash
npm run dev
```

Open http://localhost:3000. Check:
- Desktop: "Tools" button appears between "Roadmap" and "Login"; clicking opens the dropdown with "ATS Score Checker" and "Thank You Email"; clicking outside closes it; clicking a link navigates and closes it
- Mobile (resize browser to < 768px): hamburger menu opens; "Tools" row has a chevron; tapping expands the two sub-links inline; tapping a link closes the entire menu and navigates

- [ ] **Step 4: Commit**

```bash
git add src/components/nav/standard-nav.tsx
git commit -m "feat: add Tools dropdown to nav with ATS and thank-you email links"
```

---

## Task 2: Add Thank You Email entry to home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the second Volunteer Work entry**

In `src/app/page.tsx`, locate the closing `</section>` tag of the "Volunteer Work" section (currently around line 135). Add the new entry immediately before it, inside the section:

```tsx
{/* Volunteer Work section — after the existing ATS entry's closing </Link> */}

<div className="border-t border-gray-200 mt-7 pt-7">
  <h3 className="font-sans text-[15px] font-semibold text-foreground mb-1">
    Post-Interview Correspondent
  </h3>
  <p className="text-sm text-gray-500 mb-2">
    Community Service. Free, no sign-up required.
  </p>
  <p className="text-sm text-gray-700 leading-relaxed">
    Had a great interview but unsure how to follow up? Get a personalized
    thank you email in seconds, no account needed.
  </p>
  <Link
    href="/tools/thank-you-email"
    className="inline-block mt-3 font-sans text-sm font-medium text-blue-600 border-b border-blue-600 pb-px hover:text-blue-800 hover:border-blue-800 transition-colors"
  >
    Write Your Thank You Email &rarr;
  </Link>
</div>
```

The full "Volunteer Work" section after the edit should look like:

```tsx
{/* Volunteer Work */}
<section className="px-6 md:px-12 py-7 border-b border-gray-200">
  <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
    Volunteer Work
  </h2>
  <h3 className="font-sans text-[15px] font-semibold text-foreground mb-1">
    ATS Compatibility Analyst
  </h3>
  <p className="text-sm text-gray-500 mb-2">
    Community Service. Free, no sign-up required.
  </p>
  <p className="text-sm text-gray-700 leading-relaxed">
    Not sure how your resum&eacute; stacks up against applicant tracking
    systems? Check your ATS compatibility score, on the house.
  </p>
  <Link
    href="/tools/ats-score"
    className="inline-block mt-3 font-sans text-sm font-medium text-blue-600 border-b border-blue-600 pb-px hover:text-blue-800 hover:border-blue-800 transition-colors"
  >
    Check Your Score Free &rarr;
  </Link>

  <div className="border-t border-gray-200 mt-7 pt-7">
    <h3 className="font-sans text-[15px] font-semibold text-foreground mb-1">
      Post-Interview Correspondent
    </h3>
    <p className="text-sm text-gray-500 mb-2">
      Community Service. Free, no sign-up required.
    </p>
    <p className="text-sm text-gray-700 leading-relaxed">
      Had a great interview but unsure how to follow up? Get a personalized
      thank you email in seconds, no account needed.
    </p>
    <Link
      href="/tools/thank-you-email"
      className="inline-block mt-3 font-sans text-sm font-medium text-blue-600 border-b border-blue-600 pb-px hover:text-blue-800 hover:border-blue-800 transition-colors"
    >
      Write Your Thank You Email &rarr;
    </Link>
  </div>
</section>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

With the dev server still running, open http://localhost:3000. Scroll to the "Volunteer Work" section. Confirm:
- "Post-Interview Correspondent" entry appears below the ATS entry, separated by a top border
- Subtitle, description, and CTA link render correctly
- "Write Your Thank You Email →" navigates to `/tools/thank-you-email`

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add thank-you email entry to home page Volunteer Work section"
```
