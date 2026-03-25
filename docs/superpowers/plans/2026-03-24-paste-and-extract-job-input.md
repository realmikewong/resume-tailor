# Paste-and-Extract Job Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unreliable URL scraper with a paste-and-extract approach where users paste raw job posting text and Claude extracts structured fields.

**Architecture:** New `/api/extract-job` route calls Anthropic Claude to extract structured job fields from pasted text. A new `PasteJobInput` component replaces `ScrapeInput`, providing a textarea with instructions and an "Extract Job Details" button. The existing `JobForm` component is reused unchanged for the confirmation step. The old scraper, scrape API route, and OpenAI dependency are removed.

**Tech Stack:** Anthropic Claude API (`@anthropic-ai/sdk`), Next.js API routes, React, Zod for validation

**Spec:** `docs/superpowers/specs/2026-03-24-paste-and-extract-job-input-design.md`

---

## File Structure

### Create
- `src/lib/job-extractor.ts` — Claude prompt and extraction logic (single responsibility: call Claude, parse response)
- `src/lib/job-extractor-schemas.ts` — Zod schemas for extraction request/response validation
- `src/app/api/extract-job/route.ts` — POST endpoint that accepts raw text and returns extracted fields
- `src/components/jobs/paste-job-input.tsx` — Textarea with instructions, extract button, and manual entry button
- `__tests__/lib/job-extractor-schemas.test.ts` — Schema validation tests
- `__tests__/lib/job-extractor.test.ts` — Extractor logic tests

### Modify
- `src/app/dashboard/jobs/new/page.tsx` — Replace `ScrapeInput` with `PasteJobInput`, update handler names
- `package.json` — Remove `openai` and `cheerio` dependencies

### Remove
- `src/app/api/scrape/route.ts` — No longer needed
- `src/lib/scraper.ts` — No longer needed
- `src/components/jobs/scrape-input.tsx` — Replaced by `paste-job-input.tsx`

---

### Task 1: Extraction Schemas

**Files:**
- Create: `src/lib/job-extractor-schemas.ts`
- Create: `__tests__/lib/job-extractor-schemas.test.ts`

- [ ] **Step 1: Write the schema tests**

```typescript
// __tests__/lib/job-extractor-schemas.test.ts
import { extractJobRequestSchema, extractedJobFieldsSchema } from '@/lib/job-extractor-schemas';

describe('extractJobRequestSchema', () => {
  it('accepts valid raw_text input', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: 'Some job posting text here' });
    expect(result.success).toBe(true);
  });

  it('rejects empty raw_text', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: '' });
    expect(result.success).toBe(false);
  });

  it('rejects raw_text under 50 characters', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('rejects raw_text over 50000 characters', () => {
    const result = extractJobRequestSchema.safeParse({ raw_text: 'a'.repeat(50001) });
    expect(result.success).toBe(false);
  });
});

describe('extractedJobFieldsSchema', () => {
  it('accepts valid extracted fields', () => {
    const result = extractedJobFieldsSchema.safeParse({
      company_name: 'Apple',
      job_title: 'Software Engineer',
      job_description: 'Build great products',
      pay_range_low: 120000,
      pay_range_high: 180000,
      job_location: 'Cupertino, CA',
      location_type: 'on-site',
      is_staffing_agency: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null pay ranges', () => {
    const result = extractedJobFieldsSchema.safeParse({
      company_name: 'Apple',
      job_title: 'Software Engineer',
      job_description: 'Build great products',
      pay_range_low: null,
      pay_range_high: null,
      job_location: '',
      location_type: '',
      is_staffing_agency: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = extractedJobFieldsSchema.safeParse({
      company_name: 'Apple',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/mikewong/resume-tailor && npx jest __tests__/lib/job-extractor-schemas.test.ts --no-cache`
Expected: FAIL — module `@/lib/job-extractor-schemas` not found

- [ ] **Step 3: Write the schemas**

