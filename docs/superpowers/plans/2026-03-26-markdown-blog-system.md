# Markdown Blog System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a file-based markdown blog with auto-generated sitemap, Article + FAQ JSON-LD, and Tailwind prose styling.

**Architecture:** Markdown files in `content/blog/` are parsed at build time using `gray-matter` and `remark`/`rehype`. Next.js static generation pre-renders all published articles. A `sitemap.ts` file auto-generates `/sitemap.xml` including blog posts and static pages.

**Tech Stack:** Next.js App Router, gray-matter, remark, remark-html, @tailwindcss/typography, TypeScript

---

## File Structure

### New Files
- `content/blog/` — directory for markdown blog posts
- `content/blog/sample-post.md` — sample blog post for testing
- `src/lib/blog.ts` — read/parse markdown files, frontmatter types
- `src/app/blog/page.tsx` — blog index page
- `src/app/blog/[slug]/page.tsx` — individual article page with generateStaticParams
- `src/app/blog/layout.tsx` — blog layout wrapper
- `src/components/blog/article-list.tsx` — list of article entries
- `src/components/blog/article-card.tsx` — single article entry (title, excerpt, date, category)
- `src/components/blog/article-content.tsx` — rendered markdown with prose styling
- `src/components/blog/blog-cta.tsx` — CTA banner at bottom of articles
- `src/components/blog/faq-section.tsx` — FAQ accordion from frontmatter
- `src/components/blog/json-ld.tsx` — Article + FAQ JSON-LD script tags
- `src/app/sitemap.ts` — auto-generated sitemap
- `__tests__/lib/blog.test.ts` — tests for blog library

### Modified Files
- `src/app/page.tsx` — add blog link to landing page navigation
- `package.json` — add gray-matter, remark, remark-html, @tailwindcss/typography

---

### Task 1: Install Dependencies and Create Blog Library

**Files:**
- Modify: `package.json`
- Create: `src/lib/blog.ts`
- Create: `content/blog/sample-post.md`
- Test: `__tests__/lib/blog.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install gray-matter remark remark-html @tailwindcss/typography
```

- [ ] **Step 2: Create sample blog post**

Create `content/blog/getting-started-with-ats.md`:

```markdown
---
title: "Getting Started with ATS Optimization"
slug: "getting-started-with-ats"
date: "2026-03-20"
category: "Resume Tips"
excerpt: "Learn the basics of how applicant tracking systems work and what you can do to ensure your resume gets past automated screening."
author: "Nate Wong"
readingTime: 5
published: true
faq:
  - q: "What is an ATS?"
    a: "An Applicant Tracking System (ATS) is software used by employers to filter and rank resumes before a human reviews them."
  - q: "How do I optimize my resume for ATS?"
    a: "Use keywords from the job description, avoid tables and columns, use standard section headings, and submit in .docx or .pdf format."
  - q: "Does Resume Tailor help with ATS optimization?"
    a: "Yes — Resume Tailor analyzes your resume against job descriptions using 8 ATS scoring factors and tailors your resume to improve your match."
---

If you've ever applied for a job online and never heard back, there's a good chance your resume was filtered out by an Applicant Tracking System before a human ever saw it.

## What is an ATS?

An ATS is software that companies use to manage their hiring process. It collects, scans, and ranks resumes based on how well they match the job description. Most Fortune 500 companies and many mid-size employers use some form of ATS.

## Why Your Resume Might Not Make It Through

The most common reasons resumes get filtered out include missing keywords, non-standard formatting, and irrelevant content that dilutes your match score.

## How to Improve Your ATS Score

1. **Use keywords from the job description** — Mirror the exact language used in the posting
2. **Keep formatting simple** — Avoid tables, columns, headers/footers, and images
3. **Use standard section headings** — "Experience", "Education", "Skills" are safe bets
4. **Quantify achievements** — Numbers and percentages stand out to both ATS and humans

## Check Your Score for Free

Want to see how your resume scores? Try our [free ATS Score Checker](/tools/ats-score) — no signup required.
```

- [ ] **Step 3: Write the failing test**

Create `__tests__/lib/blog.test.ts`:

```typescript
import { getAllPosts, getPostBySlug } from "@/lib/blog";

describe("blog library", () => {
  it("getAllPosts returns published posts sorted by date descending", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(1);
    expect(posts[0].slug).toBe("getting-started-with-ats");
    expect(posts[0].title).toBe("Getting Started with ATS Optimization");
    expect(posts[0].published).toBe(true);
  });

  it("getPostBySlug returns a post with content", () => {
    const post = getPostBySlug("getting-started-with-ats");
    expect(post).not.toBeNull();
    expect(post!.title).toBe("Getting Started with ATS Optimization");
    expect(post!.content).toContain("Applicant Tracking System");
  });

  it("getPostBySlug returns null for non-existent slug", () => {
    const post = getPostBySlug("does-not-exist");
    expect(post).toBeNull();
  });

  it("getAllPosts excludes unpublished posts", () => {
    const posts = getAllPosts();
    for (const post of posts) {
      expect(post.published).toBe(true);
    }
  });

  it("post has faq array when defined in frontmatter", () => {
    const post = getPostBySlug("getting-started-with-ats");
    expect(post!.faq).toBeDefined();
    expect(post!.faq!.length).toBe(3);
    expect(post!.faq![0].q).toContain("ATS");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest __tests__/lib/blog.test.ts --no-coverage`
