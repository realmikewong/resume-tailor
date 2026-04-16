# Onboarding Email Sequence Design Spec

## Overview

Automated 6-email onboarding sequence for new Taylor Resumé users. Goal: activate users (first resume upload → first generation) then convert free users to a paid plan. Behavior-aware — emails are skipped based on what the user has already done.

## Architecture

```
auth.users INSERT
  → Supabase Database Webhook
    → POST /api/webhooks/user-created
      → Resend API: send welcome email
      → Insert into email_events table

Follow-up emails (2-6):
  → Vercel Cron (daily at 9am UTC)
    → GET /api/cron/onboarding-emails
      → Query eligible users + activity state
      → Send next eligible email via Resend
      → Log to email_events
```

## Email Provider: Resend

- Developer-friendly REST API with TypeScript SDK
- First-class React Email support (emails as React components)
- 3,000 emails/month free tier
- Scales to $20/month for 50k emails
- Shared `src/lib/resend.ts` utility initializes the client — reusable for future newsletter

## Data Model

### New table: `email_events`

```sql
CREATE TABLE email_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence    VARCHAR(50) NOT NULL,    -- 'onboarding', 'newsletter', etc.
  step        VARCHAR(50) NOT NULL,    -- 'welcome', 'resume_nudge', etc.
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_id   VARCHAR(255),            -- Resend message ID for debugging
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_events_user_sequence ON email_events(user_id, sequence);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
CREATE POLICY "Users read own email events" ON email_events
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT policy needed — API routes use the admin client (service role),
-- which bypasses RLS entirely. This prevents unauthorized inserts.
```

### New column on `profiles`

```sql
ALTER TABLE profiles ADD COLUMN email_opt_out BOOLEAN DEFAULT FALSE;
```

No onboarding-specific columns on profiles. The cron job derives sequence state from `email_events` + user activity tables.

## Webhook: User Created

### Supabase Database Webhook Configuration

- Table: `auth.users`
- Event: `INSERT`
- URL: `https://taylorresume.com/api/webhooks/user-created`
- Header: `x-webhook-secret: <SUPABASE_WEBHOOK_SECRET>`

### API Route: `src/app/api/webhooks/user-created/route.ts`

1. Validate `x-webhook-secret` header against `SUPABASE_WEBHOOK_SECRET` env var
2. Parse body, extract user `id` and `email`
3. Check `profiles.email_opt_out` (defensive — should be false for new users). If profile row not found yet (race condition with `handle_new_user()` trigger), treat as opt-in and proceed.
4. Send welcome email via Resend
5. Insert into `email_events` (sequence: `onboarding`, step: `welcome`)
6. Return 200 even on email failure — user signup must never fail because of email. Failed sends are retried by the next cron run.

## Cron Job: Onboarding Emails

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/onboarding-emails",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### API Route: `src/app/api/cron/onboarding-emails/route.ts`

Secured with `CRON_SECRET` env var (Vercel checks `Authorization: Bearer <CRON_SECRET>` header).

### Sequence Definition

Defined as a code array, not in the database. Easy to update without migrations.

```typescript
const ONBOARDING_SEQUENCE = [
  { step: 'welcome',        delay: 0,  skipIf: null },
  { step: 'resume_nudge',   delay: 1,  skipIf: 'has_resume' },
  { step: 'first_gen_push', delay: 3,  skipIf: 'has_generation' },
  { step: 'value_proof',    delay: 1,  skipIf: null,            afterEvent: 'first_generation' },
  { step: 'social_proof',   delay: 7,  skipIf: null },
  { step: 'upgrade_nudge',  delay: 14, skipIf: 'has_paid_plan' },
]
```

- `delay` — days after signup (or after `afterEvent` if specified)
- `skipIf` — condition that skips this email entirely
- `afterEvent` — delay is calculated from `first_generation_at` (from the activity query) rather than `u.created_at`. If the event hasn't occurred, the email is not eligible to send.

### Cron Logic

```
1. Fetch users where:
   - signed up within last 21 days
   - email_opt_out = false
   - NOT all 6 onboarding emails already sent

2. For each user, single query pulls activity state:
   - has_resume (resumes table count > 0)
   - has_generation (generations table count > 0)
   - first_generation_at (MIN created_at from generations)
   - has_paid_plan (profiles.plan_type NOT IN ('free', 'credit_pack') — i.e., has an active subscription)
   - credits_remaining (from profiles)
   - emails already sent (from email_events)

3. Walk ONBOARDING_SEQUENCE array:
   - Find first step not yet sent AND not skipped by condition
   - Check if enough days have elapsed
   - If yes → send email, log to email_events
   - Send ONE email per user per cron run (no batching)

4. Special case: if credits_remaining <= 2 AND user is on free plan
   AND upgrade_nudge not yet sent → send it regardless of day-14 timing

5. Return summary: { processed, sent, skipped, errors }
```

### Activity Check Query

This query must be implemented as a Postgres function (RPC) since `auth.users` is not accessible via the Supabase client's `.from()` method. The admin client calls it via `supabase.rpc('get_onboarding_eligible_users')`.