```typescript
// src/lib/job-extractor-schemas.ts
import { z } from 'zod';

export const extractJobRequestSchema = z.object({
  raw_text: z
    .string()
    .min(50, 'Please paste more of the job posting content')
    .max(50000, 'Content is too long. Please paste only the job posting.'),
});

export type ExtractJobRequest = z.infer<typeof extractJobRequestSchema>;

export const extractedJobFieldsSchema = z.object({
  company_name: z.string(),
  job_title: z.string(),
  job_description: z.string(),
  pay_range_low: z.number().nullable(),
  pay_range_high: z.number().nullable(),
  job_location: z.string(),
  location_type: z.enum(['remote', 'hybrid', 'on-site', '']),
  is_staffing_agency: z.boolean(),
});

export type ExtractedJobFields = z.infer<typeof extractedJobFieldsSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/mikewong/resume-tailor && npx jest __tests__/lib/job-extractor-schemas.test.ts --no-cache`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/mikewong/resume-tailor
git add src/lib/job-extractor-schemas.ts __tests__/lib/job-extractor-schemas.test.ts
git commit -m "feat: add Zod schemas for job extraction request and response"
```

---

### Task 2: Job Extractor Library

**Files:**
- Create: `src/lib/job-extractor.ts`
- Create: `__tests__/lib/job-extractor.test.ts`

- [ ] **Step 1: Write the extractor tests**

```typescript
// __tests__/lib/job-extractor.test.ts
import { buildExtractionPrompt, parseExtractionResponse } from '@/lib/job-extractor';

describe('buildExtractionPrompt', () => {
  it('includes the raw text in the prompt', () => {
    const prompt = buildExtractionPrompt('Some job posting about Apple');
    expect(prompt).toContain('Some job posting about Apple');
  });

  it('instructs Claude to return JSON', () => {
    const prompt = buildExtractionPrompt('test');
    expect(prompt).toContain('JSON');
  });
});

