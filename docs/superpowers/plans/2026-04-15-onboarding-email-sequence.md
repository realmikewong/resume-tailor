# Onboarding Email Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a behavior-aware 6-email onboarding sequence that activates new users and converts them to paid plans.

**Architecture:** Supabase DB webhook fires on signup → sends welcome email via Resend. Vercel cron runs daily → checks user activity state → sends the next eligible email. All events logged to `email_events` table. Unsubscribe via HMAC-signed token link.

**Tech Stack:** Resend (email), React Email (templates), Vercel Cron (scheduling), Supabase RPC (activity queries), HMAC (unsubscribe tokens)

**Spec:** `docs/superpowers/specs/2026-04-15-onboarding-email-sequence-design.md`

---

## File Structure

```
New files:
├── vercel.json                                       -- Vercel cron config
├── supabase/migrations/006_email_onboarding.sql      -- email_events table, profiles column, RPC function
├── src/lib/resend.ts                                 -- Resend client + sendEmail utility
├── src/lib/email/unsubscribe.ts                      -- HMAC token generate/verify
├── src/lib/email/onboarding-sequence.ts              -- Sequence definition + logic
├── src/app/api/webhooks/user-created/route.ts        -- Supabase webhook handler
├── src/app/api/cron/onboarding-emails/route.ts       -- Vercel cron handler
├── src/app/api/email/unsubscribe/route.ts            -- Unsubscribe handler
├── src/emails/components/layout.tsx                  -- Shared email layout (header, footer, unsubscribe)
├── src/emails/components/button.tsx                  -- Shared CTA button
├── src/emails/onboarding/welcome.tsx                 -- Email 1
├── src/emails/onboarding/resume-nudge.tsx            -- Email 2
├── src/emails/onboarding/first-generation.tsx        -- Email 3
├── src/emails/onboarding/value-proof.tsx             -- Email 4
├── src/emails/onboarding/social-proof.tsx            -- Email 5
├── src/emails/onboarding/upgrade-nudge.tsx           -- Email 6
├── __tests__/lib/email/unsubscribe.test.ts           -- Unsubscribe token tests
├── __tests__/lib/email/onboarding-sequence.test.ts   -- Sequence logic tests
├── .env.example                                      -- Add new env vars

Modified files:
├── package.json                                      -- Add resend, @react-email/components
```

---

## Task 1: Install Dependencies and Configure Environment

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `vercel.json`

- [ ] **Step 1: Install Resend and React Email**

```bash
npm install resend @react-email/components
```

- [ ] **Step 2: Add env vars to `.env.example`**

Add to the end of `.env.example`:

```
# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Webhooks
SUPABASE_WEBHOOK_SECRET=your-supabase-webhook-secret

# Cron
CRON_SECRET=your-cron-secret

# Email Unsubscribe
EMAIL_UNSUBSCRIBE_SECRET=your-email-unsubscribe-secret
```

- [ ] **Step 3: Create `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/onboarding-emails",
      "schedule": "0 9 * * *"
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example vercel.json
git commit -m "chore: add resend, react-email deps and env config"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/006_email_onboarding.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Email events tracking table
CREATE TABLE email_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence    VARCHAR(50) NOT NULL,
  step        VARCHAR(50) NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_id   VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_events_user_sequence ON email_events(user_id, sequence);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own email events" ON email_events
  FOR SELECT USING (auth.uid() = user_id);

-- Add email opt-out to profiles
ALTER TABLE profiles ADD COLUMN email_opt_out BOOLEAN DEFAULT FALSE;

-- RPC function to get onboarding-eligible users
-- Must be a function because auth.users is not accessible via .from()
CREATE OR REPLACE FUNCTION get_onboarding_eligible_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  email_opt_out BOOLEAN,
  plan_type TEXT,
  credits_remaining INTEGER,
  has_resume BOOLEAN,
  has_generation BOOLEAN,
  first_generation_at TIMESTAMPTZ,
  first_generation_job_title TEXT,
  first_generation_company TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    u.email::TEXT,
    (u.raw_user_meta_data->>'full_name')::TEXT,
    u.created_at,
    p.email_opt_out,
    p.plan_type::TEXT,
    p.credits_remaining,
    (SELECT COUNT(*) FROM resumes r WHERE r.user_id = p.user_id) > 0,
    (SELECT COUNT(*) FROM generations g WHERE g.user_id = p.user_id) > 0,
    (SELECT MIN(g.created_at) FROM generations g WHERE g.user_id = p.user_id),
    (SELECT j.job_title FROM generations g JOIN jobs j ON j.id = g.job_id
     WHERE g.user_id = p.user_id ORDER BY g.created_at LIMIT 1),
    (SELECT j.company_name FROM generations g JOIN jobs j ON j.id = g.job_id
     WHERE g.user_id = p.user_id ORDER BY g.created_at LIMIT 1)
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.created_at > NOW() - INTERVAL '21 days'
    AND p.email_opt_out = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db reset
```

