# ATS Score Feature — Design Spec

## Date
2026-03-23

## Overview
An 8-factor ATS (Applicant Tracking System) scoring system that analyzes resumes against job descriptions. The feature serves two purposes:
1. **Generation results enhancement** — side-by-side comparison of base vs. tailored resume ATS scores on the results page
2. **Standalone public tool** — free lead-generation tool at `/tools/ats-score` for anyone to analyze their resume

## Scoring Factors

Each factor scores 0–100. The overall score is a weighted average.

| Factor | Weight | Description |
|---|---|---|
| Keyword Match | 20% | Percentage of key skills, tools, and terms from the JD found in the resume |
| Contextual Relevance | 15% | Depth of experience around keywords — measures meaningful context, not just word frequency, to avoid keyword stuffing |
| Text Formatting Quality | 15% | Evaluates detectable formatting issues in text: inconsistent date formats, special characters, missing section headers, inconsistent bullet styles, improper capitalization |
| Job Title Alignment | 10% | How closely the candidate's job titles match the target role |
| Years of Experience | 10% | Total years of experience compared to JD requirements |
| Section Completeness | 10% | Presence of standard sections: contact info, summary, experience, education, skills |
| Action Verb Usage | 10% | Whether bullet points begin with strong action verbs |
| Measurable Results | 10% | Whether bullets include quantifiable achievements (numbers, percentages, dollar amounts) |

**Note:** The "Text Formatting Quality" factor replaces the original "Formatting Compliance" concept. Since both the public tool and generation flow work with plain text (not original file formats), we cannot detect tables, columns, images, or fonts. Instead, this factor evaluates text-level formatting consistency and professionalism that ATS systems can parse.

## User Flow

### 1. Generation Results Page (Logged-In Users)

After the tailored resume comes back from Make.com:
- The results page triggers ATS scoring client-side (two API calls: base resume + tailored resume)
- Displayed as two columns: "Your Original Resume" vs. "Tailored Resume"
- Each column shows the 8 factor scores plus the overall weighted score
- Color coding per factor: red (0–49), yellow (50–74), green (75–100)
- The overall score is displayed prominently at the top of each column
- Loading skeleton shown while scores are being computed
- If scoring fails, the generation results still display normally with a message: "ATS scores unavailable"
- For generations created before this feature, show: "ATS scores are not available for this generation. Submit a new job to see scores."

### 2. Standalone Public Tool (Anyone)

- Public page at `/tools/ats-score` — no login required
- User pastes resume text and job description into two text areas
- Optionally enters the target job title (improves Job Title Alignment scoring)
- Click "Analyze" to get results
- Returns the 8-factor breakdown for that single resume
- CTA at the bottom: "Want to improve this score? Sign up and we'll tailor your resume automatically"
- For logged-in users, also accessible from the dashboard navigation
- SEO optimized: title "Free ATS Resume Score Checker", meta description targeting job seekers, server-rendered for crawlability

## Technical Architecture

### API Route: `/api/ats-score`

- **Method:** POST
- **Auth:** Not required (public tool). If auth token is present, user context is available but not enforced.
- **Input limits:** `resume_content` max 15,000 characters, `job_description` max 10,000 characters. Returns 400 if exceeded.
- **Request body:**
  ```json
  {
    "resume_content": "string (required, max 15000 chars)",
    "job_description": "string (required, max 10000 chars)",
    "job_title": "string (optional, max 200 chars)"
  }
  ```
- **Success response (200):**
  ```json
  {
    "overall_score": 78,
    "factors": {
      "keyword_match": { "score": 82, "explanation": "Brief explanation" },
      "contextual_relevance": { "score": 75, "explanation": "Brief explanation" },
      "text_formatting_quality": { "score": 90, "explanation": "Brief explanation" },
      "job_title_alignment": { "score": 70, "explanation": "Brief explanation" },
      "years_of_experience": { "score": 65, "explanation": "Brief explanation" },
      "section_completeness": { "score": 85, "explanation": "Brief explanation" },
      "action_verb_usage": { "score": 80, "explanation": "Brief explanation" },
      "measurable_results": { "score": 72, "explanation": "Brief explanation" }
    }
  }
  ```
- **Error responses:**
  - `400`: `{ "error": "Resume content is required", "code": "INVALID_INPUT" }`
  - `400`: `{ "error": "Resume content exceeds 15000 character limit", "code": "INPUT_TOO_LONG" }`
  - `429`: `{ "error": "Rate limit exceeded. Try again later.", "code": "RATE_LIMITED" }`
  - `500`: `{ "error": "Failed to compute ATS score", "code": "SCORING_FAILED" }`