describe('parseExtractionResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      company_name: 'Apple',
      job_title: 'Software Engineer',
      job_description: 'Build great products',
      pay_range_low: 120000,
      pay_range_high: 180000,
      job_location: 'Cupertino, CA',
      location_type: 'on-site',
      is_staffing_agency: false,
    });
    const result = parseExtractionResponse(json);
    expect(result.company_name).toBe('Apple');
    expect(result.job_title).toBe('Software Engineer');
    expect(result.is_staffing_agency).toBe(false);
  });

  it('strips markdown code fences before parsing', () => {
    const json = '```json\n{"company_name":"Apple","job_title":"Engineer","job_description":"Build things","pay_range_low":null,"pay_range_high":null,"job_location":"","location_type":"","is_staffing_agency":false}\n```';
    const result = parseExtractionResponse(json);
    expect(result.company_name).toBe('Apple');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseExtractionResponse('not json')).toThrow();
  });

  it('throws on missing required fields', () => {
    const json = JSON.stringify({ company_name: 'Apple' });
    expect(() => parseExtractionResponse(json)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/mikewong/resume-tailor && npx jest __tests__/lib/job-extractor.test.ts --no-cache`
Expected: FAIL — module `@/lib/job-extractor` not found

- [ ] **Step 3: Write the extractor**

```typescript
// src/lib/job-extractor.ts
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
  // Strip markdown code fences if present
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/mikewong/resume-tailor && npx jest __tests__/lib/job-extractor.test.ts --no-cache`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/mikewong/resume-tailor
git add src/lib/job-extractor.ts __tests__/lib/job-extractor.test.ts
git commit -m "feat: add job extractor library with Claude prompt and parser"
```

---

### Task 3: Extract Job API Route

**Files:**
- Create: `src/app/api/extract-job/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
// src/app/api/extract-job/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractJobRequestSchema } from '@/lib/job-extractor-schemas';
import { extractJobFields } from '@/lib/job-extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = extractJobRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const fields = await extractJobFields(validated.data.raw_text);

    return NextResponse.json({ fields });
  } catch (error) {
    console.error('Job extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to extract job details', details: message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/mikewong/resume-tailor && npx next build 2>&1 | tail -20`
Expected: Build succeeds, `/api/extract-job` appears in the routes list

- [ ] **Step 3: Commit**

```bash
cd /Users/mikewong/resume-tailor
git add src/app/api/extract-job/route.ts
git commit -m "feat: add /api/extract-job route for paste-and-extract flow"
```

---

### Task 4: PasteJobInput Component

**Files:**
- Create: `src/components/jobs/paste-job-input.tsx`

- [ ] **Step 1: Write the component**

Read the existing `ScrapeInput` component at `src/components/jobs/scrape-input.tsx` to understand the interface contract. The new component must call `onExtracted(fields, rawText)` on success and `onSkip()` for manual entry, matching the callback pattern.

```typescript
// src/components/jobs/paste-job-input.tsx
'use client';

import { useState } from 'react';
import type { ExtractedJobFields } from '@/lib/job-extractor-schemas';

interface PasteJobInputProps {
  onExtracted: (fields: ExtractedJobFields) => void;
  onSkip: () => void;
}

const MAX_CHARS = 50000;

export function PasteJobInput({ onExtracted, onSkip }: PasteJobInputProps) {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (rawText.trim().length < 50) {
      setError('Please paste more of the job posting content.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText.slice(0, MAX_CHARS) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Extraction failed');
      }

      const data = await res.json();
      onExtracted(data.fields);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't extract the job details. Please try again or enter them manually."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Paste Job Posting</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
          <li>Find the job posting online</li>
          <li>
            Press <kbd className="px-2 py-0.5 bg-gray-100 border rounded text-sm font-mono">⌘A</kbd>{' '}
            or{' '}
            <kbd className="px-2 py-0.5 bg-gray-100 border rounded text-sm font-mono">Ctrl+A</kbd>{' '}
            to select everything on the page
          </li>
          <li>Paste it in the field below</li>
        </ol>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="raw-text" className="text-sm font-medium text-gray-700">
            Job Posting Content
          </label>
          <span className="text-sm text-gray-400">
            {rawText.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
          </span>
        </div>
        <textarea
          id="raw-text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the entire job posting page here..."
          rows={12}
          maxLength={MAX_CHARS}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleExtract}
          disabled={loading || rawText.trim().length < 50}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Extracting...
            </span>
          ) : (
            'Extract Job Details'
          )}
        </button>
        <button
          onClick={onSkip}
          disabled={loading}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Enter Manually Instead
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/mikewong/resume-tailor && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
cd /Users/mikewong/resume-tailor
git add src/components/jobs/paste-job-input.tsx
git commit -m "feat: add PasteJobInput component with instructions and extract button"
```

---

### Task 5: Wire Up New Job Page

**Files:**
- Modify: `src/app/dashboard/jobs/new/page.tsx`

- [ ] **Step 1: Read the current page**

Read `src/app/dashboard/jobs/new/page.tsx` to understand all the imports and handler connections. Key things to change:
1. Replace `import { ScrapeInput }` with `import { PasteJobInput }`
2. Rename `handleScraped` to `handleExtracted` — same logic, receives fields
3. Replace `<ScrapeInput onScraped={handleScraped} onSkip={handleSkipScrape} />` with `<PasteJobInput onExtracted={handleExtracted} onSkip={handleSkipScrape} />`

- [ ] **Step 2: Update imports**

In `src/app/dashboard/jobs/new/page.tsx`, replace:
```typescript
import { ScrapeInput } from '@/components/jobs/scrape-input';
```
with:
```typescript
import { PasteJobInput } from '@/components/jobs/paste-job-input';
```

- [ ] **Step 3: Update handler name**

Rename the `handleScraped` function to `handleExtracted`. The function body stays the same — it receives fields and populates the form state.

- [ ] **Step 4: Update JSX**

Replace the `<ScrapeInput>` usage in the `input` step with:
```tsx
<PasteJobInput onExtracted={handleExtracted} onSkip={handleSkipScrape} />
```

- [ ] **Step 5: Add staffing agency note to details step**

In the `details` step (where `JobForm` is rendered), add a conditional note above the form if the extracted fields indicate a staffing agency:

```tsx
{isStaffingAgency && (
  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-4">
    This appears to be posted by a recruiting agency. Please verify the company name.
  </div>
)}
```

Add `isStaffingAgency` to the component state, set it in `handleExtracted` from `fields.is_staffing_agency`.

- [ ] **Step 6: Verify build compiles**

Run: `cd /Users/mikewong/resume-tailor && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
cd /Users/mikewong/resume-tailor
git add src/app/dashboard/jobs/new/page.tsx
git commit -m "feat: replace ScrapeInput with PasteJobInput on job submission page"
```

---

### Task 6: Remove Old Scraper Code and OpenAI Dependency

**Files:**
- Remove: `src/app/api/scrape/route.ts`
- Remove: `src/lib/scraper.ts`
- Remove: `src/components/jobs/scrape-input.tsx`
- Modify: `package.json` — remove `openai` and `cheerio`

- [ ] **Step 1: Delete old files**

```bash
cd /Users/mikewong/resume-tailor
rm src/app/api/scrape/route.ts
rm src/lib/scraper.ts
rm src/components/jobs/scrape-input.tsx
```

- [ ] **Step 2: Remove OpenAI and Cheerio dependencies**

```bash
cd /Users/mikewong/resume-tailor
npm uninstall openai cheerio
```

- [ ] **Step 3: Search for any remaining references**

```bash
cd /Users/mikewong/resume-tailor
grep -r "scrape" src/ --include="*.ts" --include="*.tsx" -l
grep -r "openai" src/ --include="*.ts" --include="*.tsx" -l
grep -r "cheerio" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: No results. If any files still reference the old code, update them.

- [ ] **Step 4: Verify build compiles**

Run: `cd /Users/mikewong/resume-tailor && npx next build 2>&1 | tail -20`
Expected: Build succeeds with no missing module errors

- [ ] **Step 5: Run all tests**

Run: `cd /Users/mikewong/resume-tailor && npx jest --no-cache`
Expected: All tests pass (old scraper had no tests, so nothing should break)

- [ ] **Step 6: Commit**

```bash
cd /Users/mikewong/resume-tailor
git add -A
git commit -m "chore: remove URL scraper, OpenAI and Cheerio dependencies"
```

---

### Task 7: End-to-End Verification

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/mikewong/resume-tailor && npx jest --no-cache
```

Expected: All tests pass

- [ ] **Step 2: Run production build**

```bash
cd /Users/mikewong/resume-tailor && npx next build
```

Expected: Build succeeds. Routes list shows `/api/extract-job` and does NOT show `/api/scrape`

- [ ] **Step 3: Manual test locally (if dev server available)**

1. Start dev server: `npm run dev`
2. Navigate to `/dashboard/jobs/new`
3. Verify paste textarea appears with numbered instructions
4. Paste a job posting, click "Extract Job Details"
5. Verify fields are pre-populated in the form
6. Click "Enter Manually Instead" — verify form appears empty
7. Verify no references to URL input or scraping in the UI

- [ ] **Step 4: Push to feature branch and create PR**

```bash
cd /Users/mikewong/resume-tailor
git checkout -b feature/paste-and-extract
git push -u origin feature/paste-and-extract
gh pr create --title "feat: replace URL scraper with paste-and-extract job input" --body "$(cat <<'EOF'
## Summary
- Replaces the unreliable URL scraper with a paste-and-extract approach
- Users copy-paste the full job posting page content into a textarea
- Claude extracts company name, job title, description, pay, location, and location type
- Detects staffing agency postings and prompts user to verify company name
- Removes OpenAI and Cheerio dependencies entirely

## Changes
- **New:** `/api/extract-job` route, `PasteJobInput` component, job extractor library with Zod schemas
- **Removed:** `/api/scrape` route, `scraper.ts`, `ScrapeInput` component, `openai` and `cheerio` packages
- **Modified:** Job submission page wired to new paste-and-extract flow

## Test plan
- [ ] All tests pass (`npx jest`)
- [ ] Build succeeds (`npx next build`)
- [ ] Paste a full job posting page → fields extracted correctly
- [ ] Click "Enter Manually Instead" → empty form appears
- [ ] Staffing agency posting → yellow note appears above form
- [ ] Verify `ANTHROPIC_API_KEY` is set in Vercel environment variables

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
