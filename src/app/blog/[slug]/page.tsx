import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { ArticleContent } from "@/components/blog/article-content";
import { BlogCta } from "@/components/blog/blog-cta";
import { FaqSection } from "@/components/blog/faq-section";
import { JsonLd } from "@/components/blog/json-ld";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} | Taylor Resumé`,
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

  if (!post) {
    notFound();
  }

  return (
    <article>
      <JsonLd post={post} />
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {post.category}
          </span>
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>{post.readingTime} min read</span>
        </div>
        <h1 className="font-sans text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        <p className="font-serif text-xl text-gray-600 leading-relaxed">{post.excerpt}</p>
      </header>
      <ArticleContent html={post.content} />
      {post.faq && post.faq.length > 0 && <FaqSection items={post.faq} />}
      <BlogCta />
    </article>
  );
}