Expected: FAIL — module `@/lib/blog` does not exist

- [ ] **Step 5: Write the blog library**

Create `src/lib/blog.ts`:

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type FaqItem = {
  q: string;
  a: string;
};

export type BlogPostMeta = {
  title: string;
  slug: string;
  date: string;
  category: string;
  excerpt: string;
  author: string;
  readingTime: number;
  published: boolean;
  faq?: FaqItem[];
};

export type BlogPost = BlogPostMeta & {
  content: string; // rendered HTML
};

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  const posts: BlogPostMeta[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
    const { data } = matter(raw);

    if (data.published === false) continue;

    posts.push({
      title: data.title,
      slug: data.slug ?? file.replace(/\.md$/, ""),
      date: data.date,
      category: data.category ?? "",
      excerpt: data.excerpt ?? "",
      author: data.author ?? "",
      readingTime: data.readingTime ?? 5,
      published: data.published !== false,
      faq: data.faq,
    });
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!fs.existsSync(BLOG_DIR)) return null;

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
    const { data, content } = matter(raw);

    const postSlug = data.slug ?? file.replace(/\.md$/, "");

    if (postSlug !== slug) continue;
    if (data.published === false) return null;

    const result = await remark().use(html).process(content);

    return {
      title: data.title,
      slug: postSlug,
      date: data.date,
      category: data.category ?? "",
      excerpt: data.excerpt ?? "",
      author: data.author ?? "",
      readingTime: data.readingTime ?? 5,
      published: data.published !== false,
      faq: data.faq,
      content: result.toString(),
    };
  }

  return null;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest __tests__/lib/blog.test.ts --no-coverage`
Expected: PASS — all 5 tests pass

- [ ] **Step 7: Commit**

```bash
git add content/blog/ src/lib/blog.ts __tests__/lib/blog.test.ts package.json package-lock.json
git commit -m "feat: add blog library with markdown parsing and sample post"
```

---

### Task 2: Blog Components

**Files:**
- Create: `src/components/blog/article-card.tsx`
- Create: `src/components/blog/article-list.tsx`
- Create: `src/components/blog/article-content.tsx`
- Create: `src/components/blog/blog-cta.tsx`
- Create: `src/components/blog/faq-section.tsx`
- Create: `src/components/blog/json-ld.tsx`

- [ ] **Step 1: Create ArticleCard component**

Create `src/components/blog/article-card.tsx`:

```tsx
import Link from "next/link";
import { BlogPostMeta } from "@/lib/blog";

export function ArticleCard({ post }: { post: BlogPostMeta }) {
  return (
    <article className="py-6 border-b border-gray-200 last:border-b-0">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {post.category}
        </span>
        <span className="text-sm text-gray-500">
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span className="text-sm text-gray-400">{post.readingTime} min read</span>
      </div>
      <Link href={`/blog/${post.slug}`} className="group">
        <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
          {post.title}
        </h2>
      </Link>
      <p className="text-gray-600 text-sm leading-relaxed">{post.excerpt}</p>
    </article>
  );
}
```

- [ ] **Step 2: Create ArticleList component**

Create `src/components/blog/article-list.tsx`:

```tsx
import { BlogPostMeta } from "@/lib/blog";
import { ArticleCard } from "./article-card";