Expected: Migration applies without errors. Verify with:
```bash
npx supabase db diff
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_email_onboarding.sql
git commit -m "feat: add email_events table, email_opt_out column, and onboarding RPC"
```

---

## Task 3: Resend Client Utility

**Files:**
- Create: `src/lib/resend.ts`

- [ ] **Step 1: Create the Resend utility**

```typescript
import { Resend } from "resend";
import { type ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Taylor Resumé <hello@taylorresume.com>";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      react,
    });

    if (error) {
      console.error("[resend] Send failed:", error);
      return { id: null, error: error.message };
    }

    return { id: data?.id ?? null, error: null };
  } catch (err) {
    console.error("[resend] Unexpected error:", err);
    return { id: null, error: "Unexpected error sending email" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/resend.ts
git commit -m "feat: add Resend client utility"
```

---

## Task 4: Unsubscribe Token Utility

**Files:**
- Create: `src/lib/email/unsubscribe.ts`
- Create: `__tests__/lib/email/unsubscribe.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/email/unsubscribe.test.ts`:

```typescript
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

// Set test secret
process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret-key-for-hmac";

describe("unsubscribe tokens", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  it("generates a non-empty token string", () => {
    const token = generateUnsubscribeToken(userId);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("verifies a valid token and returns the userId", () => {
    const token = generateUnsubscribeToken(userId);
    const result = verifyUnsubscribeToken(token);
    expect(result).toBe(userId);
  });

  it("returns null for a tampered token", () => {
    const token = generateUnsubscribeToken(userId);
    const tampered = token.slice(0, -4) + "xxxx";
    const result = verifyUnsubscribeToken(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a completely invalid token", () => {
    const result = verifyUnsubscribeToken("not-a-real-token");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", () => {
    const result = verifyUnsubscribeToken("");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/email/unsubscribe.test.ts --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the unsubscribe utility**

Create `src/lib/email/unsubscribe.ts`:

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("EMAIL_UNSUBSCRIBE_SECRET is not set");
  return secret;
}

export function generateUnsubscribeToken(userId: string): string {
  const hmac = createHmac("sha256", getSecret()).update(userId).digest("hex");
  // Token format: userId.hmac (both hex-safe, no encoding needed)
  return `${userId}.${hmac}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return null;

    const userId = token.slice(0, dotIndex);
    const providedHmac = token.slice(dotIndex + 1);

    if (!userId || !providedHmac) return null;

    const expectedHmac = createHmac("sha256", getSecret())
      .update(userId)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    if (providedHmac.length !== expectedHmac.length) return null;

    const a = Buffer.from(providedHmac, "hex");
    const b = Buffer.from(expectedHmac, "hex");

    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;

    return userId;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/email/unsubscribe.test.ts --verbose
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/unsubscribe.ts __tests__/lib/email/unsubscribe.test.ts
git commit -m "feat: add HMAC-based unsubscribe token utility with tests"
```

---

## Task 5: Shared Email Components

**Files:**
- Create: `src/emails/components/layout.tsx`
- Create: `src/emails/components/button.tsx`

Brand reference: Match the magic link email style from `docs/superpowers/specs/2026-04-13-magic-link-email-design.md`. Primary color `#1a1a1a`, font Inter, 3px accent bar, max-width 480px.

- [ ] **Step 1: Create the shared layout component**

Create `src/emails/components/layout.tsx`:

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";

interface LayoutProps {
  children: React.ReactNode;
  unsubscribeUrl: string;
}

