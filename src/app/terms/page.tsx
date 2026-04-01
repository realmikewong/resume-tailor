import fs from "fs";
import path from "path";
import { marked } from "marked";

export default async function TermsPage() {
  const filePath = path.join(process.cwd(), "content", "legal", "terms-of-use.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  const html = await marked(raw);

  return (
    <div
      className="prose prose-gray max-w-none prose-headings:font-sans prose-p:font-serif prose-li:font-serif prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-8"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
