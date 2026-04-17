import { marked } from "marked";

/**
 * Render roadmap markdown to HTML. Options are scoped to this call so we don't
 * mutate marked's global state (blog + legal pages use marked with defaults).
 * Input is admin-only and trusted; the blog pattern is reused — no additional
 * sanitization. If untrusted inputs are ever added, add sanitize-html.
 */
export function renderRoadmapMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return marked.parse(md, { async: false, breaks: true, gfm: true }) as string;
}
