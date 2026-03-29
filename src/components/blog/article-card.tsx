import Link from "next/link";
import type { BlogPostMeta } from "@/lib/blog";

export function ArticleCard({ post }: { post: BlogPostMeta }) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="border-b py-6 last:border-b-0">
      <div className="mb-2">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {post.category}
        </span>
      </div>
      <h2 className="font-sans text-xl font-semibold mb-2">
        <Link
          href={`/blog/${post.slug}`}
          className="text-gray-900 hover:text-blue-600 transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      <p className="font-serif text-gray-600 mb-3 leading-relaxed">{post.excerpt}</p>
      <div className="font-sans flex items-center gap-3 text-sm text-gray-500">
        <span>{formattedDate}</span>
        <span>&middot;</span>
        <span>{post.readingTime} min read</span>
      </div>
    </div>
  );
}
