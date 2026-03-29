import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { ArticleList } from "@/components/blog/article-list";

export const metadata: Metadata = {
  title: "Blog | Taylor Resumé",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-sans text-4xl font-bold text-gray-900 mb-3">Blog</h1>
        <p className="font-serif text-lg text-gray-600">
          Tips, guides, and insights to help you land your next role.
        </p>
      </div>
      <ArticleList posts={posts} />
    </div>
  );
}
