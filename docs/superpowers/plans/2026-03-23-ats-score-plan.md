# ATS Score Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an 8-factor ATS scoring system that compares base vs. tailored resumes and provides a free public scoring tool for lead generation.

**Architecture:** A shared scoring library calls the Anthropic API with a structured prompt, returning JSON scores. Two API routes serve the public tool and score persistence. The results page triggers scoring client-side and displays a side-by-side comparison. A new public page at `/tools/ats-score` offers free scoring without login.

**Tech Stack:** Next.js, Anthropic Claude API (`@anthropic-ai/sdk`), Supabase (JSONB columns), Tailwind CSS, Zod (new dependency for validation)

**Spec:** `docs/superpowers/specs/2026-03-23-ats-score-design.md`

---

## File Structure

### New Files
- `src/lib/ats-scorer.ts` — Core scoring logic: builds prompt, calls Anthropic API, validates response with Zod
- `src/lib/ats-schemas.ts` — Zod schemas and TypeScript types for ATS scores
- `src/app/api/ats-score/route.ts` — Public POST endpoint for scoring a single resume
- `src/app/api/generations/[id]/ats-scores/route.ts` — Authenticated POST endpoint to save scores to a generation
- `src/components/ats/ats-score-card.tsx` — Reusable score breakdown component (client component)
- `src/components/ats/ats-comparison.tsx` — Side-by-side wrapper for two ATSScoreCard components
- `src/components/ats/ats-score-loader.tsx` — Client component that triggers scoring and manages loading state
- `src/components/ats/ats-score-form.tsx` — Client form component for the public ATS tool
- `src/app/tools/ats-score/page.tsx` — Public ATS tool page (server component for SEO, embeds client form)
- `src/app/tools/layout.tsx` — Layout for public tools pages (no auth required)
- `__tests__/lib/ats-scorer.test.ts` — Unit tests for scoring logic
- `__tests__/lib/ats-schemas.test.ts` — Unit tests for Zod schemas

### Modified Files
- `package.json` — Add `@anthropic-ai/sdk` and `zod` dependencies
- `src/app/dashboard/generations/[id]/page.tsx` — Add ATSScoreLoader to completed generation view
- `src/app/page.tsx` — Add ATS tool link to landing page nav/features
- `src/components/dashboard/sidebar.tsx` — Add ATS tool link for logged-in users
- `supabase/migrations/002_ats_scores.sql` — Add JSONB columns to generations table

---

### Task 1: Install Dependencies and Add Database Columns

**Files:**
- Modify: `package.json`
- Create: `supabase/migrations/002_ats_scores.sql`

- [ ] **Step 1: Install @anthropic-ai/sdk and zod**

```bash
cd /Users/mikewong/resume-tailor
npm install @anthropic-ai/sdk zod
```

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/002_ats_scores.sql`:

```sql
ALTER TABLE generations ADD COLUMN base_ats_scores JSONB;
ALTER TABLE generations ADD COLUMN tailored_ats_scores JSONB;
```

- [ ] **Step 3: Run the migration in Supabase SQL Editor**

Copy the SQL above and run it in the Supabase SQL Editor. Expected: "Success. No rows returned."

- [ ] **Step 4: Add ANTHROPIC_API_KEY to .env.local**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```

Also add to Vercel environment variables.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json supabase/migrations/002_ats_scores.sql
git commit -m "feat: add ATS score dependencies and database migration"
```

---

### Task 2: Create Zod Schemas and Types

**Files:**
- Create: `src/lib/ats-schemas.ts`
- Create: `__tests__/lib/ats-schemas.test.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/lib/ats-schemas.test.ts`:

```typescript
import { ATSScoreResponseSchema, ATSScoreRequestSchema } from "@/lib/ats-schemas";

describe("ATSScoreRequestSchema", () => {
  it("validates a valid request", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "Software engineer with 5 years experience",
      job_description: "Looking for a senior developer",
      job_title: "Senior Developer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty resume_content", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "",
      job_description: "Looking for a developer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects resume_content over 15000 chars", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "a".repeat(15001),
      job_description: "Looking for a developer",
    });
    expect(result.success).toBe(false);
  });

  it("allows missing job_title", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "Software engineer",
      job_description: "Looking for a developer",
    });
    expect(result.success).toBe(true);
  });
});

