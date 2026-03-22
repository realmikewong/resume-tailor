import * as cheerio from "cheerio";
import OpenAI from "openai";

export type ScrapedJobFields = {
  company_name: string;
  job_title: string;
  job_description: string;
  pay_range_low: number | null;
  pay_range_high: number | null;
  job_location: string | null;
  location_type: "remote" | "hybrid" | "on-site" | null;
};

export async function fetchAndCleanHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer to reduce noise
    $("script, style, nav, footer, header, iframe, noscript").remove();

    const text = $("body").text().replace(/\s+/g, " ").trim();

    // If very little text content, scraping likely failed
    if (text.length < 100) return null;

    // Limit to ~8000 chars to stay within reasonable token limits
    return text.slice(0, 8000);
  } catch {
    return null;
  }
}

export async function extractJobFieldsFromHtml(
  text: string
): Promise<ScrapedJobFields | null> {
  if (!text || text.length < 100) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract job posting fields from the provided text. Return JSON with these fields:
- company_name (string)
- job_title (string)
- job_description (string, the full job description)
- pay_range_low (number or null)
- pay_range_high (number or null)
- job_location (string or null)
- location_type ("remote", "hybrid", "on-site", or null)

If a field cannot be determined, use null. For job_description, include the full description text.`,
        },
        { role: "user", content: text },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    return JSON.parse(content) as ScrapedJobFields;
  } catch {
    return null;
  }
}

export async function scrapeJobUrl(
  url: string
): Promise<{ fields: ScrapedJobFields | null; rawText: string | null }> {
  const rawText = await fetchAndCleanHtml(url);
  if (!rawText) return { fields: null, rawText: null };

  const fields = await extractJobFieldsFromHtml(rawText);
  return { fields, rawText };
}
