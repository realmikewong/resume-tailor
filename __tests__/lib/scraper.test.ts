import { extractJobFieldsFromHtml } from "@/lib/scraper";

describe("extractJobFieldsFromHtml", () => {
  it("returns null for empty HTML", async () => {
    const result = await extractJobFieldsFromHtml("");
    expect(result).toBeNull();
  });
});
