# Thank You Email Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free public tool at `/tools/thank-you-email` that streams a personalized post-interview thank you email, with pre-fill support from the generation results page.

**Architecture:** A server component page reads an optional `generation_id` from search params, fetches pre-fill data from Supabase, and passes it to a client form component. The form POSTs to a streaming API route that calls Anthropic's Haiku model and pipes text deltas back to the browser. A CTA on the generation results page deep-links to the tool with the generation ID.

**Tech Stack:** Next.js 16 (App Router, async params/searchParams), React 19, Anthropic SDK (`@anthropic-ai/sdk`), Zod v4, Supabase SSR client, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/thank-you-email.ts` | Create | Zod schema, prompt builder, system prompt constant |
| `__tests__/lib/thank-you-email.test.ts` | Create | Unit tests for schema and prompt builder |
| `src/app/api/thank-you-email/route.ts` | Create | POST handler — validates input, streams Anthropic response |
| `src/components/thank-you/thank-you-email-form.tsx` | Create | Client form — state, streaming reader, copy-to-clipboard |
| `src/app/tools/thank-you-email/page.tsx` | Create | Server component — resolves prefill, renders form |
| `src/app/dashboard/generations/[id]/page.tsx` | Modify | Add "Ready to follow up?" CTA at bottom of completed generation |

---

## Task 1: Lib file — schema, prompt builder, and unit tests

**Files:**
- Create: `src/lib/thank-you-email.ts`
- Create: `__tests__/lib/thank-you-email.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/thank-you-email.test.ts`:

```ts
import {
  ThankYouEmailRequestSchema,
  buildThankYouEmailPrompt,
  THANK_YOU_EMAIL_SYSTEM_PROMPT,
} from "@/lib/thank-you-email";

const validInput = {
  job_description: "We are looking for a senior engineer to lead our platform team.",
  resume_content: "John Doe — 10 years of software engineering experience.",
  interviewer_name: "Sarah Chen",
  interviewer_title: "Engineering Manager",
  memorable_moment: "We talked about the team's shift to microservices.",
};