```sql
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
    (SELECT j.title FROM generations g JOIN jobs j ON j.id = g.job_id
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

### Edge Cases

- **User signs up and immediately upgrades** — `upgrade_nudge` skipped, sequence ends early
- **User does everything on day 1** — `resume_nudge` and `first_gen_push` skipped; `value_proof` sends day 2; `social_proof` day 7; `upgrade_nudge` day 14 if still free
- **User never does anything** — gets welcome, resume_nudge (day 1), first_gen_push (day 3), social_proof (day 7), upgrade_nudge (day 14). `value_proof` never sent (requires a generation)
- **Email send fails** — error logged, no `email_events` row inserted. Next cron run retries same step.
- **Cron runs twice** — "already sent" check prevents duplicates

## Unsubscribe

### Link format

```
https://taylorresume.com/api/email/unsubscribe?token=<HMAC_signed_token>
```

Included in every email via shared layout component.

### API Route: `src/app/api/email/unsubscribe/route.ts`

1. Verify HMAC token (signed with `EMAIL_UNSUBSCRIBE_SECRET`, contains `user_id`)
2. Set `profiles.email_opt_out = true` via admin client
3. Return simple HTML page: "You've been unsubscribed."

No login required — unsubscribe must be frictionless. Token prevents abuse.

### Unsubscribe utility: `src/lib/email/unsubscribe.ts`

- `generateUnsubscribeToken(userId)` — creates HMAC-signed token
- `verifyUnsubscribeToken(token)` — validates and extracts userId
- Used by email templates and unsubscribe route

## Resend Integration

### Shared utility: `src/lib/resend.ts`

```typescript
// Initializes Resend client
// Exports sendEmail(to, subject, reactComponent, options) → { id, error }
// FROM address: "Taylor Resumé <hello@taylorresume.com>"
```

Reusable for onboarding and future newsletter.

## Email Templates

### File structure

```
src/emails/
├── onboarding/
│   ├── welcome.tsx
│   ├── resume-nudge.tsx
│   ├── first-generation.tsx
│   ├── value-proof.tsx
│   ├── social-proof.tsx
│   └── upgrade-nudge.tsx
└── components/
    ├── layout.tsx        -- branded header, footer, unsubscribe link
    └── button.tsx        -- styled CTA button
```

### Brand alignment

Matches existing magic link email style:
- Primary color: `#1a1a1a`
- Font: Inter with system fallbacks
- Accent bar at top (3px, `#1a1a1a`)
- Clean, left-aligned layout
- Max width: 480px

### Email Sequence Summary

| # | Step | Send Timing | Skip If | Purpose |
|---|------|-------------|---------|---------|
| 1 | `welcome` | Immediately (webhook) | — | Deliver credits, prompt resume upload |
| 2 | `resume_nudge` | Day 1 | Has resume | Push to upload |
| 3 | `first_gen_push` | Day 3 | Has generation | Push to tailor first resume |
| 4 | `value_proof` | 1 day after first gen | No generation ever | Celebrate, show ATS score |
| 5 | `social_proof` | Day 7 | — | Build confidence |
| 6 | `upgrade_nudge` | Day 14 or credits ≤ 2 | Has paid plan | Present pricing |

### Email content

Each email: 100-250 words, one CTA button, conversational tone, mobile-first.

**Email 1 — Welcome** (immediate)
- Subject: "Welcome to Taylor — your 10 free credits are ready"
- CTA: Upload Your Resume → /dashboard/resumes
- Props: firstName, creditsRemaining (use actual value from DB, not hardcoded — in case initial credit amount changes)

**Email 2 — Resume Nudge** (day 1, skip if has_resume)
- Subject: "One upload, unlimited tailoring"
- CTA: Upload Resume → /dashboard/resumes
- Props: firstName

**Email 3 — First Generation Push** (day 3, skip if has_generation)
- Subject: "Found a job worth applying to?"
- CTA: Tailor Your First Resume → /dashboard/jobs/new
- Props: firstName, creditsRemaining

**Email 4 — Value Proof** (1 day after first generation, skip if no generation)
- Subject: "Your ATS score jumped — here's why that matters"
- CTA: View Your Generation → /dashboard/jobs
- Props: firstName, creditsRemaining, jobTitle, companyName

**Email 5 — Social Proof** (day 7)
- Subject: "How job seekers use Taylor to land interviews"
- CTA: Tailor Another Resume → /dashboard/jobs/new
- Props: firstName, creditsRemaining

**Email 6 — Upgrade Nudge** (day 14 or credits ≤ 2, skip if has_paid_plan)
- Subject: "Running low on credits?"
- CTA: See Plans → /pricing
- Props: firstName, creditsRemaining

## Environment Variables

New variables to add:

```
RESEND_API_KEY=re_xxx
SUPABASE_WEBHOOK_SECRET=<generated_secret>
CRON_SECRET=<generated_secret>
EMAIL_UNSUBSCRIBE_SECRET=<generated_secret>
```

## File Structure Summary

```
New files:
├── vercel.json                                    -- cron config
├── supabase/migrations/NNN_email_onboarding.sql   -- email_events table + profiles column
├── src/lib/resend.ts                              -- Resend client utility
├── src/lib/email/unsubscribe.ts                   -- token sign/verify
├── src/app/api/webhooks/user-created/route.ts     -- webhook handler
├── src/app/api/cron/onboarding-emails/route.ts    -- cron handler
├── src/app/api/email/unsubscribe/route.ts         -- unsubscribe handler
├── src/emails/components/layout.tsx               -- shared email layout
├── src/emails/components/button.tsx               -- shared CTA button
├── src/emails/onboarding/welcome.tsx
├── src/emails/onboarding/resume-nudge.tsx
├── src/emails/onboarding/first-generation.tsx
├── src/emails/onboarding/value-proof.tsx
├── src/emails/onboarding/social-proof.tsx
└── src/emails/onboarding/upgrade-nudge.tsx
```

## Future: Newsletter

The `email_events` table supports a `sequence` column — newsletter sends would use `sequence: 'newsletter'`. The shared Resend utility, email layout components, and unsubscribe flow all carry over. When ready, add per-sequence opt-out via `email_preferences` JSONB column on profiles.