export function Layout({ children, unsubscribeUrl }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#f6f6f6",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Accent bar */}
          <Section style={{ height: "3px", backgroundColor: "#1a1a1a" }} />

          {/* Header */}
          <Section style={{ padding: "36px 32px 0 32px" }}>
            <Text
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1a1a1a",
                letterSpacing: "3px",
                textTransform: "uppercase" as const,
                margin: "0 0 28px 0",
              }}
            >
              Taylor Resumé
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: "0 32px" }}>{children}</Section>

          {/* Footer */}
          <Section style={{ padding: "24px 32px 36px 32px" }}>
            <Hr style={{ borderColor: "#e5e5e5", margin: "0 0 16px 0" }} />
            <Text
              style={{
                fontSize: "12px",
                color: "#999",
                lineHeight: "1.5",
                margin: 0,
              }}
            >
              You're receiving this because you signed up for Taylor Resumé.
              <br />
              <Link href={unsubscribeUrl} style={{ color: "#999" }}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Create the shared button component**

Create `src/emails/components/button.tsx`:

```tsx
import { Button as ReactEmailButton } from "@react-email/components";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <ReactEmailButton
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        padding: "12px 32px",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "2px",
        textTransform: "uppercase" as const,
        textDecoration: "none",
        borderRadius: "0px",
      }}
    >
      {children}
    </ReactEmailButton>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/emails/components/layout.tsx src/emails/components/button.tsx
git commit -m "feat: add shared email layout and button components"
```

---

## Task 6: Onboarding Email Templates

**Files:**
- Create: `src/emails/onboarding/welcome.tsx`
- Create: `src/emails/onboarding/resume-nudge.tsx`
- Create: `src/emails/onboarding/first-generation.tsx`
- Create: `src/emails/onboarding/value-proof.tsx`
- Create: `src/emails/onboarding/social-proof.tsx`
- Create: `src/emails/onboarding/upgrade-nudge.tsx`

All emails use the shared `Layout` and `Button` components. Base URL for CTAs: `https://taylorresume.com`

- [ ] **Step 1: Create welcome email**

Create `src/emails/onboarding/welcome.tsx`:

```tsx
import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface WelcomeEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function WelcomeEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: WelcomeEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>Welcome to Taylor Resumé.</Text>
      <Text style={paragraph}>
        You've got {creditsRemaining} free credits — each one turns your resume
        into a tailored, ATS-optimized version for a specific job. Plus a
        matching cover letter.
      </Text>
      <Text style={paragraph}>Here's how it works:</Text>
      <Text style={paragraph}>
        1. Upload your baseline resume (just once)
        <br />
        2. Paste a job posting you're interested in
        <br />
        3. Get a tailored resume + cover letter in minutes
      </Text>
      <Text style={paragraph}>Your first step: upload your resume.</Text>
      <Button href={`${BASE_URL}/dashboard/resumes`}>
        Upload Your Resume
      </Button>
      <Text style={smallText}>
        You have {creditsRemaining} credits remaining. No credit card required.
      </Text>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#999",
  lineHeight: "1.5",
  marginTop: "24px",
};

export default WelcomeEmail;
```

- [ ] **Step 2: Create resume-nudge email**

Create `src/emails/onboarding/resume-nudge.tsx`:

```tsx
import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface ResumeNudgeEmailProps {
  firstName: string | null;
  unsubscribeUrl: string;
}

export function ResumeNudgeEmail({
  firstName,
  unsubscribeUrl,
}: ResumeNudgeEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        Quick one — have you uploaded your baseline resume yet?
      </Text>
      <Text style={paragraph}>
        It takes about 30 seconds. Once it's in, you can tailor it to any job
        posting without re-uploading.
      </Text>
      <Text style={paragraph}>Just drag and drop your Word doc or PDF.</Text>
      <Button href={`${BASE_URL}/dashboard/resumes`}>Upload Resume</Button>
      <Text style={smallText}>
        Tip: Use your most recent, complete resume. Taylor handles the tailoring
        — you just need the raw material.
      </Text>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#999",
  lineHeight: "1.5",
  marginTop: "24px",
};

export default ResumeNudgeEmail;
```

- [ ] **Step 3: Create first-generation email**

Create `src/emails/onboarding/first-generation.tsx`:

