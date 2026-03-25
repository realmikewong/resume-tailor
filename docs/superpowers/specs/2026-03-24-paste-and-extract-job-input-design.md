# Paste-and-Extract Job Input — Design Spec

## Problem

The current URL scraper is unreliable as the first step in the job submission flow. Job board sites use JavaScript rendering, anti-bot protections, and dynamic content that cause frequent scraping failures. When the scraper fails, it creates a bad first impression and forces users into manual entry.

Users already have the job posting content in front of them in their browser. We should let them give it to us directly.

## Solution

Replace the URL scraper with a paste-and-extract approach. The user copies the entire job posting page, pastes it into a single textarea, and Claude extracts the structured fields automatically. Structured fields are shown for user confirmation before proceeding.

## User Flow

### Step 1: Paste

Display clear instructions above a large textarea:

1. Find the job posting online
2. Press ⌘A / Ctrl+A to select everything on the page
3. Paste it in the field below

Below the textarea, two buttons side by side:
- **Primary button:** "Extract Job Details"
- **Secondary button (outlined):** "Enter Manually Instead"

The secondary button is styled as a visible outlined/gray button, not a text link, so users can easily find the manual entry option.

### Step 2: Confirm

Pre-filled structured fields appear:
- Company Name (text input, required)
- Job Title (text input, required)
- Job Description (textarea, required)
- Pay Range Low / High (number inputs, optional)
- Job Location (text input, optional)
- Location Type (select: Remote, Hybrid, On-site, optional)

All fields are editable so the user can correct anything Claude got wrong.

For staffing agency postings, display a subtle note: "This appears to be posted by a recruiting agency. Please verify the company name."

### Steps 3–5: Unchanged

Template picker → processing → results. No changes to these steps.

## Technical Design

### New API Route: `POST /api/extract-job`

**Input:**
```json
{
  "raw_text": "string (the full pasted content, up to 50,000 characters)"
}
```

**Process:**
1. Validate input (non-empty, within character limit)
2. Call Anthropic Claude API with extraction prompt
3. Parse structured JSON response
4. Return extracted fields

**Output:**
```json
{
  "company_name": "string",
  "job_title": "string",
  "job_description": "string",
  "pay_range_low": "number | null",
  "pay_range_high": "number | null",
  "job_location": "string",
  "location_type": "remote | hybrid | on-site | ''",
  "is_staffing_agency": "boolean"
}
```

**Authentication:** Not required. This step is pre-generation and consumes no credits.

**Error handling:** Returns 400 for invalid input, 500 for extraction failures with a message prompting manual entry.

### Extraction Prompt

The Claude prompt instructs the model to:
- Identify and extract only the job posting content from the pasted text
- Ignore navigation menus, footers, sidebars, cookie banners, and site chrome
- Ignore EEO/legal boilerplate and duplicated sections
- Clean up formatting artifacts (e.g., `&nbsp;`, "Content has loaded")
- Extract pay as numbers only (strip currency symbols and text)
- Detect whether the posting is from a staffing/recruiting agency vs. the actual employer
- Return empty strings or null for fields that cannot be determined
- Return a clean, readable job description without headers like "Full job description"

### New Component: `PasteJobInput`

Replaces the existing `ScrapeInput` component. Contains:
- Instructional steps (numbered list)
- Textarea with character count (limit: 50,000 characters)
- Primary "Extract Job Details" button with loading state
- Secondary outlined "Enter Manually Instead" button
- Error display area

**Loading state:** While extracting, the primary button shows a spinner with "Extracting..." text.

**Error state:** If extraction fails, show a message like "We couldn't extract the job details. Please try again or enter them manually." with the manual entry button still visible.

### Files to Remove

- `/src/app/api/scrape/route.ts` — replaced by `/api/extract-job`
- `/src/lib/scraper.ts` — no longer needed
- OpenAI SDK dependency (`openai` package) — only used for scraping
- `OPENAI_API_KEY` environment variable — no longer needed

### Files to Modify

- `/src/components/jobs/scrape-input.tsx` → rename/replace with `paste-job-input.tsx`
- `/src/app/dashboard/jobs/new/page.tsx` — wire up paste flow instead of scrape flow, update `handleScraped` to `handleExtracted`
- `scrape_status` field in job records: use value `"extracted"` instead of `"scraped"` for paste-and-extract submissions

### Files to Create

- `/src/app/api/extract-job/route.ts` — new API route
- `/src/lib/job-extractor.ts` — extraction logic with Claude prompt
- `/src/components/jobs/paste-job-input.tsx` — new paste input component

## Database Changes

None. The `scrape_status` column on the `jobs` table already accepts string values. We simply use `"extracted"` for paste-and-extract submissions and `"manual"` for manual entry, replacing `"scraped"`.

## Edge Cases

- **Empty paste:** Validate minimum content length before calling the API. Show "Please paste the job posting content" error.
- **Non-job content:** Claude returns empty/null fields. User sees empty form and can enter manually.
- **Staffing agency postings:** Claude detects this and sets `is_staffing_agency: true`. UI shows a note prompting the user to verify the company name.
- **Extremely long paste:** Enforce a 50,000 character limit on the textarea. Content beyond the limit is truncated before sending to Claude.
- **Multiple job postings pasted:** Claude extracts the first/primary posting. Edge case is rare and the user can correct in the confirmation step.

## Benefits

- **100% reliable input** — user always has the content, no scraping failures
- **Faster** — no HTTP fetch or HTML parsing, one Claude API call on clean text
- **Simpler codebase** — remove scraper, remove OpenAI dependency
- **Better first impression** — the first step always works
- **Universal compatibility** — works with any job board, email, PDF, or document the user can copy text from
- **Reduced dependencies** — removes OpenAI SDK entirely from the project