describe("ThankYouEmailRequestSchema", () => {
  it("accepts valid input", () => {
    expect(ThankYouEmailRequestSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects missing job_description", () => {
    const { job_description, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing resume_content", () => {
    const { resume_content, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing interviewer_name", () => {
    const { interviewer_name, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing interviewer_title", () => {
    const { interviewer_title, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing memorable_moment", () => {
    const { memorable_moment, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects job_description over 10000 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      job_description: "x".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects resume_content over 8000 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      resume_content: "x".repeat(8001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects interviewer_name over 100 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      interviewer_name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects interviewer_title over 200 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      interviewer_title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects memorable_moment over 1000 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      memorable_moment: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("buildThankYouEmailPrompt", () => {
  it("includes interviewer name and title", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain("Sarah Chen");
    expect(prompt).toContain("Engineering Manager");
  });

  it("includes the memorable moment", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain("We talked about the team's shift to microservices.");
  });

  it("includes resume content", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain("John Doe — 10 years of software engineering experience.");
  });

  it("includes job description", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain(
      "We are looking for a senior engineer to lead our platform team."
    );
  });
});

describe("THANK_YOU_EMAIL_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof THANK_YOU_EMAIL_SYSTEM_PROMPT).toBe("string");
    expect(THANK_YOU_EMAIL_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/thank-you-email.test.ts --no-coverage
```

Expected: `Cannot find module '@/lib/thank-you-email'`

- [ ] **Step 3: Create the lib file**

Create `src/lib/thank-you-email.ts`:

```ts
import { z } from "zod";

export const ThankYouEmailRequestSchema = z.object({
  job_description: z.string().min(1).max(10000),
  resume_content: z.string().min(1).max(8000),
  interviewer_name: z.string().min(1).max(100),
  interviewer_title: z.string().min(1).max(200),
  memorable_moment: z.string().min(1).max(1000),
});

export type ThankYouEmailRequest = z.infer<typeof ThankYouEmailRequestSchema>;

export const THANK_YOU_EMAIL_SYSTEM_PROMPT =
  "You are a professional career coach writing a post-interview thank you email on behalf of a job candidate. Write concisely and authentically. Output the email only — no commentary, no markdown, no code blocks.";

export function buildThankYouEmailPrompt(input: ThankYouEmailRequest): string {
  return `Write a thank you email with the following details:

Interviewer: ${input.interviewer_name}, ${input.interviewer_title}
Memorable moment from the interview: ${input.memorable_moment}

Candidate's resume:
${input.resume_content}

Job description:
${input.job_description}

Requirements:
- Include a subject line on the first line (format: "Subject: ...")
- Blank line, then the email body
- Greet the interviewer by first name
- Express genuine gratitude for their time
- Reference the memorable moment naturally in 1-2 sentences
- Connect one relevant aspect of the candidate's background to the role
- Keep it 150-200 words total
- Professional but warm tone
- End with a forward-looking close`;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/thank-you-email.test.ts --no-coverage
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/thank-you-email.ts __tests__/lib/thank-you-email.test.ts
git commit -m "feat: add thank-you email schema, prompt builder, and tests"
```

---

## Task 2: Streaming API route

**Files:**
- Create: `src/app/api/thank-you-email/route.ts`

- [ ] **Step 1: Check Next.js 16 route handler docs**

```bash
ls node_modules/next/dist/docs/ | grep -i route
```

Read any relevant route handler doc. The key constraint: route handlers return `Response` (Web API), not `NextResponse`, for streaming. `NextResponse.json()` is fine for error responses.

- [ ] **Step 2: Create the API route**

Create `src/app/api/thank-you-email/route.ts`:

```ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  ThankYouEmailRequestSchema,
  buildThankYouEmailPrompt,
  THANK_YOU_EMAIL_SYSTEM_PROMPT,
} from "@/lib/thank-you-email";

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const parsed = ThankYouEmailRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const field = firstError.path.join(".");
    if (firstError.code === "too_big") {
      return NextResponse.json(
        { error: `${field} exceeds character limit`, code: "INPUT_TOO_LONG" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Invalid input: ${field} - ${firstError.message}`, code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const anthropic = getAnthropicClient();
  const prompt = buildThankYouEmailPrompt(parsed.data);

  try {
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: THANK_YOU_EMAIL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[thank-you-email] Anthropic error:", err);
    return NextResponse.json(
      { error: "Failed to generate email", code: "GENERATION_FAILED" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Smoke-test the API route with curl**

Start the dev server (`npm run dev`) in a separate terminal, then run:

```bash
curl -s -X POST http://localhost:3000/api/thank-you-email \
  -H "Content-Type: application/json" \
  -d '{
    "job_description": "Senior Software Engineer at Acme. Build distributed systems.",
    "resume_content": "Jane Smith. 8 years of backend engineering. Led migration to microservices.",
    "interviewer_name": "Sarah Chen",
    "interviewer_title": "Engineering Manager",
    "memorable_moment": "We discussed the challenges of migrating a monolith to microservices."
  }'
```

Expected: streaming text response starting with `Subject:`.

- [ ] **Step 4: Smoke-test validation**

```bash
curl -s -X POST http://localhost:3000/api/thank-you-email \
  -H "Content-Type: application/json" \
  -d '{"job_description": "test"}'
```

Expected: `{"error":"Invalid input: resume_content - ...","code":"INVALID_INPUT"}` with status 400.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/thank-you-email/route.ts
git commit -m "feat: add streaming thank-you email API route"
```

---

## Task 3: Client form component

**Files:**
- Create: `src/components/thank-you/thank-you-email-form.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/thank-you/thank-you-email-form.tsx`:

```tsx
"use client";

import { useState } from "react";

type Prefill = {
  jobDescription: string;
  resumeContent: string;
  companyName: string;
  jobTitle: string;
} | null;

interface ThankYouEmailFormProps {
  prefill: Prefill;
}

export function ThankYouEmailForm({ prefill }: ThankYouEmailFormProps) {
  const [jobDescription, setJobDescription] = useState(prefill?.jobDescription ?? "");
  const [resumeContent, setResumeContent] = useState(prefill?.resumeContent ?? "");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerTitle, setInterviewerTitle] = useState("");
  const [memorableMoment, setMemorableMoment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !jobDescription.trim() ||
      !resumeContent.trim() ||
      !interviewerName.trim() ||
      !interviewerTitle.trim() ||
      !memorableMoment.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setEmailContent("");

    try {
      const res = await fetch("/api/thank-you-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_content: resumeContent,
          interviewer_name: interviewerName,
          interviewer_title: interviewerTitle,
          memorable_moment: memorableMoment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setEmailContent((prev) => prev + decoder.decode(value));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(emailContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently
    }
  }

  const showPrefillBanner = prefill && !isEditing;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showPrefillBanner ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-green-800 font-medium text-sm">
            ✓ {prefill.jobTitle} at {prefill.companyName} — job &amp; resume loaded
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm text-gray-500 hover:text-gray-700 ml-4"
          >
            Edit ▾
          </button>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium mb-2 font-sans">
              Job Description
              <span className="text-gray-400 font-normal ml-2">
                {jobDescription.length}/10,000
              </span>
            </label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={10000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 font-sans">
              Your Resume
              <span className="text-gray-400 font-normal ml-2">
                {resumeContent.length}/8,000
              </span>
            </label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste your resume text here..."
              value={resumeContent}
              onChange={(e) => setResumeContent(e.target.value)}
              maxLength={8000}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 font-sans">
            Interviewer Name
          </label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. Sarah Chen"
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 font-sans">
            Their Title / Role
          </label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. Engineering Manager"
            value={interviewerTitle}
            onChange={(e) => setInterviewerTitle(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 font-sans">
          Memorable Moment from the Interview
          <span className="text-gray-400 font-normal ml-2">
            {memorableMoment.length}/1,000
          </span>
        </label>
        <textarea
          className="w-full h-28 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. We talked about the team's shift to microservices and how it aligns with my background in distributed systems..."
          value={memorableMoment}
          onChange={(e) => setMemorableMoment(e.target.value)}
          maxLength={1000}
        />
      </div>

      <button
        type="submit"
        disabled={isGenerating}
        className="w-full py-3.5 bg-[#1a1a1a] text-white font-sans text-sm font-semibold tracking-wider uppercase hover:bg-[#333] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isGenerating ? "Writing..." : "Generate Thank You Email"}
      </button>

      {error && (
        <div className="bg-red-50 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {(isGenerating || emailContent) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 font-sans">
              Your Thank You Email
            </h3>
            {emailContent && !isGenerating && (
              <button
                type="button"
                onClick={handleCopy}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {isCopied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            )}
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
            {emailContent}
            {isGenerating && (
              <span className="animate-pulse text-gray-400">▌</span>
            )}
          </pre>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/thank-you/thank-you-email-form.tsx
git commit -m "feat: add ThankYouEmailForm client component with streaming and copy"
```

---

## Task 4: Tool page (server component)

**Files:**
- Create: `src/app/tools/thank-you-email/page.tsx`

- [ ] **Step 1: Check Next.js 16 searchParams docs**

```bash
ls node_modules/next/dist/docs/ | head -20
```

The key pattern in this codebase (see `src/app/dashboard/generations/[id]/page.tsx` line 13): `params` is `Promise<{...}>` and must be awaited. Same applies to `searchParams` in Next.js 16.

- [ ] **Step 2: Create the page**

Create `src/app/tools/thank-you-email/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ThankYouEmailForm } from "@/components/thank-you/thank-you-email-form";

export const metadata: Metadata = {
  title: "Free Interview Thank You Email Generator | Taylor Resumé",
  description:
    "Write a personalized post-interview thank you email in seconds. Paste your job description, resume, and memorable moment — we'll craft the perfect follow-up.",
};

type Prefill = {
  jobDescription: string;
  resumeContent: string;
  companyName: string;
  jobTitle: string;
} | null;

async function getPrefill(generationId: string): Promise<Prefill> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("generations")
      .select("*, jobs(*), resumes(*)")
      .eq("id", generationId)
      .single();

    if (!data?.jobs?.job_description) return null;

    return {
      jobDescription: data.jobs.job_description,
      resumeContent:
        data.tailored_resume_content ?? data.resumes?.raw_text_content ?? "",
      companyName: data.jobs.company_name,
      jobTitle: data.jobs.job_title,
    };
  } catch {
    return null;
  }
}

export default async function ThankYouEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ generation_id?: string }>;
}) {
  const { generation_id } = await searchParams;
  const prefill = generation_id ? await getPrefill(generation_id) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4 font-sans">
          Write Your Thank You Email
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {prefill
            ? "Your job and resume are pre-filled. Add your interviewer's details and a memorable moment."
            : "Fill in the details below and we'll write a personalized post-interview follow-up in seconds."}
        </p>
      </div>
      <ThankYouEmailForm prefill={prefill} />
    </div>
  );
}
```

- [ ] **Step 3: Verify the page loads**

With dev server running, open `http://localhost:3000/tools/thank-you-email` in a browser.

Expected: Page renders with all five form fields visible (job description, resume, interviewer name, title, memorable moment). No console errors.

- [ ] **Step 4: Verify the full standalone flow end-to-end**

Fill in all five fields with test data and click Generate. Expected: email streams in word by word inside the blue output box. Copy button appears when streaming completes.

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/thank-you-email/page.tsx
git commit -m "feat: add thank-you email tool page with pre-fill support"
```

---

## Task 5: Generation page CTA + pre-fill smoke test

**Files:**
- Modify: `src/app/dashboard/generations/[id]/page.tsx`

- [ ] **Step 1: Add the CTA block**

In `src/app/dashboard/generations/[id]/page.tsx`, add the following block after the closing `</div>` of the "Add to Job Tracker" div (line 75), still inside the `status === "completed"` fragment:

```tsx
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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

The completed section should now look like:

```tsx
      {generation.status === "completed" && (
        <>
          <DownloadButtons ... />
          <ATSScoreLoader ... />
          {generation.tailored_resume_content && (
            <ResumePreview content={generation.tailored_resume_content} />
          )}
          {generation.cover_letter_content && (
            <CoverLetterPreview content={generation.cover_letter_content} />
          )}
          <div className="mt-6">
            <Link href="/dashboard/jobs" className="text-blue-600 hover:underline text-sm">
              Add to Job Tracker
            </Link>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
        </>
      )}
```

- [ ] **Step 2: Verify the CTA renders**

With dev server running, navigate to a completed generation at `/dashboard/generations/<id>`. Expected: "Ready to follow up?" block visible at the bottom with "Write Thank You Email →" link.

- [ ] **Step 3: Verify pre-fill flow end-to-end**

Click "Write Thank You Email →" from the generation page. Expected:
1. Navigates to `/tools/thank-you-email?generation_id=<id>`
2. Green banner shows: "✓ [Job Title] at [Company] — job & resume loaded"
3. Only three fields are visible: Interviewer Name, Their Title / Role, Memorable Moment
4. Clicking "Edit ▾" reveals the job description and resume textareas (pre-populated)
5. Fill in the three personal fields and click Generate — email streams correctly

- [ ] **Step 4: Verify invalid generation_id falls back gracefully**

Navigate to `/tools/thank-you-email?generation_id=not-a-real-id`. Expected: full paste form renders with no error shown.

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/generations/[id]/page.tsx"
git commit -m "feat: add thank you email CTA to generation results page"
```

---

## Final check

- [ ] Run the full test suite to confirm no regressions:

```bash
npx jest --no-coverage
```

Expected: All tests pass including the new `thank-you-email.test.ts`.