```tsx
import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface FirstGenerationEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function FirstGenerationEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: FirstGenerationEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        If you've got a job posting you're eyeing, now's the time to try Taylor.
      </Text>
      <Text style={paragraph}>
        Paste the job description, pick a template (Modern, Classic, or
        Minimal), and Taylor will:
      </Text>
      <Text style={paragraph}>
        — Match your experience to what the role actually needs
        <br />
        — Rewrite your resume to speak to the job requirements
        <br />
        — Generate a matching cover letter
        <br />— Score your ATS compatibility before and after
      </Text>
      <Text style={paragraph}>
        The whole thing takes a few minutes. And it's free — you've got{" "}
        {creditsRemaining} credits.
      </Text>
      <Button href={`${BASE_URL}/dashboard/jobs/new`}>
        Tailor Your First Resume
      </Button>
      <Text style={smallText}>
        Each credit = 1 tailored resume + cover letter + ATS score.
      </Text>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#999",
  lineHeight: "1.5",
  marginTop: "24px",
};

export default FirstGenerationEmail;
```

- [ ] **Step 4: Create value-proof email**

Create `src/emails/onboarding/value-proof.tsx`:

```tsx
import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface ValueProofEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  jobTitle: string | null;
  companyName: string | null;
  unsubscribeUrl: string;
}

export function ValueProofEmail({
  firstName,
  creditsRemaining,
  jobTitle,
  companyName,
  unsubscribeUrl,
}: ValueProofEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";
  const jobDescription =
    jobTitle && companyName
      ? `your first tailored resume for ${jobTitle} at ${companyName}`
      : "your first tailored resume";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>Nice — you've got {jobDescription}.</Text>
      <Text style={paragraph}>
        Here's something worth knowing: over 75% of resumes are filtered out by
        ATS software before a recruiter ever sees them. Your tailored version is
        built to get through.
      </Text>
      <Text style={paragraph}>A few things you can do now:</Text>
      <Text style={paragraph}>
        — Download your resume and cover letter (Word + PDF)
        <br />
        — Check your ATS score comparison
        <br />— Add this job to your tracker to follow up
      </Text>
      <Text style={paragraph}>
        You've got {creditsRemaining} credits left. Every job you're serious
        about deserves a tailored resume.
      </Text>
      <Button href={`${BASE_URL}/dashboard/jobs`}>View Your Generation</Button>
      <Text style={smallText}>
        Tip: Use the Job Tracker to keep tabs on where you've applied.
      </Text>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#999",
  lineHeight: "1.5",
  marginTop: "24px",
};

export default ValueProofEmail;
```

- [ ] **Step 5: Create social-proof email**

Create `src/emails/onboarding/social-proof.tsx`:

```tsx
import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface SocialProofEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function SocialProofEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: SocialProofEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        Most people send the same resume everywhere and wonder why they don't
        hear back. The ones who land interviews do something different — they
        tailor.
      </Text>
      <Text style={paragraph}>Taylor makes that easy:</Text>
      <Text style={paragraph}>
        — Paste the job posting
        <br />
        — Get a resume that speaks directly to what the employer wants
        <br />— Download and apply in minutes
      </Text>
      <Text style={paragraph}>
        You still have {creditsRemaining} credits. Each one is a chance to put
        your best foot forward for a role you care about.
      </Text>
      <Button href={`${BASE_URL}/dashboard/jobs/new`}>
        Tailor Another Resume
      </Button>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

export default SocialProofEmail;
```

- [ ] **Step 6: Create upgrade-nudge email**

Create `src/emails/onboarding/upgrade-nudge.tsx`:

```tsx
import { Text, Link } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface UpgradeNudgeEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function UpgradeNudgeEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: UpgradeNudgeEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        You've been putting your credits to work — nice.
      </Text>
      <Text style={paragraph}>
        If you're actively applying, here are your options to keep going:
      </Text>
      <Text style={paragraph}>
        → <strong>Pro Plan</strong> — 60 credits/month for $7.99
        <br />→ <strong>Ultimate Plan</strong> — 300 credits/month for $19.99
        <br />→ <strong>Credit Pack</strong> — 30 credits for $3.99 (one-time)
      </Text>
      <Text style={paragraph}>
        Every tailored resume gives you a better shot. No reason to send a
        generic one when it takes two minutes to customize.
      </Text>
      <Button href={`${BASE_URL}/pricing`}>See Plans</Button>
      <Text style={smallText}>
        All plans include: ATS scoring, cover letters, Word + PDF downloads, and
        the Job Tracker.
      </Text>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#999",
  lineHeight: "1.5",
  marginTop: "24px",
};

export default UpgradeNudgeEmail;
```

