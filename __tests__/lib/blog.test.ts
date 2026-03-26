import fs from "fs";
import path from "path";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

describe("getAllPosts", () => {
  it("returns published posts sorted by date descending", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].date >= posts[i].date).toBe(true);
    }
  });

  it("excludes unpublished posts", () => {
    // Create a temp unpublished post
    const tempFile = path.join(BLOG_DIR, "unpublished-test-post.md");
    const content = `---
title: "Unpublished Post"
slug: "unpublished-test-post"
date: "2026-01-01"
category: "Test"
excerpt: "This should not appear."
author: "Test Author"
readingTime: 1
published: false
---

This post is unpublished.
`;
    fs.writeFileSync(tempFile, content, "utf-8");

    try {
      const posts = getAllPosts();
      const slugs = posts.map((p) => p.slug);
      expect(slugs).not.toContain("unpublished-test-post");
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  it("returns posts with expected shape", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    const post = posts[0];
    expect(post).toHaveProperty("title");
    expect(post).toHaveProperty("slug");
    expect(post).toHaveProperty("date");
    expect(post).toHaveProperty("category");
    expect(post).toHaveProperty("excerpt");
    expect(post).toHaveProperty("author");
    expect(post).toHaveProperty("readingTime");
    expect(post).toHaveProperty("published");
  });
});

describe("getPostBySlug", () => {
  it("returns a post with rendered HTML content", async () => {
    const post = await getPostBySlug("getting-started-with-ats");
    expect(post).not.toBeNull();
    expect(post!.slug).toBe("getting-started-with-ats");
    expect(post!.content).toMatch(/<h2[\s>]/);
    expect(post!.content).toContain("<p>");
  });

  it("returns null for a non-existent slug", async () => {
    const post = await getPostBySlug("this-slug-does-not-exist-xyz");
    expect(post).toBeNull();
  });

  it("returns null for an unpublished post", async () => {
    const tempFile = path.join(BLOG_DIR, "unpublished-slug-test.md");
    const content = `---
title: "Unpublished Slug Test"
slug: "unpublished-slug-test"
date: "2026-01-01"
category: "Test"
excerpt: "Should be null."
author: "Test Author"
readingTime: 1
published: false
---

Content here.
`;
    fs.writeFileSync(tempFile, content, "utf-8");

    try {
      const post = await getPostBySlug("unpublished-slug-test");
      expect(post).toBeNull();
    } finally {
      fs.unlinkSync(tempFile);
    }
  });
});

describe("blog post faq", () => {
  it("includes faq array when defined in frontmatter", () => {
    const posts = getAllPosts();
    const atsPost = posts.find((p) => p.slug === "getting-started-with-ats");
    expect(atsPost).toBeDefined();
    expect(Array.isArray(atsPost!.faq)).toBe(true);
    expect(atsPost!.faq!.length).toBeGreaterThan(0);
    expect(atsPost!.faq![0]).toHaveProperty("q");
    expect(atsPost!.faq![0]).toHaveProperty("a");
  });
});
