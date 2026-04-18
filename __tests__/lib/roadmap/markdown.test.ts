import { renderRoadmapMarkdown } from "@/lib/roadmap/markdown";

describe("renderRoadmapMarkdown", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(renderRoadmapMarkdown(null)).toBe("");
    expect(renderRoadmapMarkdown(undefined)).toBe("");
    expect(renderRoadmapMarkdown("")).toBe("");
  });
  it("converts markdown to HTML", () => {
    const html = renderRoadmapMarkdown("**bold** and [a link](https://x.com)");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('href="https://x.com"');
  });
  it("supports GFM line breaks", () => {
    expect(renderRoadmapMarkdown("line one\nline two")).toContain("<br");
  });
});