- [ ] **Step 7: Commit all email templates**

```bash
git add src/emails/
git commit -m "feat: add 6 onboarding email templates with React Email"
```

---

## Task 7: Onboarding Sequence Logic

**Files:**
- Create: `src/lib/email/onboarding-sequence.ts`
- Create: `__tests__/lib/email/onboarding-sequence.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/email/onboarding-sequence.test.ts`:

```typescript
import {
  getNextOnboardingStep,
  type UserOnboardingState,
} from "@/lib/email/onboarding-sequence";

describe("getNextOnboardingStep", () => {
  const baseUser: UserOnboardingState = {
    userId: "user-1",
    email: "test@example.com",
    firstName: null,
    signupDate: new Date("2026-04-01T00:00:00Z"),
    hasResume: false,
    hasGeneration: false,
    firstGenerationAt: null,
    firstGenerationJobTitle: null,
    firstGenerationCompany: null,
    hasPaidPlan: false,
    creditsRemaining: 10,
    emailsSent: [],
  };

  it("returns welcome as first step for a new user", () => {
    const now = new Date("2026-04-01T00:00:00Z");
    const result = getNextOnboardingStep(baseUser, now);
    expect(result?.step).toBe("welcome");
  });

  it("returns resume_nudge on day 1 if welcome was sent", () => {
    const now = new Date("2026-04-02T09:00:00Z");
    const user = { ...baseUser, emailsSent: ["welcome"] };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("resume_nudge");
  });

  it("skips resume_nudge if user already has a resume", () => {
    const now = new Date("2026-04-02T09:00:00Z");
    const user = { ...baseUser, emailsSent: ["welcome"], hasResume: true };
    const result = getNextOnboardingStep(user, now);
    // Should skip to first_gen_push, but day 3 hasn't arrived yet
    expect(result).toBeNull();
  });

  it("returns first_gen_push on day 3 if resume_nudge skipped", () => {
    const now = new Date("2026-04-04T09:00:00Z");
    const user = { ...baseUser, emailsSent: ["welcome"], hasResume: true };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("first_gen_push");
  });

  it("skips first_gen_push if user already has a generation", () => {
    const now = new Date("2026-04-04T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-02T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    // value_proof should be eligible (1 day after first_generation_at = Apr 3)
    expect(result?.step).toBe("value_proof");
  });

  it("returns value_proof 1 day after first generation", () => {
    const now = new Date("2026-04-06T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge", "first_gen_push"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-05T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("value_proof");
  });

  it("does not return value_proof if no generation exists", () => {
    const now = new Date("2026-04-10T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge", "first_gen_push"],
    };
    const result = getNextOnboardingStep(user, now);
    // Skips value_proof (no generation), goes to social_proof on day 7
    expect(result?.step).toBe("social_proof");
  });

  it("returns social_proof on day 7", () => {
    const now = new Date("2026-04-08T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge", "first_gen_push", "value_proof"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-03T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("social_proof");
  });

  it("returns upgrade_nudge on day 14 for free users", () => {
    const now = new Date("2026-04-15T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: [
        "welcome",
        "resume_nudge",
        "first_gen_push",
        "value_proof",
        "social_proof",
      ],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-03T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("upgrade_nudge");
  });

  it("skips upgrade_nudge if user has a paid plan", () => {
    const now = new Date("2026-04-15T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: [
        "welcome",
        "resume_nudge",
        "first_gen_push",
        "value_proof",
        "social_proof",
      ],
      hasPaidPlan: true,
    };
    const result = getNextOnboardingStep(user, now);
    expect(result).toBeNull();
  });

  it("sends upgrade_nudge early when credits <= 2", () => {
    const now = new Date("2026-04-05T09:00:00Z"); // Only day 4
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-03T00:00:00Z"),
      creditsRemaining: 2,
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("upgrade_nudge");
  });

  it("returns null when all emails have been sent", () => {
    const now = new Date("2026-04-20T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: [
        "welcome",
        "resume_nudge",
        "first_gen_push",
        "value_proof",
        "social_proof",
        "upgrade_nudge",
      ],
    };
    const result = getNextOnboardingStep(user, now);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/email/onboarding-sequence.test.ts --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the sequence logic**

Create `src/lib/email/onboarding-sequence.ts`:

```typescript
export interface UserOnboardingState {
  userId: string;
  email: string;
  firstName: string | null;
  signupDate: Date;
  hasResume: boolean;
  hasGeneration: boolean;
  firstGenerationAt: Date | null;
  firstGenerationJobTitle: string | null;
  firstGenerationCompany: string | null;
  hasPaidPlan: boolean;
  creditsRemaining: number;
  emailsSent: string[];
}

