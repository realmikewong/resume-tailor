# Resume Tailor — Design Spec

## Overview

A web application that helps job seekers generate tailored resumes and cover letters by matching their baseline resume against specific job postings. The app scrapes or accepts manual job posting data, sends it along with the user's resume to an LLM-powered Make.com workflow, and produces professionally formatted Word and PDF documents.

## Goals

- Reduce friction in the job application process by automating resume tailoring
- Provide a daily-use job application tracker to drive engagement
- Ship an MVP quickly for validation with 4 testers
- Keep operating costs predictable via credit-based pricing

## Target User

General job seekers — anyone actively applying to jobs who wants to save time tailoring resumes and cover letters for each application.

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js (React) | Web UI, server-rendered pages |
| Hosting | Vercel | Hosting + serverless functions |
| Auth | Supabase Auth | Magic link (passwordless) authentication |
| Database | Supabase Postgres | User data, jobs, generations, credits |
| File Storage | Supabase Storage | Uploaded resumes, generated documents |
| LLM Orchestration | Make.com | Existing 14-module workflow for resume tailoring + cover letter generation |
| LLM | GPT-4o (via Make.com) | Resume tailoring and cover letter generation |
| Payments | Stripe Checkout | Credit purchases and subscriptions |
| Document Generation | docx + pdf-lib (npm) | Word and PDF output with styled templates |

### Cost Estimate (MVP)

- Supabase: Free tier ($0)
- Vercel: Free tier ($0)
- Make.com: ~$12/month (10,000 credits)
- LLM tokens: Minimal at MVP scale
- Stripe: Pay-as-you-go fees on revenue only
- **Total: ~$12/month before revenue**

## Architecture

### System Layers

1. **Frontend (Next.js on Vercel)** — Server-rendered pages for the dashboard, job tracker, resume upload, and job submission flow.
2. **Auth (Supabase Auth)** — Magic link authentication. Supabase handles email sending, token verification, and session management.
3. **Database (Supabase Postgres)** — Stores users, resumes, jobs, generated documents, credits, and application tracking data.
4. **File Storage (Supabase Storage)** — Stores uploaded baseline resumes and generated output files (Word + PDF). Files are tied to user accounts with row-level security.
5. **Processing Pipeline** — Scraping, Make.com integration, and document generation (detailed in sections below).

### Data Flow

```
User uploads resume + submits job
    → App scrapes URL or accepts manual entry
    → App sends resume content + job data to Make.com webhook
    → Make.com runs LLM workflow (tailors resume + generates cover letter)
    → Make.com POSTs results back to Vercel API route
    → Vercel formats content into Word/PDF using chosen template
    → Files stored in Supabase Storage
    → User downloads documents
```

## Data Model

### profiles

Extends the Supabase-managed `users` table.

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid (FK to users) | Primary key |
| full_name | text | |
| credits_remaining | integer | Default: 3 |
| plan_type | enum | "free", "credit_pack", "subscription" |
| is_admin | boolean | Default: false |
| created_at | timestamp | |
| updated_at | timestamp | |

### resumes

Baseline resume uploads.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid (FK) | |
| file_name | text | Original file name |
| file_path | text | Pointer to Supabase Storage |
| raw_text_content | text | Extracted text sent to Make.com |
| is_active | boolean | User's current default resume |
| created_at | timestamp | |

**Text extraction:** On upload, the server extracts plain text from the file using `mammoth` (for .docx) or `pdf-parse` (for PDF). The extracted text is stored in `raw_text_content` and shown to the user for confirmation before use.

### jobs

Job postings (scraped or manually entered).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid (FK) | |
| source_url | text | Nullable — if URL was provided |
| company_name | text | |
| job_title | text | |
| job_description | text | Full description |
| pay_range_low | numeric | Nullable |
| pay_range_high | numeric | Nullable |
| job_location | text | |
| location_type | enum | "remote", "hybrid", "on-site" |
| scrape_status | enum | "scraped", "manual", "failed" |
| created_at | timestamp | |
| updated_at | timestamp | |

### generations

Each tailored resume + cover letter pair.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid (FK) | |
| job_id | uuid (FK) | |
| resume_id | uuid (FK) | |
| template_choice | enum | "modern", "classic", "minimal" |
| status | enum | "pending", "processing", "completed", "failed" |
| tailored_resume_content | text | Raw content from Make.com |
| cover_letter_content | text | Raw content from Make.com |
| resume_word_file_path | text | Pointer to generated resume Word doc |
| resume_pdf_file_path | text | Pointer to generated resume PDF |
| cover_letter_word_file_path | text | Pointer to generated cover letter Word doc |
| cover_letter_pdf_file_path | text | Pointer to generated cover letter PDF |
| callback_token | uuid | Random token for validating Make.com callback |
| credits_used | integer | Default: 1 |
| created_at | timestamp | |
| updated_at | timestamp | |

