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
| Formatting Compliance | 15% | Avoids ATS-unfriendly elements: tables, columns, headers/footers, images, fancy fonts |
| Job Title Alignment | 10% | How closely the candidate's job titles match the target role |
| Years of Experience | 10% | Total years of experience compared to JD requirements |
| Section Completeness | 10% | Presence of standard sections: contact info, summary, experience, education, skills |
| Action Verb Usage | 10% | Whether bullet points begin with strong action verbs |
| Measurable Results | 10% | Whether bullets include quantifiable achievements (numbers, percentages, dollar amounts) |

## User Flow

### 1. Generation Results Page (Logged-In Users)

After the tailored resume comes back from Make.com:
- The app automatically runs ATS analysis on both the base resume and the tailored resume
- Displayed as two columns: "Your Original Resume" vs. "Tailored Resume"
- Each column shows the 8 factor scores plus the overall weighted score
- Color coding per factor: red (0–49), yellow (50–74), green (75–100)
- The overall score is displayed prominently at the top of each column

### 2. Standalone Public Tool (Anyone)

- Public page at `/tools/ats-score` — no login required
- User pastes resume text and job description into two text areas
- Optionally enters the target job title (improves Job Title Alignment scoring)
- Click "Analyze" to get results
- Returns the 8-factor breakdown for that single resume
- CTA at the bottom: "Want to improve this score? Sign up and we'll tailor your resume automatically"
- For logged-in users, also accessible from the dashboard navigation

## Technical Architecture

### API Route: `/api/ats-score`

- **Method:** POST
- **Auth:** Not required (public tool). If auth token is present, user context is available but not enforced.
- **Request body:**
  ```json
  {
    "resume_content": "string (required)",
    "job_description": "string (required)",
    "job_title": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "overall_score": 78,
    "factors": {
      "keyword_match": { "score": 82, "explanation": "Brief explanation" },
      "contextual_relevance": { "score": 75, "explanation": "Brief explanation" },
      "formatting_compliance": { "score": 90, "explanation": "Brief explanation" },
      "job_title_alignment": { "score": 70, "explanation": "Brief explanation" },
      "years_of_experience": { "score": 65, "explanation": "Brief explanation" },
      "section_completeness": { "score": 85, "explanation": "Brief explanation" },
      "action_verb_usage": { "score": 80, "explanation": "Brief explanation" },
      "measurable_results": { "score": 72, "explanation": "Brief explanation" }
    }
  }
  ```
- **LLM Provider:** OpenAI or Anthropic API called directly from the API route
- **Rate limiting:** Recommended for the public endpoint to prevent abuse (e.g., 10 requests/hour per IP)

### LLM Prompt Design

A single structured prompt that:
- Receives resume text, job description, and optional job title
- Evaluates each of the 8 factors independently
- Returns valid JSON with scores (0–100) and brief explanations per factor
- Enforces contextual analysis for keyword matching (not just word counting)
- Attempts to extract years of experience from date ranges in the resume and requirements from the JD

### Generation Flow Integration

When the callback saves the tailored resume and cover letter:
1. The callback route makes two calls to the ATS scoring logic:
   - One for the base/original resume against the JD
   - One for the tailored resume against the JD
2. Both score sets are stored on the `generations` record
3. The results page reads these scores and renders the side-by-side comparison

### Standalone Flow

- No database storage — scores are computed and returned in real-time
- No credits consumed
- No login required

## Database Changes

Add two JSONB columns to the `generations` table:

```sql
ALTER TABLE generations ADD COLUMN base_ats_scores JSONB;
ALTER TABLE generations ADD COLUMN tailored_ats_scores JSONB;
```

Each column stores the full scoring response (overall score + 8 factor scores with explanations).

## New UI Components

### `ATSScoreCard`
- Reusable component showing the 8-factor breakdown
- Overall score displayed prominently at top
- Each factor shown as a labeled horizontal bar with score
- Color coding: red (0–49), yellow (50–74), green (75–100)
- Brief explanation text below each bar (expandable or on hover)

### `ATSComparison`
- Side-by-side wrapper using two `ATSScoreCard` components
- Column headers: "Your Original Resume" and "Tailored Resume"
- Used on the generation results page

### Public ATS Tool Page (`/tools/ats-score`)
- Two text areas: resume content and job description
- Optional job title input field
- "Analyze" button
- Results section with `ATSScoreCard`
- CTA banner linking to sign-up

## Document Generation Changes

No changes needed. The current document templates already use ATS-friendly formatting (no tables, no columns, no images, clean section structure). The formatting compliance factor will validate this.

## Make.com Prompt Changes

No changes required for the ATS scoring itself (scoring happens in the app, not Make.com).

Optional enhancement to the resume tailoring prompt in Make.com:
> "Ensure bullet points begin with strong action verbs and include measurable results with specific numbers, percentages, or dollar amounts where the source resume supports it."

This would help the tailored resume score higher on Action Verb Usage and Measurable Results without changing the overall prompt structure.

## Environment Variables

New env var needed:
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` — for the ATS scoring LLM calls from the app

## Out of Scope

- Historical score tracking across multiple generations
- Score comparison across different job applications
- Custom factor weights per user
- PDF/DOCX parsing in the public tool (text paste only for MVP)
