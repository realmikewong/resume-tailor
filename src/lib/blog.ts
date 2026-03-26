import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

export type FaqItem = { q: string; a: string };

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

export type BlogPost = BlogPostMeta & { content: string };

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  const posts: BlogPostMeta[] = files
    .map((filename) => {
      const filePath = path.join(BLOG_DIR, filename);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(raw);

      return {
        title: data.title as string,
        slug: data.slug as string,
        date: data.date as string,
        category: data.category as string,
        excerpt: data.excerpt as string,
        author: data.author as string,
        readingTime: data.readingTime as number,
        published: data.published as boolean,
        faq: data.faq as FaqItem[] | undefined,
      };
    })
    .filter((post) => post.published);

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!fs.existsSync(BLOG_DIR)) {
    return null;
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  for (const filename of files) {
    const filePath = path.join(BLOG_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content: markdownContent } = matter(raw);

    if (data.slug === slug) {
      if (!data.published) {
        return null;
      }

      const htmlContent = await marked(markdownContent);

      return {
        title: data.title as string,
        slug: data.slug as string,
        date: data.date as string,
        category: data.category as string,
        excerpt: data.excerpt as string,
        author: data.author as string,
        readingTime: data.readingTime as number,
        published: data.published as boolean,
        faq: data.faq as FaqItem[] | undefined,
        content: htmlContent,
      };
    }
  }

  return null;
}
