import type { BlogPostMeta } from "@/lib/blog";
import { ArticleCard } from "./article-card";

export function ArticleList({ posts }: { posts: BlogPostMeta[] }) {
  if (posts.length === 0) {
    return (
      <p className="text-gray-500 py-8 text-center">No articles yet.</p>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <ArticleCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