describe("ATSScoreResponseSchema", () => {
  it("validates a valid response", () => {
    const result = ATSScoreResponseSchema.safeParse({
      overall_score: 78,
      factors: {
        keyword_match: { score: 82, explanation: "Good keyword coverage" },
        contextual_relevance: { score: 75, explanation: "Decent context" },
        text_formatting_quality: { score: 90, explanation: "Clean formatting" },
        job_title_alignment: { score: 70, explanation: "Partial match" },
        years_of_experience: { score: 65, explanation: "Slightly under" },
        section_completeness: { score: 85, explanation: "All sections present" },
        action_verb_usage: { score: 80, explanation: "Strong verbs" },
        measurable_results: { score: 72, explanation: "Some metrics" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects scores outside 0-100", () => {
    const result = ATSScoreResponseSchema.safeParse({
      overall_score: 150,
      factors: {
        keyword_match: { score: 82, explanation: "test" },
        contextual_relevance: { score: 75, explanation: "test" },
        text_formatting_quality: { score: 90, explanation: "test" },
        job_title_alignment: { score: 70, explanation: "test" },
        years_of_experience: { score: 65, explanation: "test" },
        section_completeness: { score: 85, explanation: "test" },
        action_verb_usage: { score: 80, explanation: "test" },
        measurable_results: { score: 72, explanation: "test" },
      },
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/ats-schemas.test.ts --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the schemas file**

Create `src/lib/ats-schemas.ts`:

```typescript
import { z } from "zod";

const FactorScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string().min(1).max(500),
});

export const ATSFactorsSchema = z.object({
  keyword_match: FactorScoreSchema,
  contextual_relevance: FactorScoreSchema,
  text_formatting_quality: FactorScoreSchema,
  job_title_alignment: FactorScoreSchema,
  years_of_experience: FactorScoreSchema,
  section_completeness: FactorScoreSchema,
  action_verb_usage: FactorScoreSchema,
  measurable_results: FactorScoreSchema,
});

export const ATSScoreResponseSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  factors: ATSFactorsSchema,
});

export const ATSScoreRequestSchema = z.object({
  resume_content: z.string().min(1).max(15000),
  job_description: z.string().min(1).max(10000),
  job_title: z.string().max(200).optional(),
});

export type ATSScoreResponse = z.infer<typeof ATSScoreResponseSchema>;
export type ATSScoreRequest = z.infer<typeof ATSScoreRequestSchema>;
export type ATSFactors = z.infer<typeof ATSFactorsSchema>;

export const FACTOR_WEIGHTS: Record<keyof ATSFactors, number> = {
  keyword_match: 0.2,
  contextual_relevance: 0.15,
  text_formatting_quality: 0.15,
  job_title_alignment: 0.1,
  years_of_experience: 0.1,
  section_completeness: 0.1,
  action_verb_usage: 0.1,
  measurable_results: 0.1,
};

export const FACTOR_LABELS: Record<keyof ATSFactors, string> = {
  keyword_match: "Keyword Match",
  contextual_relevance: "Contextual Relevance",
  text_formatting_quality: "Text Formatting Quality",
  job_title_alignment: "Job Title Alignment",
  years_of_experience: "Years of Experience",
  section_completeness: "Section Completeness",
  action_verb_usage: "Action Verb Usage",
  measurable_results: "Measurable Results",
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/ats-schemas.test.ts --verbose
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ats-schemas.ts __tests__/lib/ats-schemas.test.ts
git commit -m "feat: add ATS score Zod schemas and types"
```

---

### Task 3: Create ATS Scorer Library

**Files:**
- Create: `src/lib/ats-scorer.ts`
- Create: `__tests__/lib/ats-scorer.test.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/lib/ats-scorer.test.ts`:

```typescript
import { buildATSPrompt, parseATSResponse, computeOverallScore } from "@/lib/ats-scorer";
import { FACTOR_WEIGHTS } from "@/lib/ats-schemas";

describe("buildATSPrompt", () => {
  it("includes resume content and job description", () => {
    const prompt = buildATSPrompt({
      resume_content: "My resume text",
      job_description: "The job posting",
    });
    expect(prompt).toContain("My resume text");
    expect(prompt).toContain("The job posting");
  });

  it("includes job title when provided", () => {
    const prompt = buildATSPrompt({
      resume_content: "My resume",
      job_description: "The job",
      job_title: "Software Engineer",
    });
    expect(prompt).toContain("Software Engineer");
  });
});

describe("computeOverallScore", () => {
  it("computes weighted average correctly", () => {
    const factors = {
      keyword_match: { score: 100, explanation: "test" },
      contextual_relevance: { score: 100, explanation: "test" },
      text_formatting_quality: { score: 100, explanation: "test" },
      job_title_alignment: { score: 100, explanation: "test" },
      years_of_experience: { score: 100, explanation: "test" },
      section_completeness: { score: 100, explanation: "test" },
      action_verb_usage: { score: 100, explanation: "test" },
      measurable_results: { score: 100, explanation: "test" },
    };
    expect(computeOverallScore(factors)).toBe(100);
  });

  it("computes weighted average for mixed scores", () => {
    const factors = {
      keyword_match: { score: 80, explanation: "test" },       // 0.20 * 80 = 16
      contextual_relevance: { score: 60, explanation: "test" }, // 0.15 * 60 = 9
      text_formatting_quality: { score: 90, explanation: "test" }, // 0.15 * 90 = 13.5
      job_title_alignment: { score: 70, explanation: "test" },  // 0.10 * 70 = 7
      years_of_experience: { score: 50, explanation: "test" },  // 0.10 * 50 = 5
      section_completeness: { score: 85, explanation: "test" }, // 0.10 * 85 = 8.5
      action_verb_usage: { score: 75, explanation: "test" },    // 0.10 * 75 = 7.5
      measurable_results: { score: 40, explanation: "test" },   // 0.10 * 40 = 4
    };
    // Total = 16 + 9 + 13.5 + 7 + 5 + 8.5 + 7.5 + 4 = 70.5 → 71
    expect(computeOverallScore(factors)).toBe(71);
  });
});

describe("parseATSResponse", () => {
  it("parses valid JSON response", () => {
    const validJson = JSON.stringify({
      overall_score: 75,
      factors: {
        keyword_match: { score: 80, explanation: "Good" },
        contextual_relevance: { score: 70, explanation: "OK" },
        text_formatting_quality: { score: 85, explanation: "Clean" },
        job_title_alignment: { score: 60, explanation: "Partial" },
        years_of_experience: { score: 75, explanation: "Match" },
        section_completeness: { score: 90, explanation: "Complete" },
        action_verb_usage: { score: 65, explanation: "Decent" },
        measurable_results: { score: 55, explanation: "Few" },
      },
    });
    const result = parseATSResponse(validJson);
    expect(result.factors.keyword_match.score).toBe(80);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseATSResponse("not json")).toThrow();
  });

  it("throws on missing factors", () => {
    expect(() => parseATSResponse(JSON.stringify({ overall_score: 50 }))).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/ats-scorer.test.ts --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the scorer library**

Create `src/lib/ats-scorer.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { ATSScoreResponseSchema, ATSFactorsSchema, FACTOR_WEIGHTS } from "./ats-schemas";
import type { ATSScoreResponse, ATSScoreRequest, ATSFactors } from "./ats-schemas";

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export function buildATSPrompt(input: ATSScoreRequest): string {
  const jobTitleLine = input.job_title
    ? `\nTarget Job Title: ${input.job_title}`
    : "";

  return `You are an ATS (Applicant Tracking System) resume scoring expert.

Analyze the following resume against the job description and score it on exactly 8 factors. Each factor gets a score from 0-100 and a brief explanation (1-2 sentences).

RESUME:
${input.resume_content}

JOB DESCRIPTION:
${input.job_description}${jobTitleLine}

SCORING FACTORS:

1. keyword_match (weight: 20%) — What percentage of key skills, tools, technologies, and terms from the job description appear in the resume?

2. contextual_relevance (weight: 15%) — Are keywords used in meaningful context that demonstrates real experience, or are they just listed? Penalize keyword stuffing. Reward depth.

3. text_formatting_quality (weight: 15%) — Is the text formatting consistent and professional? Check for: consistent date formats, consistent bullet styles, proper capitalization, clean section headers, no special characters that break ATS parsing.

4. job_title_alignment (weight: 10%) — How closely do the candidate's job titles match the target role? Consider title hierarchy and functional similarity.

5. years_of_experience (weight: 10%) — Based on employment dates in the resume, how many total years of relevant experience does the candidate have? Compare to any experience requirements stated or implied in the job description.

6. section_completeness (weight: 10%) — Does the resume contain all standard sections an ATS expects? Check for: contact information, professional summary, work experience, education, skills section.

7. action_verb_usage (weight: 10%) — Do bullet points start with strong, varied action verbs? Penalize weak starts like "Responsible for" or "Helped with". Reward specific action verbs like "Developed", "Implemented", "Led".

8. measurable_results (weight: 10%) — Do bullet points include quantifiable achievements? Look for numbers, percentages, dollar amounts, timeframes, team sizes. More specific metrics score higher.

Return ONLY valid JSON with this exact structure, no other text:
{
  "overall_score": <weighted average as integer 0-100>,
  "factors": {
    "keyword_match": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "contextual_relevance": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "text_formatting_quality": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "job_title_alignment": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "years_of_experience": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "section_completeness": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "action_verb_usage": { "score": <0-100>, "explanation": "<1-2 sentences>" },
    "measurable_results": { "score": <0-100>, "explanation": "<1-2 sentences>" }
  }
}`;
}

export function computeOverallScore(factors: ATSFactors): number {
  let total = 0;
  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    total += factors[key as keyof ATSFactors].score * weight;
  }
  return Math.round(total);
}

export function parseATSResponse(text: string): ATSScoreResponse {
  const json = JSON.parse(text);
  const parsed = ATSScoreResponseSchema.parse(json);
  // Recompute overall score from weights to ensure consistency
  parsed.overall_score = computeOverallScore(parsed.factors);
  return parsed;
}

export async function scoreResume(input: ATSScoreRequest): Promise<ATSScoreResponse> {
  const prompt = buildATSPrompt(input);

  const response = await getAnthropicClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return parseATSResponse(content.text);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/ats-scorer.test.ts --verbose
```

Expected: All tests PASS (the `scoreResume` function is not tested here since it calls the API — only pure functions are unit tested).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ats-scorer.ts __tests__/lib/ats-scorer.test.ts
git commit -m "feat: add ATS scorer library with Anthropic API integration"
```

---

### Task 4: Create Public ATS Score API Route

**Files:**
- Create: `src/app/api/ats-score/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/ats-score/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { ATSScoreRequestSchema } from "@/lib/ats-schemas";
import { scoreResume } from "@/lib/ats-scorer";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = ATSScoreRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      const field = firstError.path.join(".");
      const message = firstError.message;

      if (firstError.code === "too_big") {
        return NextResponse.json(
          { error: `${field} exceeds character limit`, code: "INPUT_TOO_LONG" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Invalid input: ${field} - ${message}`, code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const scores = await scoreResume(parsed.data);

    return NextResponse.json(scores);
  } catch (error) {
    console.error("ATS scoring failed:", error);
    return NextResponse.json(
      { error: "Failed to compute ATS score", code: "SCORING_FAILED" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test manually with curl**

```bash
curl -X POST http://localhost:3000/api/ats-score \
  -H "Content-Type: application/json" \
  -d '{"resume_content":"Software engineer with 5 years of experience in React and Node.js","job_description":"Looking for a senior full-stack developer with React experience","job_title":"Senior Developer"}'
```

Expected: JSON response with `overall_score` and 8 `factors`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ats-score/route.ts
git commit -m "feat: add public ATS score API endpoint"
```

---

### Task 5: Create ATS Score Persistence API Route

**Files:**
- Create: `src/app/api/generations/[id]/ats-scores/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/generations/[id]/ats-scores/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATSScoreResponseSchema } from "@/lib/ats-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { base_ats_scores, tailored_ats_scores } = body;

    // Validate score shapes if provided
    if (base_ats_scores) {
      ATSScoreResponseSchema.parse(base_ats_scores);
    }
    if (tailored_ats_scores) {
      ATSScoreResponseSchema.parse(tailored_ats_scores);
    }

    // Verify the generation belongs to the user
    const { data: generation } = await supabase
      .from("generations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Save scores
    const { error } = await supabase
      .from("generations")
      .update({
        ...(base_ats_scores && { base_ats_scores }),
        ...(tailored_ats_scores && { tailored_ats_scores }),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save ATS scores:", error);
    return NextResponse.json(
      { error: "Failed to save scores" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/generations/[id]/ats-scores/route.ts
git commit -m "feat: add ATS score persistence API route"
```

---

### Task 6: Create ATSScoreCard Component

**Files:**
- Create: `src/components/ats/ats-score-card.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ats/ats-score-card.tsx`:

```typescript
"use client";

import { FACTOR_LABELS } from "@/lib/ats-schemas";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 75) return "text-green-700";
  if (score >= 50) return "text-yellow-700";
  return "text-red-700";
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-green-50";
  if (score >= 50) return "bg-yellow-50";
  return "bg-red-50";
}

export function ATSScoreCard({
  scores,
  title,
}: {
  scores: ATSScoreResponse;
  title: string;
}) {
  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      {/* Overall Score */}
      <div className={`text-center p-4 rounded-lg mb-6 ${getScoreBgColor(scores.overall_score)}`}>
        <div className={`text-4xl font-bold ${getScoreTextColor(scores.overall_score)}`}>
          {scores.overall_score}
        </div>
        <div className="text-sm text-gray-600 mt-1">Overall ATS Score</div>
      </div>

      {/* Factor Breakdown */}
      <div className="space-y-3">
        {(Object.entries(scores.factors) as [keyof typeof FACTOR_LABELS, { score: number; explanation: string }][]).map(
          ([key, { score, explanation }]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{FACTOR_LABELS[key]}</span>
                <span className={`font-medium ${getScoreTextColor(score)}`}>
                  {score}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{explanation}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function ATSScoreCardSkeleton({ title }: { title: string }) {
  return (
    <div className="border rounded-lg p-6 animate-pulse">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center">
        <div className="h-10 w-16 bg-gray-200 rounded mx-auto mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-8 bg-gray-200 rounded" />
            </div>
            <div className="h-2 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ats/ats-score-card.tsx
git commit -m "feat: add ATSScoreCard component with skeleton loader"
```

---

### Task 7: Create ATSComparison and ATSScoreLoader Components

**Files:**
- Create: `src/components/ats/ats-comparison.tsx`
- Create: `src/components/ats/ats-score-loader.tsx`

- [ ] **Step 1: Create the comparison component**

Create `src/components/ats/ats-comparison.tsx`:

```typescript
"use client";

import { ATSScoreCard } from "./ats-score-card";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

export function ATSComparison({
  baseScores,
  tailoredScores,
}: {
  baseScores: ATSScoreResponse | null;
  tailoredScores: ATSScoreResponse | null;
}) {
  if (!baseScores && !tailoredScores) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">ATS Score Comparison</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {baseScores ? (
          <ATSScoreCard scores={baseScores} title="Your Original Resume" />
        ) : (
          <div className="border rounded-lg p-6 flex items-center justify-center text-gray-400 text-sm">
            Original resume text not available for scoring.
          </div>
        )}
        {tailoredScores && (
          <ATSScoreCard scores={tailoredScores} title="Tailored Resume" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the score loader component**

Create `src/components/ats/ats-score-loader.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { ATSComparison } from "./ats-comparison";
import { ATSScoreCardSkeleton } from "./ats-score-card";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

export function ATSScoreLoader({
  generationId,
  baseResumeContent,
  tailoredResumeContent,
  jobDescription,
  jobTitle,
  existingBaseScores,
  existingTailoredScores,
}: {
  generationId: string;
  baseResumeContent: string | null;
  tailoredResumeContent: string;
  jobDescription: string;
  jobTitle?: string;
  existingBaseScores: ATSScoreResponse | null;
  existingTailoredScores: ATSScoreResponse | null;
}) {
  const [baseScores, setBaseScores] = useState<ATSScoreResponse | null>(existingBaseScores);
  const [tailoredScores, setTailoredScores] = useState<ATSScoreResponse | null>(existingTailoredScores);
  const [loading, setLoading] = useState(!existingBaseScores || !existingTailoredScores);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingBaseScores && existingTailoredScores) return;

    async function fetchScores() {
      setLoading(true);
      setError(null);

      try {
        const requests: Promise<void>[] = [];

        // Score base resume if available and not already scored
        if (baseResumeContent && !existingBaseScores) {
          requests.push(
            fetch("/api/ats-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resume_content: baseResumeContent,
                job_description: jobDescription,
                job_title: jobTitle,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.error) throw new Error(data.error);
                setBaseScores(data);
              })
          );
        }

        // Score tailored resume if not already scored
        if (!existingTailoredScores) {
          requests.push(
            fetch("/api/ats-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resume_content: tailoredResumeContent,
                job_description: jobDescription,
                job_title: jobTitle,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.error) throw new Error(data.error);
                setTailoredScores(data);
              })
          );
        }

        await Promise.all(requests);
      } catch (err) {
        console.error("ATS scoring failed:", err);
        setError("ATS scores unavailable — try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, [generationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist scores after they're computed
  useEffect(() => {
    if (!baseScores && !tailoredScores) return;
    if (existingBaseScores && existingTailoredScores) return;

    const body: Record<string, ATSScoreResponse> = {};
    if (baseScores && !existingBaseScores) body.base_ats_scores = baseScores;
    if (tailoredScores && !existingTailoredScores) body.tailored_ats_scores = tailoredScores;

    if (Object.keys(body).length === 0) return;

    fetch(`/api/generations/${generationId}/ats-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((err) => console.error("Failed to persist ATS scores:", err));
  }, [baseScores, tailoredScores, generationId, existingBaseScores, existingTailoredScores]);

  if (error) {
    return (
      <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
        <p className="text-yellow-700 text-sm">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">ATS Score Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ATSScoreCardSkeleton title="Your Original Resume" />
          <ATSScoreCardSkeleton title="Tailored Resume" />
        </div>
      </div>
    );
  }

  return <ATSComparison baseScores={baseScores} tailoredScores={tailoredScores} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ats/ats-comparison.tsx src/components/ats/ats-score-loader.tsx
git commit -m "feat: add ATSComparison and ATSScoreLoader components"
```

---

### Task 8: Integrate ATS Scores into Generation Results Page

**Files:**
- Modify: `src/app/dashboard/generations/[id]/page.tsx`

- [ ] **Step 1: Update the generation results page**

Modify `src/app/dashboard/generations/[id]/page.tsx` to include the ATS score loader. The page needs to fetch the resume's `raw_text_content` and the job's `job_description` for scoring.

Replace the entire file with:

```typescript
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DownloadButtons } from "@/components/generations/download-buttons";
import { ResumePreview } from "@/components/generations/resume-preview";
import { CoverLetterPreview } from "@/components/generations/cover-letter-preview";
import { ATSScoreLoader } from "@/components/ats/ats-score-loader";
import Link from "next/link";

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: generation } = await supabase
    .from("generations")
    .select("*, jobs(*), resumes(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!generation) notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Generation Results</h1>
      <p className="text-gray-600 mb-6">
        {generation.jobs.job_title} at {generation.jobs.company_name}
      </p>

      {generation.status === "completed" && (
        <>
          <DownloadButtons
            filePaths={{
              resume_word: generation.resume_word_file_path,
              resume_pdf: generation.resume_pdf_file_path,
              cover_letter_word: generation.cover_letter_word_file_path,
              cover_letter_pdf: generation.cover_letter_pdf_file_path,
            }}
          />

          <ATSScoreLoader
            generationId={generation.id}
            baseResumeContent={generation.resumes?.raw_text_content || null}
            tailoredResumeContent={generation.tailored_resume_content}
            jobDescription={generation.jobs.job_description}
            jobTitle={generation.jobs.job_title}
            existingBaseScores={generation.base_ats_scores}
            existingTailoredScores={generation.tailored_ats_scores}
          />

          {generation.tailored_resume_content && (
            <ResumePreview content={generation.tailored_resume_content} />
          )}

          {generation.cover_letter_content && (
            <CoverLetterPreview content={generation.cover_letter_content} />
          )}

          <div className="mt-6">
            <Link
              href="/dashboard/jobs"
              className="text-blue-600 hover:underline text-sm"
            >
              Add to Job Tracker
            </Link>
          </div>
        </>
      )}

      {generation.status === "failed" && (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-700">
            Generation failed. Your credit has been refunded.
          </p>
          <Link
            href="/dashboard/jobs/new"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            Try again
          </Link>
        </div>
      )}

      {generation.status === "processing" && (
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Still processing...</p>
        </div>
      )}
    </div>
  );
}
```

Key changes:
- Added `resumes(*)` to the Supabase query to get `raw_text_content`
- Added `ATSScoreLoader` component between download buttons and previews
- Changed `max-w-3xl` to `max-w-4xl` to accommodate side-by-side scores

- [ ] **Step 2: Verify the page compiles**

```bash
cd /Users/mikewong/resume-tailor && npx next build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/generations/[id]/page.tsx
git commit -m "feat: integrate ATS score comparison into generation results page"
```

---

### Task 9: Create Public ATS Tool Page

**Files:**
- Create: `src/app/tools/layout.tsx`
- Create: `src/app/tools/ats-score/page.tsx`

- [ ] **Step 1: Create the tools layout**

Create `src/app/tools/layout.tsx`:

```typescript
import Link from "next/link";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-8 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold">
          Resume Tailor
        </Link>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Get Started
        </Link>
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create the ATS score form client component**

Create `src/components/ats/ats-score-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { ATSScoreCard, ATSScoreCardSkeleton } from "@/components/ats/ats-score-card";
import Link from "next/link";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

export function ATSScoreForm() {
  const [resumeContent, setResumeContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [scores, setScores] = useState<ATSScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!resumeContent.trim() || !jobDescription.trim()) {
      setError("Please enter both your resume and the job description.");
      return;
    }

    setLoading(true);
    setError(null);
    setScores(null);

    try {
      const res = await fetch("/api/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_content: resumeContent,
          job_description: jobDescription,
          ...(jobTitle && { job_title: jobTitle }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to analyze resume.");
        return;
      }

      setScores(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Your Resume
            <span className="text-gray-400 font-normal ml-2">
              {resumeContent.length}/15,000
            </span>
          </label>
          <textarea
            className="w-full h-64 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Paste your resume text here..."
            value={resumeContent}
            onChange={(e) => setResumeContent(e.target.value)}
            maxLength={15000}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Job Description
            <span className="text-gray-400 font-normal ml-2">
              {jobDescription.length}/10,000
            </span>
          </label>
          <textarea
            className="w-full h-64 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            maxLength={10000}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Target Job Title{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Senior Software Engineer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || !resumeContent.trim() || !jobDescription.trim()}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Analyze My Resume"}
      </button>

      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-8">
          <ATSScoreCardSkeleton title="Your ATS Score" />
        </div>
      )}

      {scores && (
        <div className="mt-8">
          <ATSScoreCard scores={scores} title="Your ATS Score" />

          <div className="mt-8 bg-blue-50 p-6 rounded-lg text-center">
            <h3 className="text-lg font-bold mb-2">
              Want to improve this score?
            </h3>
            <p className="text-gray-600 mb-4">
              Sign up for Resume Tailor and we&apos;ll automatically optimize
              your resume for any job description.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Start Free — 3 Credits Included
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Create the public ATS score page (server component for SEO)**

Create `src/app/tools/ats-score/page.tsx`:

```typescript
import { ATSScoreForm } from "@/components/ats/ats-score-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free ATS Resume Score Checker | Resume Tailor",
  description:
    "Check how well your resume matches a job description with our free ATS scoring tool. Get an 8-factor breakdown of your resume's ATS compatibility.",
};

export default function ATSScorePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Free ATS Resume Score Checker</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          See how well your resume matches a job description. Get an 8-factor
          breakdown of your ATS compatibility score — completely free.
        </p>
      </div>

      <ATSScoreForm />
    </div>
  );
}
```

- [ ] **Step 3: Update middleware to allow public access to /tools**

Check `middleware.ts` — the `/tools` path should not require authentication. If the middleware protects all routes except `/` and `/auth`, add `/tools` to the public paths.

Verify in `src/middleware.ts` (or `middleware.ts` at project root) that the matcher does not include `/tools`.

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/layout.tsx src/app/tools/ats-score/page.tsx src/components/ats/ats-score-form.tsx
git commit -m "feat: add public ATS score tool page with SEO metadata"
```

> **Note on rate limiting:** The spec calls for 10 requests/hour per IP for unauthenticated users on `/api/ats-score`. For MVP, this can be deferred — the Anthropic API has its own rate limits. To add rate limiting later, use Vercel KV with a sliding window counter keyed by IP, or add Vercel's built-in WAF rate limiting rules.

---

### Task 10: Add Navigation Links and Landing Page Update

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add ATS tool link to dashboard sidebar**

In `src/components/dashboard/sidebar.tsx`, add a new navigation item for the ATS tool. Add it after the existing nav items:

```typescript
{ href: "/tools/ats-score", label: "ATS Score Checker" }
```

- [ ] **Step 2: Add ATS tool mention to landing page**

In `src/app/page.tsx`, add a new section between "How it works" and "Pricing" that promotes the free ATS tool:

```typescript
{/* Free Tool */}
<section className="py-16">
  <div className="max-w-4xl mx-auto px-4 text-center">
    <h3 className="text-3xl font-bold mb-4">Free ATS Score Checker</h3>
    <p className="text-lg text-gray-600 mb-6">
      Not sure how your resume stacks up? Check your ATS compatibility
      score for free — no sign-up required.
    </p>
    <Link
      href="/tools/ats-score"
      className="px-8 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-lg text-lg font-medium hover:bg-blue-50"
    >
      Check Your Score Free
    </Link>
  </div>
</section>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/sidebar.tsx src/app/page.tsx
git commit -m "feat: add ATS tool navigation links to sidebar and landing page"
```

---

### Task 11: Build, Test, and Deploy

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
cd /Users/mikewong/resume-tailor
npx jest --verbose
```

Expected: All tests pass.

- [ ] **Step 2: Run the build**

```bash
npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Test locally**

```bash
npm run dev
```

Test the following:
1. Visit `/tools/ats-score` — paste a resume and job description, click Analyze
2. Submit a new job through the normal flow — verify ATS scores appear on the results page
3. Refresh the results page — verify scores load from database (not re-computed)

- [ ] **Step 4: Add ANTHROPIC_API_KEY to Vercel**

In Vercel dashboard → Settings → Environment Variables, add:
- `ANTHROPIC_API_KEY` = your Anthropic API key

- [ ] **Step 5: Push and deploy**

```bash
git push
```

Vercel will auto-deploy from the push.

- [ ] **Step 6: Test on production**

1. Visit `https://resume-tailor-tau-seven.vercel.app/tools/ats-score`
2. Test the public tool with a real resume and job description
3. Submit a new generation and verify ATS scores appear on results page

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address deployment issues for ATS score feature"
git push
```
