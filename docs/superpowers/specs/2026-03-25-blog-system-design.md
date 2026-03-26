# Markdown Blog System — Design Spec

## Problem

Resume Tailor needs content marketing for SEO. The site has no blog, no organic search presence, and no way to publish educational content that drives traffic to the ATS Score Checker and signup flow.

## Solution

A file-based blog system where markdown files are dropped into a `content/blog/` folder in the repo, pushed to GitHub, and auto-deployed by Vercel as fully styled blog pages with auto-generated sitemap and structured data.

## Content Workflow

1. Write a markdown file with YAML frontmatter
2. Save to `content/blog/your-article-slug.md`
3. Push to GitHub
4. Vercel deploys — article is live at `/blog/your-article-slug`
5. Sitemap at `/sitemap.xml` is automatically updated
6. JSON-LD structured data is automatically generated

## Frontmatter Schema

```yaml
---
title: "How to Beat ATS Systems in 2026"
slug: "how-to-beat-ats-systems"
date: "2026-03-20"
category: "Resume Tips"
excerpt: "Learn how applicant tracking systems work and how to optimize your resume to get past automated screening."
author: "Nate Wong"
readingTime: 5
published: true
faq:
  - q: "What is an ATS?"
    a: "An Applicant Tracking System is software that employers use to filter resumes before a human reviews them."
  - q: "How do I optimize my resume for ATS?"
    a: "Use keywords from the job description, avoid tables and columns, and use standard section headings."
---
```

- `published: false` excludes the article from the index page and sitemap (allows drafting in the repo)
- `faq` is optional — when present, generates both an FAQ section in the article and FAQPage JSON-LD schema
- `slug` determines the URL path: `/blog/{slug}`

## Content Types

Blog articles cover a mix of topics:
- Resume tips and best practices
- Cover letter guidance
- Job search strategies
- ATS optimization techniques

Categories are defined per-article in frontmatter, not in a separate config.

## Pages

### Blog Index (`/blog`)

Simple list layout. Each entry shows:
- Category tag (small colored label)
- Article title (linked)
- Excerpt text
- Date and reading time

Sorted by date descending. Filterable by category via query param (`/blog?category=Resume+Tips`).

### Article Page (`/blog/[slug]`)

Clean, centered reading layout:
- Title
- Category tag, date, author, reading time
- Article body (rendered markdown)
- Optional FAQ section (if `faq` frontmatter exists) — rendered as a simple Q&A list
- CTA banner at the bottom

No sidebar. Focused reading experience.

### CTA Banner

At the bottom of every article, two call-to-action options:
- "Check your ATS score for free" → links to `/tools/ats-score`
- "Start tailoring your resume" → links to `/auth/login`

## Technical Design

### Markdown Processing

- `gray-matter` — parses YAML frontmatter from markdown files
- `remark` + `rehype` (or `next-mdx-remote`) — renders markdown to HTML
- All processing happens at build time via Next.js static generation

### Static Generation

Blog pages use `generateStaticParams` to pre-render all published articles at build time. This means:
- Fast page loads (static HTML)
- Good SEO (content in the HTML, not client-rendered)
- No server-side rendering needed for blog content

### File Structure

```
content/
  blog/
    how-to-beat-ats.md
    cover-letter-mistakes.md
    salary-negotiation.md
src/
  app/
    blog/
      page.tsx              (index page)
      [slug]/
        page.tsx            (article page)
    sitemap.ts              (auto-generated sitemap)
  lib/
    blog.ts                 (read/parse markdown files)
  components/
    blog/
      article-list.tsx      (list of articles for index)
      article-card.tsx      (single article entry in list)
      article-content.tsx   (rendered article body)
      blog-cta.tsx          (CTA banner)
      blog-faq.tsx          (FAQ section)
```

### Styling

Articles use Tailwind's `prose` class from `@tailwindcss/typography` for default typography. This styles headings, paragraphs, lists, code blocks, blockquotes, and links automatically. The style is defined once and every article inherits it.

### Sitemap (`/sitemap.xml`)

Next.js App Router supports a `sitemap.ts` file that generates `/sitemap.xml` at build time. It reads all published blog posts and includes them alongside existing static pages (landing page, ATS tool, login).

### SEO Meta Tags

Each article page generates proper meta tags from frontmatter using Next.js `generateMetadata`:
- `<title>` — article title + site name
- `<meta name="description">` — excerpt
- `og:title`, `og:description` — for social sharing
- `og:type` — "article"

### JSON-LD Structured Data

#### Article Schema

Every article page includes an `Article` JSON-LD script tag:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Beat ATS Systems in 2026",
  "description": "Learn how applicant tracking systems work...",
  "author": {
    "@type": "Person",
    "name": "Nate Wong"
  },
  "datePublished": "2026-03-20",
  "publisher": {
    "@type": "Organization",
    "name": "Resume Tailor"
  }
}
```

#### FAQ Schema (Optional)

When an article has an `faq` array in frontmatter, a `FAQPage` JSON-LD script tag is also included:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is an ATS?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An Applicant Tracking System is software that employers use to filter resumes before a human reviews them."
      }
    }
  ]
}
```

Both schemas are generated automatically from frontmatter — no manual work per article.

## Dependencies

New packages:
- `gray-matter` — frontmatter parsing
- `@tailwindcss/typography` — prose styling for article content
- `remark`, `remark-html` (or `next-mdx-remote`) — markdown to HTML rendering

## What Stays the Same

- Landing page unchanged (homepage redesign is a separate project)
- Dashboard, auth, and all app functionality untouched
- No database involved — blog is purely file-based
- Existing routes and components unaffected

## What Changes

- New `/blog` and `/blog/[slug]` routes added
- New `sitemap.ts` added (or existing one updated)
- Navigation updated to include "Blog" link on the public site
- `content/blog/` directory added to repo root
