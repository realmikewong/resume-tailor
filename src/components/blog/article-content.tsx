export function ArticleContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-lg max-w-none prose-headings:font-sans prose-headings:font-bold prose-p:font-serif prose-li:font-serif prose-blockquote:font-serif"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