interface SequenceStep {
  step: string;
  delay: number;
  skipIf: string | null;
  afterEvent?: string;
}

const ONBOARDING_SEQUENCE: SequenceStep[] = [
  { step: "welcome", delay: 0, skipIf: null },
  { step: "resume_nudge", delay: 1, skipIf: "has_resume" },
  { step: "first_gen_push", delay: 3, skipIf: "has_generation" },
  {
    step: "value_proof",
    delay: 1,
    skipIf: null,
    afterEvent: "first_generation",
  },
  { step: "social_proof", delay: 7, skipIf: null },
  { step: "upgrade_nudge", delay: 14, skipIf: "has_paid_plan" },
];

function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function shouldSkip(condition: string | null, user: UserOnboardingState): boolean {
  if (!condition) return false;
  switch (condition) {
    case "has_resume":
      return user.hasResume;
    case "has_generation":
      return user.hasGeneration;
    case "has_paid_plan":
      return user.hasPaidPlan;
    default:
      return false;
  }
}

export function getNextOnboardingStep(
  user: UserOnboardingState,
  now: Date
): { step: string } | null {
  // Special case: early upgrade nudge when credits are low
  if (
    user.creditsRemaining <= 2 &&
    !user.hasPaidPlan &&
    !user.emailsSent.includes("upgrade_nudge")
  ) {
    return { step: "upgrade_nudge" };
  }

  for (const entry of ONBOARDING_SEQUENCE) {
    // Already sent
    if (user.emailsSent.includes(entry.step)) continue;

    // Should skip based on user state
    if (shouldSkip(entry.skipIf, user)) continue;

    // Check timing
    if (entry.afterEvent === "first_generation") {
      // This email requires a generation to have happened
      if (!user.firstGenerationAt) continue;
      if (daysSince(user.firstGenerationAt, now) < entry.delay) return null;
    } else {
      if (daysSince(user.signupDate, now) < entry.delay) return null;
    }

    return { step: entry.step };
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/email/onboarding-sequence.test.ts --verbose
```

Expected: All 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/onboarding-sequence.ts __tests__/lib/email/onboarding-sequence.test.ts
git commit -m "feat: add onboarding sequence logic with behavior-aware skipping"
```

---

## Task 8: User-Created Webhook Route

**Files:**
- Create: `src/app/api/webhooks/user-created/route.ts`

- [ ] **Step 1: Create the webhook route**

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";
import { WelcomeEmail } from "@/emails/onboarding/welcome";

export async function POST(request: Request) {
  // Validate webhook secret
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = body.record;
  if (!record?.id || !record?.email) {
    return NextResponse.json({ error: "Missing user data" }, { status: 400 });
  }

  const userId = record.id;
  const email = record.email;
  const fullName = record.raw_user_meta_data?.full_name ?? "";
  const firstName = fullName.split(" ")[0] || null;

  const admin = createAdminClient();

  // Check opt-out (defensive — profile may not exist yet due to race condition)
  const { data: profile } = await admin
    .from("profiles")
    .select("email_opt_out, credits_remaining")
    .eq("user_id", userId)
    .single();

  if (profile?.email_opt_out) {
    return NextResponse.json({ skipped: true, reason: "opted_out" });
  }

  // Prevent duplicate sends on webhook retry
  const { data: existing } = await admin
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("sequence", "onboarding")
    .eq("step", "welcome")
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: "already_sent" });
  }

  const creditsRemaining = profile?.credits_remaining ?? 10;
  const unsubscribeUrl = `https://taylorresume.com/api/email/unsubscribe?token=${generateUnsubscribeToken(userId)}`;

  // Send welcome email
  const { id: resendId, error } = await sendEmail({
    to: email,
    subject: `Welcome to Taylor — your ${creditsRemaining} free credits are ready`,
    react: WelcomeEmail({ firstName, creditsRemaining, unsubscribeUrl }),
  });

  if (error) {
    console.error("[webhook/user-created] Email send failed:", error);
    // Return 200 anyway — don't block user creation. Cron will retry.
    return NextResponse.json({ sent: false, error });
  }

  // Log the email event
  await admin.from("email_events").insert({
    user_id: userId,
    sequence: "onboarding",
    step: "welcome",
    resend_id: resendId,
  });

  return NextResponse.json({ sent: true, step: "welcome" });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/user-created/route.ts