export function ArticleList({ posts }: { posts: BlogPostMeta[] }) {
  if (posts.length === 0) {
    return <p className="text-gray-500 text-center py-12">No articles yet. Check back soon!</p>;
  }

  return (
    <div className="divide-y divide-gray-200">
      {posts.map((post) => (
        <ArticleCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create ArticleContent component**

Create `src/components/blog/article-content.tsx`:

```tsx
export function ArticleContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 4: Create BlogCta component**

Create `src/components/blog/blog-cta.tsx`:

```tsx
import Link from "next/link";

export function BlogCta() {
  return (
    <div className="mt-12 p-8 bg-blue-50 rounded-lg text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Ready to improve your resume?
      </h3>
      <p className="text-gray-600 mb-6">
        Check your ATS compatibility score for free, or let us tailor your resume to any job description.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/tools/ats-score"
          className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
        >
          Free ATS Score Checker
        </Link>
        <Link
          href="/auth/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Start Tailoring Your Resume
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create FaqSection component**

Create `src/components/blog/faq-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { FaqItem } from "@/lib/blog";

function FaqEntry({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-4 flex justify-between items-center text-left"
      >
        <span className="font-medium text-gray-900">{item.q}</span>
        <span className="text-gray-400 text-xl ml-4">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p className="pb-4 text-gray-600 leading-relaxed">{item.a}</p>
      )}
    </div>
  );
}

export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Frequently Asked Questions
      </h2>
      <div className="divide-y divide-gray-200">
        {items.map((item, i) => (
          <FaqEntry key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create JsonLd component**

Create `src/components/blog/json-ld.tsx`:

```tsx
import { BlogPost } from "@/lib/blog";

export function ArticleJsonLd({ post }: { post: BlogPost }) {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "Resume Tailor",
    },
  };

  const faqSchema =
    post.faq && post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.a,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/blog/
git commit -m "feat: add blog components — article list, content, CTA, FAQ, JSON-LD"
```

---

### Task 3: Blog Pages

**Files:**
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`
- Create: `src/app/blog/layout.tsx`

- [ ] **Step 1: Create blog layout**

Create `src/app/blog/layout.tsx`:

```tsx
import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Resume Tailor
          </Link>
          <nav className="flex gap-6">
            <Link href="/blog" className="text-gray-600 hover:text-gray-900">
              Blog
            </Link>
            <Link href="/tools/ats-score" className="text-gray-600 hover:text-gray-900">
              ATS Score Checker
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create blog index page**

Create `src/app/blog/page.tsx`:

```tsx
import { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { ArticleList } from "@/components/blog/article-list";

export const metadata: Metadata = {
  title: "Blog | Resume Tailor",
  description:
    "Tips, guides, and strategies for optimizing your resume, beating ATS systems, and landing more interviews.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog</h1>
      <p className="text-gray-600 mb-8">
        Resume tips, career advice, and ATS optimization strategies.
      </p>
      <ArticleList posts={posts} />
    </div>
  );
}
```

- [ ] **Step 3: Create article page**

Create `src/app/blog/[slug]/page.tsx`:

```tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { ArticleContent } from "@/components/blog/article-content";
import { BlogCta } from "@/components/blog/blog-cta";
import { FaqSection } from "@/components/blog/faq-section";
import { ArticleJsonLd } from "@/components/blog/json-ld";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not Found" };

  return {
    title: `${post.title} | Resume Tailor Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <article>
      <ArticleJsonLd post={post} />
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {post.category}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="text-sm text-gray-400">{post.readingTime} min read</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        <p className="text-lg text-gray-600">{post.excerpt}</p>
      </div>
      <ArticleContent html={post.content} />
      {post.faq && post.faq.length > 0 && <FaqSection items={post.faq} />}
      <BlogCta />
    </article>
  );
}
```

- [ ] **Step 4: Run build to verify pages render**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds, `/blog` and `/blog/getting-started-with-ats` appear in output

- [ ] **Step 5: Commit**

```bash
git add src/app/blog/
git commit -m "feat: add blog index and article pages with SEO metadata"
```

---

### Task 4: Sitemap

**Files:**
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Create sitemap generator**

Create `src/app/sitemap.ts`:

```typescript
import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://resume-tailor-tau-seven.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tools/ats-score`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  return [...staticPages, ...blogEntries];
}
```

- [ ] **Step 2: Run build to verify sitemap generates**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds, `/sitemap.xml` appears in output

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat: add auto-generated sitemap with blog posts and static pages"
```

---

### Task 5: Add Tailwind Typography Plugin

**Files:**
- Modify: Tailwind config (if applicable) or `postcss.config.js`

- [ ] **Step 1: Verify @tailwindcss/typography is configured**

Check if the project uses `tailwind.config.ts` or inline Tailwind config. If `tailwind.config.ts` exists, add the typography plugin:

```typescript
plugins: [require("@tailwindcss/typography")],
```

If using Tailwind v4 with CSS-based config, add to the global CSS:

```css
@plugin "@tailwindcss/typography";
```

- [ ] **Step 2: Run build to verify prose classes work**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds without Tailwind errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: configure Tailwind typography plugin for blog prose styling"
```

---

### Task 6: Landing Page Blog Link and Final Verification

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add blog link to landing page**

Add a "Blog" link to the landing page navigation, following the existing pattern.

- [ ] **Step 2: Run all tests**

Run: `npx jest --no-coverage`
Expected: All tests pass including new blog tests

- [ ] **Step 3: Run full build**

Run: `npx next build`
Expected: Build succeeds with all blog pages and sitemap

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add blog link to landing page navigation"
```

- [ ] **Step 5: Push branch and create PR**

```bash
git push -u origin feature/markdown-blog
gh pr create --title "feat: add markdown blog system with SEO and sitemap" --body "..."
```