- **LLM Provider:** Anthropic API (Claude) for MVP. Using `@anthropic-ai/sdk` which is already a project dependency.
- **LLM Settings:** `temperature: 0` for consistent, reproducible scoring.
- **Rate limiting:** 10 requests/hour per IP for unauthenticated requests. No limit for authenticated users (credits not consumed).

### LLM Prompt Design

A single structured prompt that:
- Receives resume text, job description, and optional job title
- Evaluates each of the 8 factors independently
- Returns valid JSON with scores (0–100) and brief explanations per factor
- Uses Anthropic's tool use (structured output) to enforce JSON schema compliance
- Enforces contextual analysis for keyword matching (not just word counting)
- Attempts to extract years of experience from date ranges in the resume and requirements from the JD
- Uses `temperature: 0` for deterministic scoring

### Generation Flow Integration — Decoupled Scoring

ATS scoring is **decoupled** from the Make.com callback to avoid fragility:

1. The callback route saves the tailored resume and cover letter, marks the generation as `completed` — unchanged from current behavior
2. When the results page loads, the frontend checks if `base_ats_scores` and `tailored_ats_scores` are null
3. If null, the frontend calls `/api/ats-score` twice (base resume + tailored resume) and displays results with a loading skeleton
4. A separate API route `/api/generations/[id]/ats-scores` saves the computed scores to the generation record for future page loads
5. On subsequent visits, scores load from the database without re-computing

**Failure handling:** If ATS scoring fails, the generation results page still displays the resume preview, cover letter preview, and download buttons normally. A message shows: "ATS scores unavailable — try refreshing the page." The generation is never marked as failed due to scoring issues.

**Prerequisite:** ATS scoring for the base resume only runs if the resume's `raw_text_content` is non-null and non-empty. If text extraction was incomplete, the base score column shows: "Original resume text not available for scoring."

### Standalone Flow

- No database storage — scores are computed and returned in real-time
- No credits consumed
- No login required

## Database Changes

Add two nullable JSONB columns to the `generations` table:

```sql
ALTER TABLE generations ADD COLUMN base_ats_scores JSONB;
ALTER TABLE generations ADD COLUMN tailored_ats_scores JSONB;
```

Each column stores the full scoring response (overall score + 8 factor scores with explanations).

**Validation:** A Zod schema validates both the API response from the LLM and the data before storing to JSONB, preventing schema drift.

**Existing generations:** Rows created before this feature will have `null` for both columns. The UI handles this gracefully (see User Flow section).

## New API Routes

### `POST /api/ats-score`
Public scoring endpoint (described above).

### `POST /api/generations/[id]/ats-scores`
Authenticated endpoint that saves computed ATS scores to a generation record.
- **Auth:** Required (must own the generation)
- **Request body:** `{ "base_ats_scores": {...}, "tailored_ats_scores": {...} }`
- **Response:** `{ "success": true }`

## New UI Components

### `ATSScoreCard`
- Reusable component showing the 8-factor breakdown
- Overall score displayed prominently at top (large circular or badge display)
- Each factor shown as a labeled horizontal bar with score
- Color coding: red (0–49), yellow (50–74), green (75–100)
- Brief explanation text below each bar (expandable or on hover)
- Loading skeleton state for when scores are being computed

### `ATSComparison`
- Side-by-side wrapper using two `ATSScoreCard` components
- Column headers: "Your Original Resume" and "Tailored Resume"
- Used on the generation results page
- Handles null/loading/error states for each column independently

### Public ATS Tool Page (`/tools/ats-score`)
- Two text areas: resume content and job description
- Optional job title input field
- Character count indicators showing limits
- "Analyze" button with loading state
- Results section with `ATSScoreCard`
- CTA banner linking to sign-up
- Server-rendered for SEO

## Document Generation Changes

No changes needed. The current document templates already use ATS-friendly formatting (no tables, no columns, no images, clean section structure).

## Make.com Prompt Changes

No changes required for the ATS scoring itself (scoring happens in the app, not Make.com).

Optional enhancement to the resume tailoring prompt in Make.com:
> "Ensure bullet points begin with strong action verbs and include measurable results with specific numbers, percentages, or dollar amounts where the source resume supports it."

This would help the tailored resume score higher on Action Verb Usage and Measurable Results without changing the overall prompt structure.

## Environment Variables

New env var needed:
- `ANTHROPIC_API_KEY` — for the ATS scoring LLM calls from the app (using Claude API)

## Out of Scope

- Historical score tracking across multiple generations
- Score comparison across different job applications
- Custom factor weights per user
- PDF/DOCX parsing in the public tool (text paste only for MVP)
- Re-scoring button for existing generations (future enhancement)
- A/B testing different scoring prompts
