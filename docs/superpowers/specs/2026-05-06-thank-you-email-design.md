# Thank You Email Tool — Design Spec

**Date:** 2026-05-06  
**Status:** Approved

## Overview

A free, public tool at `/tools/thank-you-email` that generates a personalized post-interview thank you email. Takes the job description, the candidate's resume, interviewer details, and a memorable moment from the conversation — streams back a ready-to-send email with a subject line.

No login required. No credits. Accessible to anyone.

Logged-in users can reach it from their generation detail page with job description and tailored resume pre-filled, so they only need to add three fields.

## User Flows

### Standalone (no login / no generation context)
1. User navigates to `/tools/thank-you-email`
2. Fills in: job description, resume text, interviewer name, interviewer title, memorable moment
3. Clicks Generate — email streams in live
4. Copies to clipboard

### Pre-filled (from generation results page)
1. User completes a resume generation at `/dashboard/generations/[id]`
2. Sees "Ready to follow up?" CTA at the bottom of the completed results page
3. Clicks → navigates to `/tools/thank-you-email?generation_id=<id>`
4. Page loads with job description and tailored resume pre-filled, shown as a green "loaded" banner
5. User fills in: interviewer name, interviewer title, memorable moment
6. Clicks Generate — email streams in live
7. Copies to clipboard

## Architecture

### Files

| File | Type | Purpose |
|------|------|---------|
| `src/app/tools/thank-you-email/page.tsx` | Server component | Reads `generation_id` from searchParams, fetches pre-fill data, renders form |
| `src/components/thank-you/thank-you-email-form.tsx` | Client component | Form state, streaming, copy-to-clipboard |
| `src/app/api/thank-you-email/route.ts` | API route | Validates input, calls Anthropic with streaming |
| `src/app/dashboard/generations/[id]/page.tsx` | Existing file | Small CTA addition below cover letter preview |

### 1. Page Component (`/tools/thank-you-email/page.tsx`)

Server component. Reads `generation_id` from `searchParams`. If present:
- Creates a Supabase server client
- Fetches the generation joining jobs and resumes: `select("*, jobs(*), resumes(*)")`
- No auth check — if generation not found or query fails, silently falls back to `null` prefill (full paste form renders)
- Extracts `job_description` from `jobs`, `tailored_resume_content ?? resumes.raw_text_content` as the resume content (fallback to base resume if tailored content is absent), `company_name` and `job_title` from `jobs`

Passes `prefill` prop to `ThankYouEmailForm`:

```ts
type Prefill = {
  jobDescription: string;
  resumeContent: string;
  companyName: string;
  jobTitle: string;
} | null;
```

### 2. Client Form Component (`ThankYouEmailForm`)

**Props:** `prefill: Prefill`

**State:**
- `jobDescription`, `resumeContent` — initialized from prefill if present
- `interviewerName`, `interviewerTitle`, `memorableMoment` — always empty on load
- `isEditing: boolean` — controls visibility of job/resume textareas when prefill is present (default `false`)
- `emailContent: string` — accumulated streaming output
- `isGenerating: boolean`
- `error: string | null`
- `isCopied: boolean` — drives "Copied!" feedback on the copy button

**Rendering modes:**

When `prefill` is present:
- Shows a green banner: "✅ [Job Title] at [Company] — job & resume loaded" with an "Edit ▾" toggle
- Job description and resume textareas hidden by default; toggle reveals them for override
- Only three fields visible: interviewer name, interviewer title, memorable moment

When `prefill` is null:
- Full form: job description textarea, resume textarea, then the three personal fields

**Submit behavior:**
1. Client-side validation: all fields non-empty; show inline error if not
2. POST to `/api/thank-you-email` with `{ job_description, resume_content, interviewer_name, interviewer_title, memorable_moment }`
3. Read response as `ReadableStream` via `reader = response.body.getReader()`
4. Decode and append each chunk to `emailContent` — component re-renders as text accumulates
5. On stream end: set `isGenerating = false`

**Copy button:**
- Appears once `emailContent` is non-empty
- `navigator.clipboard.writeText(emailContent)` → sets `isCopied = true` for 2 seconds, then resets
- If clipboard API unavailable: catch error silently, show "Copy failed" briefly

### 3. API Route (`/api/thank-you-email`)

**Method:** POST  
**Auth:** None

**Zod input schema:**
```ts
{
  job_description:   string, max 10 000 chars
  resume_content:    string, max 8 000 chars
  interviewer_name:  string, max 100 chars
  interviewer_title: string, max 200 chars
  memorable_moment:  string, max 1 000 chars
}
```

All fields required. Returns `400` with `{ error, code: "INVALID_INPUT" }` on validation failure, matching the existing ATS score error shape.

**Anthropic call:**
- Model: `claude-haiku-4-5-20251001` (fast, low-cost — appropriate for a free tool)
- `max_tokens: 500`
- Uses `anthropic.messages.stream()`
- Pipes text deltas into a `TransformStream`, returns `new Response(readable, { headers: { "Content-Type": "text/plain" } })`

**System prompt:**
```
You are a professional career coach writing a post-interview thank you email on behalf of a job candidate. Write concisely and authentically. Output the email only — no commentary, no markdown, no code blocks.
```

**User prompt:**
```
Write a thank you email with the following details:

Interviewer: [interviewer_name], [interviewer_title]
Memorable moment from the interview: [memorable_moment]

Candidate's resume:
[resume_content]

Job description:
[job_description]

Requirements:
- Include a subject line on the first line (format: "Subject: ...")
- Blank line, then the email body
- Greet the interviewer by first name
- Express genuine gratitude for their time
- Reference the memorable moment naturally in 1-2 sentences
- Connect one relevant aspect of the candidate's background to the role
- Keep it 150-200 words total
- Professional but warm tone
- End with a forward-looking close
```

**Error handling:**
- Anthropic error: return `500` with `{ error: "Failed to generate email" }`

### 4. Generation Page CTA

In `src/app/dashboard/generations/[id]/page.tsx`, inside the `status === "completed"` block, after the cover letter preview section:

```tsx
<div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
  <p className="font-medium text-gray-900">Ready to follow up?</p>
  <p className="text-sm text-gray-600 mt-1">
    Write a personalized thank you email using your tailored resume.
  </p>
  <Link
    href={`/tools/thank-you-email?generation_id=${generation.id}`}
    className="inline-block mt-3 text-sm font-medium text-blue-600 hover:underline"
  >
    Write Thank You Email →
  </Link>
</div>
```

## Error Handling Summary

| Scenario | Behavior |
|----------|----------|
| Invalid/missing `generation_id` | Silently falls back to full paste form |
| Generation found but belongs to different user | Falls back to full paste form (no error exposed) |
| Form submitted with empty fields | Inline validation error below submit button |
| Anthropic API failure | "Something went wrong. Please try again." error message |
| Clipboard API unavailable | "Copy failed" shown briefly, no crash |

## Non-Goals (v1)

- No credit deduction
- No saving or persisting generated emails
- No email delivery (copy-to-clipboard only)
- No rate limiting
- No multiple-interviewer support (one email per generation)