### applications

Job application tracker.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid (FK) | |
| job_id | uuid (FK) | |
| generation_id | uuid (FK) | Nullable — not all tracked jobs require a generation |
| status | enum | "generated", "applied", "interviewing", "offered", "rejected", "withdrawn" |
| date_applied | date | Nullable |
| interview_date | date | Nullable — for scheduling tracking |
| notes | text | Nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

### credit_transactions

Audit trail for all credit changes.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid (FK) | |
| amount | integer | Positive for purchases, negative for usage |
| reason | text | e.g., "initial_free", "generation", "purchase" |
| stripe_payment_id | text | Nullable |
| created_at | timestamp | |

## User Interface

### Screens

**1. Landing Page (unauthenticated)**
- Value proposition, how-it-works (3-step visual), pricing info
- Single CTA: "Get Started" → triggers magic link login/signup
- No separate signup vs. login — magic link handles both identically

**2. Dashboard (home after login)**
- Summary cards: credits remaining, active applications, interviews scheduled
- Recent generations with quick download links
- Prominent "+ New Job" action button

**3. Resume Management**
- Drag-and-drop or file picker upload (Word/PDF)
- List of uploaded resumes with one marked as "active"
- User can swap which resume is active
- Preview of extracted text for user confirmation

**4. New Job Submission (core flow — 5 steps)**

- **Step 1 — Job Input:** Paste a URL (app attempts scrape) or click "Enter manually"
- **Step 2 — Job Details:** Pre-filled if scraped (editable), empty if manual. Fields: company name, job title, job description, pay range (optional), job location, location type
- **Step 3 — Confirm & Generate:** Summary + active resume displayed + template picker (visual previews of Modern/Classic/Minimal). "Generate (1 credit)" button. Credit purchase prompt if insufficient.
- **Step 4 — Processing:** Progress indicator using Supabase Realtime subscription on the `generations` row to detect status changes (processing → completed/failed) without polling. Message: "Tailoring your resume... This usually takes about a minute, but can take longer during busy periods."
- **Step 5 — Results:** Preview of tailored resume and cover letter. Download buttons (Word, PDF) for each. "Add to tracker" option.

**5. Job Tracker**
- Table/list view of all applications
- Columns: company, title, status (dropdown to update), date applied, date generated
- Expandable rows: notes, download docs, view job details
- Filter/sort by status
- "+ Add Job" button allows tracking jobs applied to outside the app (no generation required — creates a job + application entry without using credits)

**6. Account & Billing**
- Credit balance
- Purchase credits via Stripe Checkout (credit packs or monthly subscription)
- Transaction history
- Email preferences

## Scraping Strategy

**Try-then-fallback pattern:**

1. User pastes a URL → Vercel serverless function fetches the page (simple HTTP GET)
2. Lightweight HTML parser extracts content from raw HTML
3. If meaningful content is found, pass it to the LLM to extract structured fields (company, title, description, pay, location, location type) — more reliable than custom parsers per site
4. If fetch fails (auth wall, bot blocking, timeout), show: "We couldn't access that page. You can paste the job description below instead."
5. Pre-filled fields from scraping are always editable

**Scope:** Sites behind authentication are out of scope. Public listings that block bots fall back to manual entry gracefully.

**Cost:** Small additional LLM token cost per scrape for HTML parsing. No headless browser required.

## Make.com Integration

### Triggering the Workflow

1. User clicks "Generate" → app deducts 1 credit atomically using `UPDATE profiles SET credits_remaining = credits_remaining - 1 WHERE user_id = $1 AND credits_remaining > 0 RETURNING credits_remaining` (implemented as a Supabase RPC function to prevent race conditions). If the update returns no rows, the user has insufficient credits.
2. App creates a `generations` record (status: "pending") with a random `callback_token` (UUID).
3. App POSTs to Make.com webhook with JSON payload:
   - `generation_id`
   - `callback_token`
   - `resume_content` (extracted text)
   - `job_description` (full text)
   - `job_title`, `company_name`
   - `callback_url` (base URL; Make.com appends `generation_id` and `callback_token` as query params)
4. Generation status updated to "processing"

### Make.com Workflow Adjustments

The existing 14-module workflow requires minor changes:
- Replace Google Drive input modules with a webhook trigger receiving the payload above
- Replace Google Docs output with an HTTP module that POSTs results back to the callback URL
- Return payload: `generation_id`, `tailored_resume_content`, `cover_letter_content`

### Receiving Results

