import Anthropic from '@anthropic-ai/sdk';
import { extractedJobFieldsSchema, type ExtractedJobFields } from './job-extractor-schemas';

const anthropic = new Anthropic();

export function buildExtractionPrompt(rawText: string): string {
  return `You are a job posting parser. Extract structured fields from the raw text of a job posting page.

The text may contain navigation menus, footers, sidebars, cookie banners, EEO/legal boilerplate, and other website chrome. Ignore all of that. Extract ONLY the job posting content.

Return ONLY valid JSON with no commentary, no markdown, no code fences. Use this exact structure:

{
  "company_name": "string - the hiring company name",
  "job_title": "string - the job title",
  "job_description": "string - the full job description including responsibilities and requirements, cleaned up and readable",
  "pay_range_low": "number or null - lower end of pay range as a number, null if not stated",
  "pay_range_high": "number or null - upper end of pay range as a number, null if not stated",
  "job_location": "string - city, state or location, empty string if not found",
  "location_type": "string - one of: remote, hybrid, on-site, or empty string if not determinable",
  "is_staffing_agency": "boolean - true if the posting is from a staffing/recruiting agency rather than the actual employer"
}

Rules:
- For pay ranges, extract numbers only (no currency symbols or text). Convert hourly to hourly, annual to annual — do not convert between them.
- For job_description, combine all relevant sections (description, responsibilities, requirements, qualifications) into one clean readable block. Remove duplicated content.
- If the company name appears to be a staffing/recruiting agency posting on behalf of an unnamed client, set is_staffing_agency to true and use the agency name as company_name.
- Strip formatting artifacts like &nbsp;, "Content has loaded", etc.
- Return empty strings or null for fields you cannot determine.

Raw text from job posting page:
${rawText}`;
}

export function parseExtractionResponse(responseText: string): ExtractedJobFields {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(cleaned);
  return extractedJobFieldsSchema.parse(parsed);
}

export async function extractJobFields(rawText: string): Promise<ExtractedJobFields> {
  const prompt = buildExtractionPrompt(rawText);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return parseExtractionResponse(content.text);
}