git commit -m "feat: add user-created webhook route for welcome email"
```

---

## Task 9: Cron Job Route

**Files:**
- Create: `src/app/api/cron/onboarding-emails/route.ts`

This is the most complex route. It queries eligible users, determines their next email, sends it, and logs the event.

- [ ] **Step 1: Create the cron route**

Create `src/app/api/cron/onboarding-emails/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";
import {
  getNextOnboardingStep,
  type UserOnboardingState,
} from "@/lib/email/onboarding-sequence";
import { WelcomeEmail } from "@/emails/onboarding/welcome";
import { ResumeNudgeEmail } from "@/emails/onboarding/resume-nudge";
import { FirstGenerationEmail } from "@/emails/onboarding/first-generation";
import { ValueProofEmail } from "@/emails/onboarding/value-proof";
import { SocialProofEmail } from "@/emails/onboarding/social-proof";
import { UpgradeNudgeEmail } from "@/emails/onboarding/upgrade-nudge";
import { type ReactElement } from "react";

const SUBJECTS: Record<string, string | ((props: Record<string, unknown>) => string)> = {
  welcome: (props) =>
    `Welcome to Taylor — your ${props.creditsRemaining} free credits are ready`,
  resume_nudge: "One upload, unlimited tailoring",
  first_gen_push: "Found a job worth applying to?",
  value_proof: "Your ATS score jumped — here's why that matters",
  social_proof: "How job seekers use Taylor to land interviews",
  upgrade_nudge: "Running low on credits?",
};