1. Vercel API route receives callback from Make.com
2. Looks up the `generations` record by `generation_id` and compares the provided `callback_token` against the stored `callback_token`. Rejects the request if they don't match.
3. Stores raw content in `generations` table
4. Triggers document formatting (Word + PDF)
5. Stores files in Supabase Storage, updates file paths
6. Updates generation status to "completed"

### Failure Handling

- 10-minute timeout: if no callback, mark as "failed" and refund credit
- Error callback from Make.com: refund credit, show retry prompt
- A Supabase `pg_cron` job runs every 2 minutes, querying `WHERE status = 'processing' AND created_at < NOW() - INTERVAL '10 minutes'` to catch stuck generations, mark them as failed, and refund credits

### Security

- Each generation gets a unique `callback_token` (UUID) stored in the `generations` table. Make.com includes this token when calling back. The API route validates it against the stored value before accepting results.
- Make.com webhook URL stored as environment variable
- Basic rate limiting on the scrape endpoint and callback API route to prevent abuse

## Document Generation

### Templates

Three professional templates: **Modern**, **Classic**, **Minimal**. Each defines:
- Fonts, heading sizes, spacing, colors, margins
- Consistent structure for all generated documents

### Resume Formatting Rules

| Content | Style |
|---------|-------|
| Name | Title style (large, bold) |
| Contact info | Subtitle/header area |
| Section headings (Experience, Education, Skills) | Heading 2 |
| Job entries (title + company) | Heading 3 with right-aligned date |
| Bullet points | Consistent list formatting with proper indentation |
| Section spacing | Consistent gaps between sections |

### Cover Letter Formatting

Standard business letter layout: date, address block, greeting, body paragraphs, sign-off.

### Implementation

- `docx` npm library for Word document generation
- `pdf-lib` or equivalent for PDF generation
- LLM prompt in Make.com updated to return content in a consistent structured format (markdown or JSON with labeled sections) for reliable parsing

## Credit System & Payments

### Credit Mechanics

- 3 free credits on signup (one-time)
- 1 credit per generation (tailored resume + cover letter)
- Credits checked server-side before calling Make.com
- Deducted optimistically before generation; refunded on failure
- `credit_transactions` table provides full audit trail

### Purchase Options (via Stripe Checkout)

- **Credit pack:** e.g., 10 credits for $X (one-time)
- **Monthly subscription:** e.g., 15 credits/month for $Y (auto-renews)
- Exact pricing TBD as a pre-implementation prerequisite based on per-generation cost analysis (Make.com credits + LLM tokens + margin)

### Subscription Credit Renewal

- Stripe `invoice.payment_succeeded` webhook event triggers adding credits via `credit_transactions`
- Credits accumulate — they do not reset each month
- On cancellation, remaining credits stay and can be used until depleted

### Stripe Integration

- Stripe Checkout (hosted) — no custom payment form needed
- Stripe webhook → app adds credits and logs transaction
- Stripe Dashboard used for all financial management (revenue, subscriptions, refunds, reporting)

## Admin

### MVP (Supabase Dashboard)

- Direct table editing for admin operations
- Add credits: insert `credit_transactions` row + update `profiles.credits_remaining`
- View users, generations, application data

### Post-MVP (Lightweight Admin Page)

- Protected page accessible only to users with `is_admin: true`
- User list with credit balances
- "Add credits" button per user
- Generation status overview
- Basic usage stats

## Error Handling

| Scenario | Handling |
|----------|----------|
| Scrape fails | Prompt user for manual entry |
| Resume text extraction fails | Show error, suggest different file format |
| Make.com times out (10 min) | Mark as failed, refund credit, prompt retry |
| Make.com returns malformed content | Mark as failed, refund credit, log for debugging |
| Document generation fails | Store raw content (viewable), retry formatting, refund if unrecoverable |
| Stripe webhook fails | Stripe retries automatically for up to 3 days |
| Insufficient credits | Block before calling Make.com, prompt to purchase |

## MVP Testing Plan

- 4 testers with manually added credits (via Supabase)
- Test coverage: URL scraping (various sites), manual entry, document downloads, tracker updates
- Feedback collected via shared channel (group chat or Google Doc)

## Future Considerations (Out of Scope for MVP)

- Structured resume parsing and skills dashboard
- Multiple resume versions for different career paths (partially supported via `is_active` flag)
- AI-powered job recommendations
- Browser extension for one-click job capture
- Team/enterprise plans
- Custom template builder
- SEO blog using MDX files in a `content/blog/` directory — Next.js auto-generates static HTML pages from markdown at build time, with automatic routing, sitemap generation (`next-sitemap`), and proper meta tags
