# Resume-Styled Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic SaaS landing page with a resume-styled homepage featuring the "Taylor Resumé" persona, and update site-wide navigation to use a shared standard nav component.

**Architecture:** The homepage (`src/app/page.tsx`) gets a complete rewrite as a resume-formatted document. A shared `StandardNav` component replaces the duplicated nav bars in the blog and tools layouts. The root layout swaps Geist for Inter (Google Fonts) and sets Georgia as the body serif font. A `StickyNav` client component handles the scroll-triggered nav on the homepage.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, next/font/google (Inter)

**Spec:** `docs/superpowers/specs/2026-03-26-resume-homepage-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/layout.tsx` | Modify | Swap Geist for Inter, add Georgia CSS variable, update metadata |
| `src/app/globals.css` | Modify | Add Inter/Georgia font family declarations, update CSS variables |
| `src/components/nav/standard-nav.tsx` | Create | Shared nav bar for blog, tools, and sticky homepage nav |
| `src/components/nav/sticky-nav.tsx` | Create | Client component: shows StandardNav on scroll past homepage header |
| `src/app/page.tsx` | Rewrite | Resume-styled homepage with all sections |
| `src/app/blog/layout.tsx` | Modify | Replace inline nav with StandardNav component |
| `src/app/tools/layout.tsx` | Modify | Replace inline nav with StandardNav component |

---

### Task 1: Add Inter Font and Update Root Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update root layout to load Inter instead of Geist**

Replace the font imports and variables in `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taylor Resumé — Making sure your resumé does you justice",
  description:
    "Upload your resume, paste a job posting, and get a professionally tailored resume and cover letter. Formatted, polished, and ready to send.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Update globals.css with new font declarations**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

:root {
  --background: #ffffff;
  --foreground: #1a1a1a;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-serif);
}
```

- [ ] **Step 3: Verify the app builds and loads**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: swap Geist for Inter, set Georgia as body font, update metadata"
```

---

### Task 2: Create StandardNav Component

**Files:**
- Create: `src/components/nav/standard-nav.tsx`

- [ ] **Step 1: Create the nav component directory**

```bash
mkdir -p src/components/nav
```

- [ ] **Step 2: Create StandardNav component**

Create `src/components/nav/standard-nav.tsx`:

```tsx
import Link from "next/link";

export default function StandardNav() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 max-w-6xl mx-auto">
      <Link
        href="/"
        className="font-sans text-base font-bold text-foreground tracking-wide"
      >
        Taylor Resum&eacute;
      </Link>
      <div className="flex items-center gap-6">
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
    </nav>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/standard-nav.tsx
git commit -m "feat: add StandardNav component for site-wide navigation"
```

---

### Task 3: Create StickyNav Component

**Files:**
- Create: `src/components/nav/sticky-nav.tsx`

- [ ] **Step 1: Create the StickyNav client component**

Create `src/components/nav/sticky-nav.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import StandardNav from "./standard-nav";