function buildEmail(
  step: string,
  props: {
    firstName: string | null;
    creditsRemaining: number;
    jobTitle: string | null;
    companyName: string | null;
    unsubscribeUrl: string;
  }
): ReactElement | null {
  switch (step) {
    case "welcome":
      return WelcomeEmail(props);
    case "resume_nudge":
      return ResumeNudgeEmail(props);
    case "first_gen_push":
      return FirstGenerationEmail(props);
    case "value_proof":
      return ValueProofEmail(props);
    case "social_proof":
      return SocialProofEmail(props);
    case "upgrade_nudge":
      return UpgradeNudgeEmail(props);
    default:
      return null;
  }
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Fetch eligible users via RPC
  const { data: users, error: rpcError } = await admin.rpc(
    "get_onboarding_eligible_users"
  );

  if (rpcError) {
    console.error("[cron/onboarding] RPC error:", rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, skipped: 0, errors: 0 });
  }

  // Fetch all onboarding email events for these users in one query
  const userIds = users.map((u: { user_id: string }) => u.user_id);
  const { data: allEvents } = await admin
    .from("email_events")
    .select("user_id, step")
    .eq("sequence", "onboarding")
    .in("user_id", userIds);

  // Group events by user
  const eventsByUser = new Map<string, string[]>();
  for (const event of allEvents ?? []) {
    const existing = eventsByUser.get(event.user_id) ?? [];
    existing.push(event.step);
    eventsByUser.set(event.user_id, existing);
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    const emailsSent = eventsByUser.get(user.user_id) ?? [];

    // Skip if all 6 emails already sent
    if (emailsSent.length >= 6) {
      skipped++;
      continue;
    }

    const state: UserOnboardingState = {
      userId: user.user_id,
      email: user.email,
      firstName: (user.full_name ?? "").split(" ")[0] || null,
      signupDate: new Date(user.created_at),
      hasResume: user.has_resume,
      hasGeneration: user.has_generation,
      firstGenerationAt: user.first_generation_at
        ? new Date(user.first_generation_at)
        : null,
      firstGenerationJobTitle: user.first_generation_job_title,
      firstGenerationCompany: user.first_generation_company,
      hasPaidPlan: !["free", "credit_pack"].includes(user.plan_type ?? "free"),
      creditsRemaining: user.credits_remaining ?? 0,
      emailsSent,
    };

    const next = getNextOnboardingStep(state, now);
    if (!next) {
      skipped++;
      continue;
    }

    const unsubscribeUrl = `https://taylorresume.com/api/email/unsubscribe?token=${generateUnsubscribeToken(user.user_id)}`;

    const emailProps = {
      firstName: (user.full_name ?? "").split(" ")[0] || null,
      creditsRemaining: user.credits_remaining ?? 0,
      jobTitle: user.first_generation_job_title,
      companyName: user.first_generation_company,
      unsubscribeUrl,
    };

    const react = buildEmail(next.step, emailProps);
    if (!react) {
      console.error(`[cron/onboarding] Unknown step: ${next.step}`);
      errors++;
      continue;
    }

    const subjectEntry = SUBJECTS[next.step];
    const subject =
      typeof subjectEntry === "function"
        ? subjectEntry(emailProps)
        : subjectEntry;

    const { id: resendId, error } = await sendEmail({
      to: user.email,
      subject,
      react,
    });

    if (error) {
      console.error(
        `[cron/onboarding] Failed to send ${next.step} to ${user.email}:`,
        error
      );
      errors++;
      continue;
    }

    // Log the email event
    await admin.from("email_events").insert({
      user_id: user.user_id,
      sequence: "onboarding",
      step: next.step,
      resend_id: resendId,
    });

    sent++;
  }

  return NextResponse.json({
    processed: users.length,
    sent,
    skipped,
    errors,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/onboarding-emails/route.ts
git commit -m "feat: add onboarding emails cron job with behavior-aware sequencing"
```

---

## Task 10: Unsubscribe Route

**Files:**
- Create: `src/app/api/email/unsubscribe/route.ts`

- [ ] **Step 1: Create the unsubscribe route**

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response(htmlPage("Invalid link", "This unsubscribe link is invalid."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return new Response(htmlPage("Invalid link", "This unsubscribe link is invalid or has been tampered with."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ email_opt_out: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[unsubscribe] Failed to update profile:", error);
    return new Response(htmlPage("Error", "Something went wrong. Please try again."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(
    htmlPage(
      "Unsubscribed",
      "You've been unsubscribed from Taylor Resumé emails. You can re-enable emails in your account settings."
    ),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Taylor Resumé</title>
  <style>
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f6f6f6;
      color: #1a1a1a;
    }
    .card {
      background: white;
      padding: 48px;
      max-width: 400px;
      text-align: center;
    }
    .brand {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    p { font-size: 14px; line-height: 1.6; color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Taylor Resumé</div>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/email/unsubscribe/route.ts
git commit -m "feat: add email unsubscribe route with HMAC token verification"
```

---

## Task 11: Build Verification and Final Commit

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests pass, including the new `unsubscribe.test.ts` and `onboarding-sequence.test.ts`.

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No type errors. If React Email types cause issues, check that `@react-email/components` types are compatible with the project's React version.

- [ ] **Step 3: Run the build**

```bash
npm run build
```

Expected: Build succeeds. All API routes compile correctly.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: No lint errors in new files. Fix any issues found.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address build/lint/type issues in onboarding email system"
```

---

## Post-Implementation: Manual Configuration

These steps must be done outside the codebase:

1. **Resend**: Create account at resend.com, get API key, verify domain `taylorresume.com`
2. **Supabase Dashboard**: Configure Database Webhook on `auth.users` INSERT → `https://taylorresume.com/api/webhooks/user-created` with `x-webhook-secret` header
3. **Vercel**: Add env vars (`RESEND_API_KEY`, `SUPABASE_WEBHOOK_SECRET`, `CRON_SECRET`, `EMAIL_UNSUBSCRIBE_SECRET`) to project settings
4. **Vercel**: Deploy — cron job will auto-register from `vercel.json`
5. **Test**: Sign up with a new account and verify welcome email arrives