export default function StickyNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const header = document.getElementById("resume-header");
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <StandardNav />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nav/sticky-nav.tsx
git commit -m "feat: add StickyNav component with scroll-triggered visibility"
```

---

### Task 4: Rewrite Homepage as Resume Layout

**Files:**
- Rewrite: `src/app/page.tsx`

- [ ] **Step 1: Replace the landing page with the resume-styled homepage**

Rewrite `src/app/page.tsx`:

```tsx
import Link from "next/link";
import StickyNav from "@/components/nav/sticky-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <StickyNav />

      <main className="max-w-[780px] mx-auto">
        {/* Header */}
        <header id="resume-header" className="text-center px-12 pt-14 pb-8 border-b-2 border-foreground">
          <h1 className="font-sans text-4xl font-bold tracking-[4px] uppercase text-foreground">
            Taylor Resum&eacute;
          </h1>
          <p className="font-sans text-sm text-gray-500 tracking-wider mt-2">
            Making sure your resum&eacute; does you justice
          </p>
          <div className="font-sans text-xs text-gray-400 mt-3 tracking-wide">
            <span>hello@taylorresume.com</span>
            <span className="mx-2">|</span>
            <span>taylorresume.com</span>
            <span className="mx-2">|</span>
            <Link
              href="/auth/login"
              className="text-blue-600 font-medium hover:text-blue-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* Objective */}
        <section className="px-12 py-7 border-b border-gray-200">
          <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
            Objective
          </h2>
          <p className="text-[15px] text-gray-700 leading-relaxed italic">
            You&rsquo;ve done the hard part: building real skills, gaining real
            experience, becoming someone worth hiring. I&rsquo;m here to make sure
            your resum&eacute; does you justice, every time, for every role.
          </p>
        </section>

        {/* Experience */}
        <section className="px-12 py-7 border-b border-gray-200">
          <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
            Experience
          </h2>

          <div className="mb-7">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-sans text-[15px] font-semibold text-foreground">
                Document Intake Specialist
              </h3>
              <span className="font-sans text-xs text-gray-400">Step 1</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">Getting Started</p>
            <ul className="space-y-1">
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Upload your baseline resum&eacute; as a Word doc or PDF
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Your experience, your skills, your story. Securely received.
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                One upload covers every future application
              </li>
            </ul>
          </div>

          <div className="mb-7">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-sans text-[15px] font-semibold text-foreground">
                Tailoring Analyst
              </h3>
              <span className="font-sans text-xs text-gray-400">Step 2</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">The Work</p>
            <ul className="space-y-1">
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Paste the job posting you&rsquo;re targeting
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                I&rsquo;ll match your experience to what matters for this role
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Every resum&eacute; is unique, because every job posting is
              </li>
            </ul>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-sans text-[15px] font-semibold text-foreground">
                Delivery Coordinator
              </h3>
              <span className="font-sans text-xs text-gray-400">Step 3</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">The Result</p>
            <ul className="space-y-1">
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Download your tailored resum&eacute; and cover letter
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Formatted, polished, and ready to send
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Word and PDF formats included
              </li>
            </ul>
          </div>
        </section>

        {/* Volunteer Work */}
        <section className="px-12 py-7 border-b border-gray-200">
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
        </section>

        {/* Compensation */}
        <section className="px-12 py-7 border-b border-gray-200">
          <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
            Compensation
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Flexible packages starting at free. Competitive rates because job
            searching is expensive enough.
          </p>
          <Link
            href="/pricing"
            className="inline-block mt-2 font-sans text-sm font-medium text-blue-600 border-b border-blue-600 pb-px hover:text-blue-800 hover:border-blue-800 transition-colors"
          >
            View Pricing &rarr;
          </Link>
        </section>

        {/* CTA Footer */}
        <section className="text-center px-12 py-9 border-t-2 border-foreground">
          <p className="text-[15px] text-gray-700 mb-5 leading-relaxed">
            References available upon request. Or just try it: your first 3
            tailored resum&eacute;s are on me.
          </p>
          <Link
            href="/auth/login"
            className="inline-block font-sans text-sm font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-9 py-3.5 hover:bg-[#333] transition-colors"
          >
            Get Started Free
          </Link>
        </section>

        {/* Footer */}
        <footer className="text-center px-12 py-5 font-sans text-[11px] text-gray-300 tracking-wide">
          &copy; {new Date().getFullYear()} Taylor Resum&eacute;. All rights
          reserved.
        </footer>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify the homepage renders correctly**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: Resume-styled homepage with all sections, Inter headings, Georgia body text, contact-line nav in header.

- [ ] **Step 3: Verify sticky nav appears on scroll**

Scroll past the header on the homepage.
Expected: Standard nav bar slides in from the top and sticks. Scrolling back up hides it when the resume header is visible again.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rewrite homepage as resume-styled layout with Taylor Resumé persona"
```

---

### Task 5: Update Blog Layout to Use StandardNav

**Files:**
- Modify: `src/app/blog/layout.tsx`

- [ ] **Step 1: Replace the inline blog nav with StandardNav**

Rewrite `src/app/blog/layout.tsx`:

```tsx
import StandardNav from "@/components/nav/standard-nav";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white sticky top-0 z-10">
        <StandardNav />
      </header>
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify blog pages render with new nav**

Open: `http://localhost:3000/blog`
Expected: Standard nav with "Taylor Resumé" logo, Blog, Pricing, Login, Get Started links. Blog content renders below.

- [ ] **Step 3: Commit**

```bash
git add src/app/blog/layout.tsx
git commit -m "feat: update blog layout to use StandardNav component"
```

---

### Task 6: Update Tools Layout to Use StandardNav

**Files:**
- Modify: `src/app/tools/layout.tsx`

- [ ] **Step 1: Replace the inline tools nav with StandardNav**

Rewrite `src/app/tools/layout.tsx`:

```tsx
import StandardNav from "@/components/nav/standard-nav";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <StandardNav />
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify tools pages render with new nav**

Open: `http://localhost:3000/tools/ats-score`
Expected: Standard nav with "Taylor Resumé" logo and full link set. ATS Score Checker content renders below.

- [ ] **Step 3: Commit**

```bash
git add src/app/tools/layout.tsx
git commit -m "feat: update tools layout to use StandardNav component"
```

---

### Task 7: Final Verification and Build

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings related to our changes.

- [ ] **Step 2: Verify all key pages**

Start: `npm run start`
Check each page loads correctly:
- `http://localhost:3000` — Resume homepage, sticky nav on scroll
- `http://localhost:3000/blog` — Blog with standard nav
- `http://localhost:3000/tools/ats-score` — ATS tool with standard nav
- `http://localhost:3000/auth/login` — Login page (unchanged)
- `http://localhost:3000/dashboard` — Dashboard (unchanged, requires auth)

- [ ] **Step 3: Verify all internal links work**

On the homepage, click:
- "Get Started" in header contact line → `/auth/login`
- "Check Your Score Free →" → `/tools/ats-score`
- "View Pricing →" → `/pricing` (may 404, that's expected — page not built yet)
- "Get Started Free" button → `/auth/login`

On the sticky nav and standard nav, click:
- "Taylor Resumé" logo → `/`
- "Blog" → `/blog`
- "Pricing" → `/pricing`
- "Login" → `/auth/login`
- "Get Started" → `/auth/login`

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address any issues found during final verification"
```
