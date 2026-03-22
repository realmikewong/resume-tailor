# Resume Tailor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where job seekers upload a resume, submit job postings, and receive tailored resumes and cover letters as formatted Word/PDF documents.

**Architecture:** Next.js app on Vercel with Supabase (auth, Postgres DB, file storage). Job posting scraping via serverless functions. LLM-powered resume tailoring via existing Make.com workflow with webhook integration. Stripe Checkout for credit-based payments. Document generation server-side using `docx` and `@react-pdf/renderer`.

**Tech Stack:** Next.js (App Router, latest), TypeScript, Tailwind CSS, Supabase (Auth + DB + Storage + Realtime), Make.com, Stripe, docx, pdf-lib, mammoth, pdf-parse, cheerio

**Spec:** `docs/superpowers/specs/2026-03-21-resume-tailor-design.md`

---

## File Structure

```
resume-tailor/
├── .env.local                          # Local env vars (Supabase, Stripe, Make.com keys)
├── .env.example                        # Template for env vars (no secrets)
├── next.config.js                      # Next.js configuration
├── tailwind.config.ts                  # Tailwind CSS config
├── tsconfig.json                       # TypeScript config
├── package.json
├── middleware.ts                        # Supabase auth middleware (protects routes)
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # All tables, enums, RLS policies, RPC functions
│   └── seed.sql                        # Dev seed data
│
├── src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server-side Supabase client
│   │   │   └── admin.ts                # Service-role client (for API routes)
│   │   ├── stripe.ts                   # Stripe client + helpers
│   │   ├── credits.ts                  # Credit deduction/refund RPC wrappers
│   │   ├── scraper.ts                  # URL scraping + LLM field extraction
│   │   ├── resume-parser.ts            # Text extraction from .docx and .pdf
│   │   └── document-generator.ts       # Word + PDF generation with templates
│   │
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (fonts, global styles)
│   │   ├── page.tsx                    # Landing page (unauthenticated)
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Magic link form
│   │   │   └── callback/route.ts       # Auth callback handler
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Authenticated layout (sidebar nav)
│   │   │   ├── page.tsx                # Dashboard home (summary cards, recent generations)
│   │   │   │
│   │   │   ├── resumes/
│   │   │   │   └── page.tsx            # Resume management (upload, list, set active)
│   │   │   │
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx            # Job tracker table
│   │   │   │   └── new/
│   │   │   │       └── page.tsx        # New job submission (5-step flow)
│   │   │   │
│   │   │   ├── account/
│   │   │   │   └── page.tsx            # Account & billing (credits, Stripe, history)
│   │   │   │
│   │   │   └── generations/
│   │   │       └── [id]/page.tsx       # Generation results (preview + download)
│   │   │
│   │   └── api/
│   │       ├── scrape/route.ts         # Job URL scraping endpoint
│   │       ├── upload-resume/route.ts  # Resume upload + text extraction
│   │       ├── generate/route.ts       # Trigger Make.com workflow
│   │       ├── callback/route.ts       # Receive Make.com results + generate docs
│   │       └── webhooks/
│   │           └── stripe/route.ts     # Stripe webhook handler
│   │
│   └── components/
│       ├── ui/                         # Shared UI primitives (Button, Card, Input, etc.)
│       ├── landing/
│       │   └── hero.tsx                # Landing page hero section
│       ├── auth/
│       │   └── magic-link-form.tsx     # Email input + submit for magic link
│       ├── dashboard/
│       │   ├── sidebar.tsx             # Navigation sidebar
│       │   ├── summary-cards.tsx       # Dashboard stat cards
│       │   └── recent-generations.tsx  # Recent generations list
│       ├── resumes/
│       │   ├── upload-zone.tsx         # Drag-and-drop file upload
│       │   ├── resume-list.tsx         # List of uploaded resumes
│       │   └── text-preview.tsx        # Extracted text preview
│       ├── jobs/
│       │   ├── job-form.tsx            # Job details form (shared by scrape + manual)
│       │   ├── scrape-input.tsx        # URL input with scrape trigger
│       │   ├── template-picker.tsx     # Visual template selection
│       │   ├── processing-status.tsx   # Realtime generation status
│       │   ├── job-tracker-table.tsx   # Application tracker table
│       │   └── add-manual-job-button.tsx # Track a job without generation
│       └── generations/
│           └── download-buttons.tsx    # Word/PDF download buttons
│
├── __tests__/
│   ├── lib/
│   │   ├── credits.test.ts            # Credit deduction/refund logic
│   │   ├── resume-parser.test.ts      # Text extraction tests
│   │   ├── scraper.test.ts            # Scraping + field extraction tests
│   │   └── document-generator.test.ts # Document generation tests
│   └── api/
│       ├── callback.test.ts           # Make.com callback validation tests
│       └── stripe-webhook.test.ts     # Stripe webhook handler tests
│
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-03-21-resume-tailor-design.md
        └── plans/
            └── 2026-03-22-resume-tailor-plan.md
```

---

## Phase 1: Foundation (Project Setup, Database, Auth)

### Task 1: Create GitHub Repo and Next.js Project

**Files:**
- Create: `resume-tailor/` (entire project scaffold)
- Create: `resume-tailor/.env.example`
- Create: `resume-tailor/.gitignore`

- [ ] **Step 1: Create GitHub repo**

```bash
cd /Users/mikewong
gh repo create resume-tailor --public --clone
cd resume-tailor
```

- [ ] **Step 2: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This creates the Next.js project with TypeScript, Tailwind CSS, ESLint, App Router, and a `src/` directory.

- [ ] **Step 3: Install core dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 4: Create `.env.example`**

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MAKE_WEBHOOK_URL=your-make-webhook-url
MAKE_CALLBACK_BASE_URL=https://your-app.vercel.app/api/callback
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
OPENAI_API_KEY=your-openai-api-key
```

- [ ] **Step 5: Create `.env.local` from example**

Copy `.env.example` to `.env.local`. Do NOT commit `.env.local` — it's already in `.gitignore` by default.

```bash
cp .env.example .env.local
```

- [ ] **Step 6: Verify project runs**

```bash
npm run dev
```

Expected: App starts at `http://localhost:3000` showing the default Next.js welcome page.

- [ ] **Step 7: Copy spec and plan docs into the repo**

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp /Users/mikewong/docs/superpowers/specs/2026-03-21-resume-tailor-design.md docs/superpowers/specs/
cp /Users/mikewong/docs/superpowers/plans/2026-03-22-resume-tailor-plan.md docs/superpowers/plans/
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: scaffold Next.js project with TypeScript and Tailwind"
git push -u origin main
```

---

### Task 2: Set Up Supabase Project

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`

**Prerequisites:** Create a Supabase project at https://supabase.com/dashboard. Copy the project URL, anon key, and service role key into `.env.local`.

- [ ] **Step 1: Install Supabase CLI**

```bash
npm install -D supabase
npx supabase init
```

- [ ] **Step 2: Write the database migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enums
CREATE TYPE plan_type AS ENUM ('free', 'credit_pack', 'subscription');
CREATE TYPE location_type AS ENUM ('remote', 'hybrid', 'on-site');
CREATE TYPE scrape_status AS ENUM ('scraped', 'manual', 'failed');
CREATE TYPE generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE application_status AS ENUM ('generated', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn');

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  plan_type plan_type NOT NULL DEFAULT 'free',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resumes
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  raw_text_content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT NOT NULL,
  pay_range_low NUMERIC,
  pay_range_high NUMERIC,
  job_location TEXT,
  location_type location_type,
  scrape_status scrape_status NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generations
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  template_choice TEXT NOT NULL DEFAULT 'modern' CHECK (template_choice IN ('modern', 'classic', 'minimal')),
  status generation_status NOT NULL DEFAULT 'pending',
  tailored_resume_content TEXT,
  cover_letter_content TEXT,
  resume_word_file_path TEXT,
  resume_pdf_file_path TEXT,
  cover_letter_word_file_path TEXT,
  cover_letter_pdf_file_path TEXT,
  callback_token UUID NOT NULL DEFAULT gen_random_uuid(),
  credits_used INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  status application_status NOT NULL DEFAULT 'generated',
  date_applied DATE,
  interview_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (NEW.id, 3, 'initial_free');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER generations_updated_at BEFORE UPDATE ON generations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Atomic credit deduction RPC
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE profiles
  SET credits_remaining = credits_remaining - 1
  WHERE user_id = p_user_id AND credits_remaining > 0
  RETURNING credits_remaining INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (p_user_id, -1, 'generation');

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Credit refund RPC
CREATE OR REPLACE FUNCTION refund_credit(p_user_id UUID, p_reason TEXT DEFAULT 'refund_failed_generation')
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE profiles
  SET credits_remaining = credits_remaining + 1
  WHERE user_id = p_user_id
  RETURNING credits_remaining INTO remaining;

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (p_user_id, 1, p_reason);

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add credits RPC (used by Stripe webhook for purchases/subscriptions)
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_stripe_payment_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE profiles
  SET credits_remaining = credits_remaining + p_amount
  WHERE user_id = p_user_id
  RETURNING credits_remaining INTO remaining;

  INSERT INTO credit_transactions (user_id, amount, reason, stripe_payment_id)
  VALUES (p_user_id, p_amount, p_reason, p_stripe_payment_id);

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Timeout cleanup: enable pg_cron extension in Supabase Dashboard → Database → Extensions first
-- Then run this in SQL Editor:
-- SELECT cron.schedule('cleanup-stuck-generations', '*/2 * * * *', $$
--   WITH stuck AS (
--     UPDATE generations SET status = 'failed', updated_at = NOW()
--     WHERE status = 'processing' AND created_at < NOW() - INTERVAL '10 minutes'
--     RETURNING user_id
--   )
--   SELECT refund_credit(user_id) FROM stuck;
-- $$);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own resumes" ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own resumes" ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own resumes" ON resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own resumes" ON resumes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own jobs" ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own jobs" ON jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own generations" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own generations" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own applications" ON applications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own credit_transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Enable Realtime on generations table (for processing status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE generations;
```

- [ ] **Step 3: Apply migration to Supabase**

Go to your Supabase Dashboard → SQL Editor → paste the contents of `001_initial_schema.sql` and run it. (For MVP, this is simpler than setting up the Supabase CLI remote connection.)

Verify: check the Table Editor in Supabase Dashboard — you should see all 6 tables.

- [ ] **Step 4: Create Supabase Storage bucket**

In Supabase Dashboard → Storage → Create a new bucket called `documents` with:
- Public: OFF (private bucket)
- File size limit: 10MB
- Allowed MIME types: `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Add RLS policy: Users can upload/read their own files. In SQL Editor:

```sql
CREATE POLICY "Users upload own files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY "Users read own files"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND auth.uid()::text = split_part(name, '/', 1));
```

- [ ] **Step 5: Create Supabase client utilities**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components (read-only)
          }
        },
      },
    }
  );
}
```

Create `src/lib/supabase/admin.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 6: Create auth middleware**

Create `middleware.ts` (in the project root, NOT inside `src/`):

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from dashboard
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add Supabase schema, clients, and auth middleware"
```

---

### Task 3: Magic Link Authentication

**Files:**
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/components/auth/magic-link-form.tsx`

**Prerequisites:** In Supabase Dashboard → Authentication → URL Configuration, set:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

- [ ] **Step 1: Create the magic link form component**

Create `src/components/auth/magic-link-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
        <p className="text-gray-600">
          We sent a magic link to <strong>{email}</strong>. Click the link to
          sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Magic Link"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the login page**

Create `src/app/auth/login/page.tsx`:

```tsx
import { MagicLinkForm } from "@/components/auth/magic-link-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Resume Tailor</h1>
        <p className="text-center text-gray-600 mb-8">
          Sign in with your email — no password needed.
        </p>
        <div className="flex justify-center">
          <MagicLinkForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the auth callback handler**

Create `src/app/auth/callback/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
```

- [ ] **Step 4: Test the auth flow manually**

Run `npm run dev`, navigate to `http://localhost:3000/auth/login`, enter your email, check for the magic link email, click it, and verify you're redirected to `/dashboard` (which will 404 for now — that's expected).

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add magic link authentication flow"
```

---

### Task 4: Authenticated Layout and Dashboard Shell

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Create the sidebar navigation component**

Create `src/components/dashboard/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/resumes", label: "Resumes", icon: "📄" },
  { href: "/dashboard/jobs", label: "Job Tracker", icon: "💼" },
  { href: "/dashboard/account", label: "Account", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <h1 className="text-xl font-bold mb-8 px-2">Resume Tailor</h1>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
              pathname === item.href
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleSignOut}
        className="mt-auto px-3 py-2 text-sm text-gray-400 hover:text-white"
      >
        Sign out
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Create the dashboard layout**

Create `src/app/dashboard/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create the dashboard home page (placeholder)**

Create `src/app/dashboard/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Credits Remaining</p>
          <p className="text-3xl font-bold">{profile?.credits_remaining ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Active Applications</p>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Interviews Scheduled</p>
          <p className="text-3xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test manually**

Navigate to `http://localhost:3000/dashboard` after logging in. Verify sidebar appears, credits show 3, sign out works.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add dashboard layout with sidebar navigation"
```

---

## Phase 2: Core Features (Resume Upload, Job Submission, Make.com)

### Task 5: Resume Upload and Text Extraction

**Files:**
- Create: `src/lib/resume-parser.ts`
- Create: `src/app/api/upload-resume/route.ts`
- Create: `src/app/dashboard/resumes/page.tsx`
- Create: `src/components/resumes/upload-zone.tsx`
- Create: `src/components/resumes/resume-list.tsx`
- Create: `src/components/resumes/text-preview.tsx`
- Test: `__tests__/lib/resume-parser.test.ts`

- [ ] **Step 1: Install resume parsing dependencies**

```bash
npm install mammoth pdf-parse
npm install -D @types/pdf-parse
```

- [ ] **Step 2: Write failing test for resume parser**

Create `__tests__/lib/resume-parser.test.ts`:

```typescript
import { extractTextFromBuffer } from "@/lib/resume-parser";
import { readFileSync } from "fs";
import { join } from "path";

describe("extractTextFromBuffer", () => {
  it("throws on unsupported file type", async () => {
    const buffer = Buffer.from("hello");
    await expect(
      extractTextFromBuffer(buffer, "test.txt")
    ).rejects.toThrow("Unsupported file type");
  });

  it("extracts text from a docx buffer", async () => {
    // This test requires a sample .docx file in __tests__/fixtures/
    // For now, test the error path
    const buffer = Buffer.from("not a real docx");
    await expect(
      extractTextFromBuffer(buffer, "test.docx")
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest __tests__/lib/resume-parser.test.ts --no-cache
```

Expected: FAIL — module not found.

Note: You may need to configure Jest first. Install:

```bash
npm install -D jest ts-jest @types/jest
npx ts-jest config:init
```

Update `jest.config.js` to add module name mapping:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

- [ ] **Step 4: Implement the resume parser**

Create `src/lib/resume-parser.ts`:

```typescript
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const extension = fileName.toLowerCase().split(".").pop();

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (extension === "pdf") {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  throw new Error(`Unsupported file type: .${extension}`);
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/lib/resume-parser.test.ts --no-cache
```

Expected: PASS

- [ ] **Step 6: Create the upload API route**

Create `src/app/api/upload-resume/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromBuffer } from "@/lib/resume-parser";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only .docx and .pdf files are supported" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromBuffer(buffer, file.name);

    if (!rawText || rawText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from this file. Try a different format." },
        { status: 422 }
      );
    }

    // Upload file to Supabase Storage
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(filePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Deactivate any currently active resume
    await supabase
      .from("resumes")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Insert resume record
    const { data: resume, error: insertError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        raw_text_content: rawText,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save resume" },
        { status: 500 }
      );
    }

    return NextResponse.json({ resume });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to process file. Try a different format." },
      { status: 422 }
    );
  }
}
```

- [ ] **Step 7: Create the upload zone component**

Create `src/components/resumes/upload-zone.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-resume", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
  }, [router]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    >
      {uploading ? (
        <p className="text-gray-500">Uploading and extracting text...</p>
      ) : (
        <>
          <p className="text-gray-500 mb-2">
            Drag and drop your resume here, or
          </p>
          <label className="cursor-pointer text-blue-600 hover:underline">
            browse files
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 mt-2">
            Supports .docx and .pdf
          </p>
        </>
      )}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 8: Create the resume list and text preview components**

Create `src/components/resumes/resume-list.tsx`:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Resume = {
  id: string;
  file_name: string;
  is_active: boolean;
  created_at: string;
  raw_text_content: string | null;
};

export function ResumeList({
  resumes,
  onPreview,
}: {
  resumes: Resume[];
  onPreview: (resume: Resume) => void;
}) {
  const router = useRouter();

  const setActive = async (resumeId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deactivate all
    await supabase
      .from("resumes")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // Activate selected
    await supabase
      .from("resumes")
      .update({ is_active: true })
      .eq("id", resumeId);

    router.refresh();
  };

  if (resumes.length === 0) {
    return <p className="text-gray-500">No resumes uploaded yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {resumes.map((resume) => (
        <li
          key={resume.id}
          className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-3">
            {resume.is_active && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Active
              </span>
            )}
            <span className="font-medium">{resume.file_name}</span>
            <span className="text-xs text-gray-400">
              {new Date(resume.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPreview(resume)}
              className="text-sm text-blue-600 hover:underline"
            >
              Preview text
            </button>
            {!resume.is_active && (
              <button
                onClick={() => setActive(resume.id)}
                className="text-sm text-gray-600 hover:underline"
              >
                Set as active
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

Create `src/components/resumes/text-preview.tsx`:

```tsx
export function TextPreview({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold">Extracted Resume Text</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create the resumes page**

Create `src/app/dashboard/resumes/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadZone } from "@/components/resumes/upload-zone";
import { ResumeList } from "@/components/resumes/resume-list";
import { TextPreview } from "@/components/resumes/text-preview";

type Resume = {
  id: string;
  file_name: string;
  is_active: boolean;
  created_at: string;
  raw_text_content: string | null;
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);

  const loadResumes = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("resumes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setResumes(data);
  };

  useEffect(() => {
    loadResumes();
  }, []);

  // Re-load when the page regains focus (after router.refresh())
  useEffect(() => {
    const handleFocus = () => loadResumes();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Resumes</h1>
      <div className="mb-8">
        <UploadZone />
      </div>
      <ResumeList resumes={resumes} onPreview={setPreviewResume} />
      {previewResume?.raw_text_content && (
        <TextPreview
          text={previewResume.raw_text_content}
          onClose={() => setPreviewResume(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 10: Test manually**

Navigate to `/dashboard/resumes`, upload a .docx or .pdf resume, verify it appears in the list with "Active" badge, click "Preview text" to verify extraction worked.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: add resume upload with text extraction"
```

---

### Task 6: Job URL Scraping

**Files:**
- Create: `src/lib/scraper.ts`
- Create: `src/app/api/scrape/route.ts`
- Test: `__tests__/lib/scraper.test.ts`

- [ ] **Step 1: Install scraping dependencies**

```bash
npm install cheerio openai
```

- [ ] **Step 2: Write failing test for scraper**

Create `__tests__/lib/scraper.test.ts`:

```typescript
import { extractJobFieldsFromHtml } from "@/lib/scraper";

describe("extractJobFieldsFromHtml", () => {
  it("returns null for empty HTML", async () => {
    const result = await extractJobFieldsFromHtml("");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest __tests__/lib/scraper.test.ts --no-cache
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the scraper**

Create `src/lib/scraper.ts`:

```typescript
import * as cheerio from "cheerio";
import OpenAI from "openai";

export type ScrapedJobFields = {
  company_name: string;
  job_title: string;
  job_description: string;
  pay_range_low: number | null;
  pay_range_high: number | null;
  job_location: string | null;
  location_type: "remote" | "hybrid" | "on-site" | null;
};

export async function fetchAndCleanHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer to reduce noise
    $("script, style, nav, footer, header, iframe, noscript").remove();

    const text = $("body").text().replace(/\s+/g, " ").trim();

    // If very little text content, scraping likely failed
    if (text.length < 100) return null;

    // Limit to ~8000 chars to stay within reasonable token limits
    return text.slice(0, 8000);
  } catch {
    return null;
  }
}

export async function extractJobFieldsFromHtml(
  text: string
): Promise<ScrapedJobFields | null> {
  if (!text || text.length < 100) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract job posting fields from the provided text. Return JSON with these fields:
- company_name (string)
- job_title (string)
- job_description (string, the full job description)
- pay_range_low (number or null)
- pay_range_high (number or null)
- job_location (string or null)
- location_type ("remote", "hybrid", "on-site", or null)

If a field cannot be determined, use null. For job_description, include the full description text.`,
        },
        { role: "user", content: text },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    return JSON.parse(content) as ScrapedJobFields;
  } catch {
    return null;
  }
}

export async function scrapeJobUrl(
  url: string
): Promise<{ fields: ScrapedJobFields | null; rawText: string | null }> {
  const rawText = await fetchAndCleanHtml(url);
  if (!rawText) return { fields: null, rawText: null };

  const fields = await extractJobFieldsFromHtml(rawText);
  return { fields, rawText };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/lib/scraper.test.ts --no-cache
```

Expected: PASS

- [ ] **Step 6: Create the scrape API route**

Create `src/app/api/scrape/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeJobUrl } from "@/lib/scraper";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url); // validate URL format
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { fields, rawText } = await scrapeJobUrl(url);

  if (!fields) {
    return NextResponse.json(
      { error: "Could not extract job details from this URL. Please enter the details manually.", rawText },
      { status: 422 }
    );
  }

  return NextResponse.json({ fields });
}
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add job URL scraping with LLM field extraction"
```

---

### Task 7: New Job Submission Flow

**Files:**
- Create: `src/app/dashboard/jobs/new/page.tsx`
- Create: `src/components/jobs/scrape-input.tsx`
- Create: `src/components/jobs/job-form.tsx`
- Create: `src/components/jobs/template-picker.tsx`

- [ ] **Step 1: Create the scrape input component**

Create `src/components/jobs/scrape-input.tsx`:

```tsx
"use client";

import { useState } from "react";

type ScrapedFields = {
  company_name: string;
  job_title: string;
  job_description: string;
  pay_range_low: number | null;
  pay_range_high: number | null;
  job_location: string | null;
  location_type: "remote" | "hybrid" | "on-site" | null;
};

export function ScrapeInput({
  onScraped,
  onSkip,
}: {
  onScraped: (fields: ScrapedFields, url: string) => void;
  onSkip: () => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    onScraped(data.fields, url);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleScrape} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/job-posting"
          required
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Scraping..." : "Fetch Job Details"}
        </button>
      </form>
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}
      <button
        onClick={onSkip}
        className="text-sm text-gray-500 hover:underline"
      >
        Enter job details manually instead
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the job details form component**

Create `src/components/jobs/job-form.tsx`:

```tsx
"use client";

import { useState } from "react";

export type JobFormData = {
  company_name: string;
  job_title: string;
  job_description: string;
  pay_range_low: string;
  pay_range_high: string;
  job_location: string;
  location_type: "remote" | "hybrid" | "on-site" | "";
};

export function JobForm({
  initialData,
  onSubmit,
}: {
  initialData?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
}) {
  const [form, setForm] = useState<JobFormData>({
    company_name: initialData?.company_name ?? "",
    job_title: initialData?.job_title ?? "",
    job_description: initialData?.job_description ?? "",
    pay_range_low: initialData?.pay_range_low ?? "",
    pay_range_high: initialData?.pay_range_high ?? "",
    job_location: initialData?.job_location ?? "",
    location_type: initialData?.location_type ?? "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Company Name *</label>
          <input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Job Title *</label>
          <input
            name="job_title"
            value={form.job_title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Job Description *</label>
        <textarea
          name="job_description"
          value={form.job_description}
          onChange={handleChange}
          required
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Pay Range Low</label>
          <input
            name="pay_range_low"
            type="number"
            value={form.pay_range_low}
            onChange={handleChange}
            placeholder="e.g. 80000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pay Range High</label>
          <input
            name="pay_range_high"
            type="number"
            value={form.pay_range_high}
            onChange={handleChange}
            placeholder="e.g. 120000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location Type</label>
          <select
            name="location_type"
            value={form.location_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select...</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Job Location</label>
        <input
          name="job_location"
          value={form.job_location}
          onChange={handleChange}
          placeholder="e.g. San Francisco, CA"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <button
        type="submit"
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Continue
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the template picker component**

Create `src/components/jobs/template-picker.tsx`:

```tsx
"use client";

const templates = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean lines, subtle color accents, sans-serif fonts",
    preview: "bg-gradient-to-br from-blue-50 to-white",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional layout, serif headings, timeless style",
    preview: "bg-gradient-to-br from-gray-50 to-white",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Maximum whitespace, typography-focused, no frills",
    preview: "bg-white",
  },
] as const;

export function TemplatePicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`p-4 rounded-lg border-2 text-left transition ${
            selected === t.id
              ? "border-blue-600 ring-2 ring-blue-200"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div
            className={`h-32 rounded mb-3 ${t.preview} border border-gray-100`}
          />
          <h3 className="font-medium">{t.name}</h3>
          <p className="text-xs text-gray-500">{t.description}</p>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create the new job submission page (5-step flow)**

Create `src/app/dashboard/jobs/new/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScrapeInput } from "@/components/jobs/scrape-input";
import { JobForm, type JobFormData } from "@/components/jobs/job-form";
import { TemplatePicker } from "@/components/jobs/template-picker";

type Step = "input" | "details" | "confirm" | "processing" | "results";

export default function NewJobPage() {
  const [step, setStep] = useState<Step>("input");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<"scraped" | "manual" | "failed">("manual");
  const [jobData, setJobData] = useState<JobFormData | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<JobFormData>>({});
  const [template, setTemplate] = useState("modern");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Step 1: URL input
  const handleScraped = (fields: any, url: string) => {
    setSourceUrl(url);
    setScrapeStatus("scraped");
    setInitialFormData({
      company_name: fields.company_name ?? "",
      job_title: fields.job_title ?? "",
      job_description: fields.job_description ?? "",
      pay_range_low: fields.pay_range_low?.toString() ?? "",
      pay_range_high: fields.pay_range_high?.toString() ?? "",
      job_location: fields.job_location ?? "",
      location_type: fields.location_type ?? "",
    });
    setStep("details");
  };

  const handleSkipScrape = () => {
    setScrapeStatus("manual");
    setStep("details");
  };

  // Step 2: Job details form
  const handleJobFormSubmit = (data: JobFormData) => {
    setJobData(data);
    setStep("confirm");
  };

  // Step 3: Confirm and generate
  const handleGenerate = async () => {
    setError(null);
    setStep("processing");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job: { ...jobData, source_url: sourceUrl, scrape_status: scrapeStatus },
        template_choice: template,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStep("confirm");
      return;
    }

    setGenerationId(data.generation_id);
    // Now we wait for the Supabase Realtime subscription
    // to detect when the generation is complete (handled in processing step)
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Add New Job</h1>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {["input", "details", "confirm", "processing", "results"].map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded ${
              ["input", "details", "confirm", "processing", "results"].indexOf(step) >= i
                ? "bg-blue-600"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {step === "input" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Step 1: Job Posting URL</h2>
          <ScrapeInput onScraped={handleScraped} onSkip={handleSkipScrape} />
        </div>
      )}

      {step === "details" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Step 2: Job Details</h2>
          {scrapeStatus === "scraped" && (
            <p className="text-sm text-green-600 mb-4">
              Fields pre-filled from URL. Please review and edit as needed.
            </p>
          )}
          <JobForm initialData={initialFormData} onSubmit={handleJobFormSubmit} />
        </div>
      )}

      {step === "confirm" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Step 3: Confirm & Generate</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <h3 className="font-medium">{jobData?.job_title}</h3>
            <p className="text-gray-600">{jobData?.company_name}</p>
            <p className="text-sm text-gray-500 mt-2">
              {jobData?.job_location} {jobData?.location_type && `(${jobData.location_type})`}
            </p>
          </div>
          <h3 className="font-medium mb-3">Choose a template</h3>
          <TemplatePicker selected={template} onSelect={setTemplate} />
          <button
            onClick={handleGenerate}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Generate (1 credit)
          </button>
        </div>
      )}

      {step === "processing" && (
        <ProcessingStep
          generationId={generationId}
          onComplete={(id) => router.push(`/dashboard/generations/${id}`)}
          onFailed={(err) => { setError(err); setStep("confirm"); }}
        />
      )}
    </div>
  );
}

// Processing step with Supabase Realtime subscription
function ProcessingStep({
  generationId,
  onComplete,
  onFailed,
}: {
  generationId: string | null;
  onComplete: (id: string) => void;
  onFailed: (error: string) => void;
}) {
  const supabase = createClient();

  useEffect(() => {
    if (!generationId) return;

    const channel = supabase
      .channel(`generation-${generationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generations",
          filter: `id=eq.${generationId}`,
        },
        (payload) => {
          const status = payload.new.status;
          if (status === "completed") {
            channel.unsubscribe();
            onComplete(generationId);
          } else if (status === "failed") {
            channel.unsubscribe();
            onFailed("Generation failed. Your credit has been refunded. Please try again.");
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [generationId]);

  return (
    <div className="text-center py-12">
      <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
      <h2 className="text-lg font-medium mb-2">Tailoring your resume...</h2>
      <p className="text-gray-500">
        This usually takes about a minute, but can take longer during busy
        periods.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add job submission flow with scraping and template selection"
```

---

### Task 8: Make.com Integration (Trigger + Callback)

**Files:**
- Create: `src/lib/credits.ts`
- Create: `src/app/api/generate/route.ts`
- Create: `src/app/api/callback/route.ts`
- Test: `__tests__/lib/credits.test.ts`
- Test: `__tests__/api/callback.test.ts`

- [ ] **Step 1: Create the credits helper**

Create `src/lib/credits.ts`:

```typescript
import { SupabaseClient } from "@supabase/supabase-js";

export async function deductCredit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; remaining: number }> {
  const { data, error } = await supabase.rpc("deduct_credit", {
    p_user_id: userId,
  });

  if (error) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: data };
}

export async function refundCredit(
  supabase: SupabaseClient,
  userId: string,
  reason: string = "refund_failed_generation"
): Promise<void> {
  await supabase.rpc("refund_credit", {
    p_user_id: userId,
    p_reason: reason,
  });
}
```

- [ ] **Step 2: Create the generate API route (triggers Make.com)**

Create `src/app/api/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductCredit } from "@/lib/credits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job, template_choice } = await request.json();

  // Validate required fields
  if (!job?.company_name || !job?.job_title || !job?.job_description) {
    return NextResponse.json(
      { error: "Missing required job fields" },
      { status: 400 }
    );
  }

  // Get active resume
  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!resume) {
    return NextResponse.json(
      { error: "No active resume found. Please upload a resume first." },
      { status: 400 }
    );
  }

  // Deduct credit atomically
  const admin = createAdminClient();
  const { success } = await deductCredit(admin, user.id);

  if (!success) {
    return NextResponse.json(
      { error: "Insufficient credits. Please purchase more credits to continue." },
      { status: 402 }
    );
  }

  // Create job record
  const { data: jobRecord, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      source_url: job.source_url ?? null,
      company_name: job.company_name,
      job_title: job.job_title,
      job_description: job.job_description,
      pay_range_low: job.pay_range_low ? parseFloat(job.pay_range_low) : null,
      pay_range_high: job.pay_range_high ? parseFloat(job.pay_range_high) : null,
      job_location: job.job_location || null,
      location_type: job.location_type || null,
      scrape_status: job.scrape_status ?? "manual",
    })
    .select()
    .single();

  if (jobError) {
    // Refund the credit since we failed before Make.com
    await admin.rpc("refund_credit", {
      p_user_id: user.id,
      p_reason: "refund_job_creation_failed",
    });
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500 }
    );
  }

  // Create generation record with callback token
  const { data: generation, error: genError } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      job_id: jobRecord.id,
      resume_id: resume.id,
      template_choice: template_choice ?? "modern",
      status: "pending",
    })
    .select()
    .single();

  if (genError) {
    await admin.rpc("refund_credit", {
      p_user_id: user.id,
      p_reason: "refund_generation_creation_failed",
    });
    return NextResponse.json(
      { error: "Failed to create generation" },
      { status: 500 }
    );
  }

  // Call Make.com webhook
  const callbackBaseUrl = process.env.MAKE_CALLBACK_BASE_URL!;
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL!;

  try {
    const makeResponse = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generation_id: generation.id,
        callback_token: generation.callback_token,
        resume_content: resume.raw_text_content,
        job_description: job.job_description,
        job_title: job.job_title,
        company_name: job.company_name,
        callback_url: `${callbackBaseUrl}?generation_id=${generation.id}&callback_token=${generation.callback_token}`,
      }),
    });

    if (!makeResponse.ok) {
      throw new Error("Make.com webhook failed");
    }

    // Update status to processing
    await supabase
      .from("generations")
      .update({ status: "processing" })
      .eq("id", generation.id);

    return NextResponse.json({ generation_id: generation.id });
  } catch {
    // Refund credit and mark as failed
    await admin.rpc("refund_credit", {
      p_user_id: user.id,
      p_reason: "refund_make_webhook_failed",
    });
    await supabase
      .from("generations")
      .update({ status: "failed" })
      .eq("id", generation.id);

    return NextResponse.json(
      { error: "Failed to start generation. Your credit has been refunded." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create the callback API route (receives Make.com results)**

Create `src/app/api/callback/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDocuments } from "@/lib/document-generator";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get("generation_id");
  const callbackToken = searchParams.get("callback_token");

  if (!generationId || !callbackToken) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validate callback token
  const { data: generation, error } = await admin
    .from("generations")
    .select("*, resumes(*), jobs(*)")
    .eq("id", generationId)
    .eq("callback_token", callbackToken)
    .single();

  if (error || !generation) {
    return NextResponse.json({ error: "Invalid callback" }, { status: 403 });
  }

  if (generation.status !== "processing") {
    return NextResponse.json({ error: "Generation not in processing state" }, { status: 409 });
  }

  const body = await request.json();
  const { tailored_resume_content, cover_letter_content } = body;

  if (!tailored_resume_content || !cover_letter_content) {
    // Mark as failed and refund
    await admin
      .from("generations")
      .update({ status: "failed" })
      .eq("id", generationId);
    await admin.rpc("refund_credit", {
      p_user_id: generation.user_id,
      p_reason: "refund_malformed_callback",
    });
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  try {
    // Store raw content
    await admin
      .from("generations")
      .update({
        tailored_resume_content,
        cover_letter_content,
      })
      .eq("id", generationId);

    // Generate formatted documents
    const docs = await generateDocuments({
      generationId,
      userId: generation.user_id,
      templateChoice: generation.template_choice,
      resumeContent: tailored_resume_content,
      coverLetterContent: cover_letter_content,
      jobTitle: generation.jobs.job_title,
      companyName: generation.jobs.company_name,
    });

    // Upload files to Supabase Storage
    const filePaths: Record<string, string> = {};

    for (const [key, { buffer, contentType }] of Object.entries(docs)) {
      const path = `${generation.user_id}/generations/${generationId}/${key}`;
      await admin.storage.from("documents").upload(path, buffer, { contentType });
      filePaths[key] = path;
    }

    // Update generation with file paths and mark complete
    await admin
      .from("generations")
      .update({
        resume_word_file_path: filePaths["resume.docx"],
        resume_pdf_file_path: filePaths["resume.pdf"],
        cover_letter_word_file_path: filePaths["cover-letter.docx"],
        cover_letter_pdf_file_path: filePaths["cover-letter.pdf"],
        status: "completed",
      })
      .eq("id", generationId);

    // Auto-create application tracker entry
    await admin.from("applications").insert({
      user_id: generation.user_id,
      job_id: generation.job_id,
      generation_id: generationId,
      status: "generated",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    await admin
      .from("generations")
      .update({ status: "failed" })
      .eq("id", generationId);
    await admin.rpc("refund_credit", {
      p_user_id: generation.user_id,
      p_reason: "refund_document_generation_failed",
    });
    return NextResponse.json(
      { error: "Document generation failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add Make.com trigger and callback API routes with credit management"
```

---

## Phase 3: Document Generation

### Task 9: Word and PDF Document Generation

**Files:**
- Create: `src/lib/document-generator.ts`
- Test: `__tests__/lib/document-generator.test.ts`

- [ ] **Step 1: Install document generation dependencies**

```bash
npm install docx pdf-lib
```

- [ ] **Step 2: Write failing test for document generator**

Create `__tests__/lib/document-generator.test.ts`:

```typescript
import { generateDocuments } from "@/lib/document-generator";

describe("generateDocuments", () => {
  it("generates all four document files", async () => {
    const result = await generateDocuments({
      generationId: "test-id",
      userId: "test-user",
      templateChoice: "modern",
      resumeContent: JSON.stringify({
        name: "Jane Doe",
        contact: "jane@example.com | 555-1234",
        summary: "Experienced software engineer",
        experience: [
          {
            title: "Senior Engineer",
            company: "Acme Corp",
            dates: "2020-2024",
            bullets: ["Led team of 5", "Built microservices"],
          },
        ],
        education: [
          {
            degree: "BS Computer Science",
            school: "State University",
            year: "2016",
          },
        ],
        skills: ["TypeScript", "React", "Node.js"],
      }),
      coverLetterContent: JSON.stringify({
        greeting: "Dear Hiring Manager,",
        body: [
          "I am writing to express my interest in the Senior Engineer position at TechCo.",
          "With over 8 years of experience in software development, I believe I am well-suited for this role.",
          "Thank you for considering my application.",
        ],
        signoff: "Sincerely,",
        name: "Jane Doe",
      }),
      jobTitle: "Senior Engineer",
      companyName: "TechCo",
    });

    expect(result["resume.docx"]).toBeDefined();
    expect(result["resume.docx"].buffer).toBeInstanceOf(Buffer);
    expect(result["resume.pdf"]).toBeDefined();
    expect(result["resume.pdf"].buffer).toBeInstanceOf(Buffer);
    expect(result["cover-letter.docx"]).toBeDefined();
    expect(result["cover-letter.pdf"]).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest __tests__/lib/document-generator.test.ts --no-cache
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the document generator**

Create `src/lib/document-generator.ts`:

```typescript
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type TemplateConfig = {
  headingFont: string;
  bodyFontSize: number;
  headingColor: string;
  accentColor: string;
};

const templates: Record<string, TemplateConfig> = {
  modern: {
    headingFont: "Calibri",
    bodyFontSize: 22, // half-points (11pt)
    headingColor: "2563EB",
    accentColor: "3B82F6",
  },
  classic: {
    headingFont: "Times New Roman",
    bodyFontSize: 24, // 12pt
    headingColor: "1F2937",
    accentColor: "4B5563",
  },
  minimal: {
    headingFont: "Arial",
    bodyFontSize: 20, // 10pt
    headingColor: "000000",
    accentColor: "6B7280",
  },
};

type ResumeData = {
  name: string;
  contact: string;
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  skills: string[];
};

type CoverLetterData = {
  greeting: string;
  body: string[];
  signoff: string;
  name: string;
};

type GenerateInput = {
  generationId: string;
  userId: string;
  templateChoice: string;
  resumeContent: string;
  coverLetterContent: string;
  jobTitle: string;
  companyName: string;
};

type DocOutput = {
  buffer: Buffer;
  contentType: string;
};

export async function generateDocuments(
  input: GenerateInput
): Promise<Record<string, DocOutput>> {
  const config = templates[input.templateChoice] ?? templates.modern;

  let resumeData: ResumeData;
  let coverLetterData: CoverLetterData;

  try {
    resumeData = JSON.parse(input.resumeContent);
    coverLetterData = JSON.parse(input.coverLetterContent);
  } catch {
    throw new Error("Failed to parse content from Make.com. Expected JSON format.");
  }

  const resumeDocx = await generateResumeDocx(resumeData, config);
  const resumePdf = await generateResumePdf(resumeData, config);
  const coverLetterDocx = await generateCoverLetterDocx(coverLetterData, config);
  const coverLetterPdf = await generateCoverLetterPdf(coverLetterData, config);

  return {
    "resume.docx": {
      buffer: resumeDocx,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    "resume.pdf": {
      buffer: resumePdf,
      contentType: "application/pdf",
    },
    "cover-letter.docx": {
      buffer: coverLetterDocx,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    "cover-letter.pdf": {
      buffer: coverLetterPdf,
      contentType: "application/pdf",
    },
  };
}

async function generateResumeDocx(
  data: ResumeData,
  config: TemplateConfig
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // Name (Title)
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.name,
          bold: true,
          size: 48,
          font: config.headingFont,
          color: config.headingColor,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Contact
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.contact,
          size: config.bodyFontSize,
          color: config.accentColor,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Summary
  if (data.summary) {
    sections.push(
      new Paragraph({
        text: "Summary",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: data.summary, size: config.bodyFontSize })],
        spacing: { after: 200 },
      })
    );
  }

  // Experience
  sections.push(
    new Paragraph({
      text: "Experience",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  for (const exp of data.experience) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${exp.title} — ${exp.company}`, bold: true, size: config.bodyFontSize }),
          new TextRun({ text: `\t${exp.dates}`, size: config.bodyFontSize, color: config.accentColor }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 150, after: 50 },
      })
    );
    for (const bullet of exp.bullets) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: bullet, size: config.bodyFontSize })],
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
        })
      );
    }
  }

  // Education
  sections.push(
    new Paragraph({
      text: "Education",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  for (const edu of data.education) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${edu.degree} — ${edu.school}`, bold: true, size: config.bodyFontSize }),
          new TextRun({ text: `\t${edu.year}`, size: config.bodyFontSize, color: config.accentColor }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 50, after: 50 },
      })
    );
  }

  // Skills
  sections.push(
    new Paragraph({
      text: "Skills",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: data.skills.join("  •  "), size: config.bodyFontSize }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

async function generateResumePdf(
  data: ResumeData,
  config: TemplateConfig
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const margin = 72; // 1 inch
  let y = height - margin;

  const drawText = (text: string, options: {
    font?: typeof font;
    size?: number;
    color?: { r: number; g: number; b: number };
    x?: number;
    maxWidth?: number;
  } = {}) => {
    const f = options.font ?? font;
    const size = options.size ?? 11;
    const x = options.x ?? margin;

    if (y < margin + 40) {
      page = pdfDoc.addPage([612, 792]);
      y = height - margin;
    }

    page.drawText(text, {
      x,
      y,
      size,
      font: f,
      color: options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0, 0, 0),
      maxWidth: options.maxWidth ?? width - 2 * margin,
    });

    y -= size + 4;
  };

  // Name
  drawText(data.name, { font: boldFont, size: 24 });
  y -= 4;

  // Contact
  drawText(data.contact, { size: 10, color: { r: 0.4, g: 0.4, b: 0.4 } });
  y -= 12;

  // Summary
  if (data.summary) {
    drawText("Summary", { font: boldFont, size: 14 });
    y -= 2;
    drawText(data.summary, { size: 10 });
    y -= 8;
  }

  // Experience
  drawText("Experience", { font: boldFont, size: 14 });
  y -= 2;
  for (const exp of data.experience) {
    drawText(`${exp.title} — ${exp.company}`, { font: boldFont, size: 11 });
    drawText(exp.dates, { size: 9, color: { r: 0.4, g: 0.4, b: 0.4 } });
    for (const bullet of exp.bullets) {
      drawText(`  •  ${bullet}`, { size: 10 });
    }
    y -= 6;
  }

  // Education
  drawText("Education", { font: boldFont, size: 14 });
  y -= 2;
  for (const edu of data.education) {
    drawText(`${edu.degree} — ${edu.school} (${edu.year})`, { size: 10 });
  }
  y -= 8;

  // Skills
  drawText("Skills", { font: boldFont, size: 14 });
  y -= 2;
  drawText(data.skills.join("  •  "), { size: 10 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateCoverLetterDocx(
  data: CoverLetterData,
  config: TemplateConfig
): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];

  // Date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          size: config.bodyFontSize,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Greeting
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: data.greeting, size: config.bodyFontSize })],
      spacing: { after: 200 },
    })
  );

  // Body paragraphs
  for (const para of data.body) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: para, size: config.bodyFontSize })],
        spacing: { after: 200 },
      })
    );
  }

  // Sign-off
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: data.signoff, size: config.bodyFontSize })],
      spacing: { before: 200, after: 100 },
    })
  );

  // Name
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: data.name, bold: true, size: config.bodyFontSize }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

async function generateCoverLetterPdf(
  data: CoverLetterData,
  config: TemplateConfig
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 72;
  let y = height - margin;

  const drawText = (text: string, f = font, size = 11) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: f,
      maxWidth: width - 2 * margin,
    });
    y -= size + 6;
  };

  // Date
  drawText(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
  y -= 20;

  // Greeting
  drawText(data.greeting);
  y -= 8;

  // Body
  for (const para of data.body) {
    drawText(para);
    y -= 8;
  }

  y -= 12;

  // Sign-off
  drawText(data.signoff);
  y -= 4;
  drawText(data.name, boldFont);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/lib/document-generator.test.ts --no-cache
```

Expected: PASS — all four documents are generated as Buffer objects.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Word and PDF document generation with three templates"
```

---

## Phase 4: Results, Job Tracker, Dashboard

### Task 10: Generation Results Page

**Files:**
- Create: `src/app/dashboard/generations/[id]/page.tsx`
- Create: `src/components/generations/result-preview.tsx`
- Create: `src/components/generations/download-buttons.tsx`

- [ ] **Step 1: Create the download buttons component**

Create `src/components/generations/download-buttons.tsx`:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export function DownloadButtons({
  filePaths,
}: {
  filePaths: {
    resume_word: string | null;
    resume_pdf: string | null;
    cover_letter_word: string | null;
    cover_letter_pdf: string | null;
  };
}) {
  const handleDownload = async (path: string, fileName: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .download(path);

    if (error || !data) return;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">Resume</h3>
        <div className="flex gap-2">
          {filePaths.resume_word && (
            <button
              onClick={() => handleDownload(filePaths.resume_word!, "resume.docx")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Download Word
            </button>
          )}
          {filePaths.resume_pdf && (
            <button
              onClick={() => handleDownload(filePaths.resume_pdf!, "resume.pdf")}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-medium mb-2">Cover Letter</h3>
        <div className="flex gap-2">
          {filePaths.cover_letter_word && (
            <button
              onClick={() => handleDownload(filePaths.cover_letter_word!, "cover-letter.docx")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Download Word
            </button>
          )}
          {filePaths.cover_letter_pdf && (
            <button
              onClick={() => handleDownload(filePaths.cover_letter_pdf!, "cover-letter.pdf")}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the generation results page**

Create `src/app/dashboard/generations/[id]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DownloadButtons } from "@/components/generations/download-buttons";
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
    .select("*, jobs(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!generation) notFound();

  return (
    <div className="max-w-3xl">
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

          {/* Preview sections */}
          {generation.tailored_resume_content && (
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-2">Resume Preview</h2>
              <pre className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap">
                {generation.tailored_resume_content}
              </pre>
            </div>
          )}

          {generation.cover_letter_content && (
            <div className="mt-6">
              <h2 className="text-lg font-medium mb-2">Cover Letter Preview</h2>
              <pre className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap">
                {generation.cover_letter_content}
              </pre>
            </div>
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

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add generation results page with download buttons"
```

---

### Task 11: Job Tracker

**Files:**
- Create: `src/app/dashboard/jobs/page.tsx`
- Create: `src/components/jobs/job-tracker-table.tsx`

- [ ] **Step 1: Create the job tracker table component**

Create `src/components/jobs/job-tracker-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Application = {
  id: string;
  status: string;
  date_applied: string | null;
  interview_date: string | null;
  notes: string | null;
  created_at: string;
  jobs: {
    company_name: string;
    job_title: string;
    job_location: string | null;
    location_type: string | null;
  };
  generation_id: string | null;
};

const statusOptions = [
  "generated",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
];

export function JobTrackerTable({
  applications,
}: {
  applications: Application[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const router = useRouter();

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  const updateStatus = async (appId: string, newStatus: string) => {
    const supabase = createClient();
    await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", appId);
    router.refresh();
  };

  const updateField = async (
    appId: string,
    field: string,
    value: string | null
  ) => {
    const supabase = createClient();
    await supabase
      .from("applications")
      .update({ [field]: value })
      .eq("id", appId);
    router.refresh();
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded text-sm ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          All
        </button>
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === s ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No applications yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Company</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Date Applied</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <>
                  <tr
                    key={app.id}
                    onClick={() =>
                      setExpandedId(expandedId === app.id ? null : app.id)
                    }
                    className="border-b cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{app.jobs.company_name}</td>
                    <td className="px-4 py-3">{app.jobs.job_title}</td>
                    <td className="px-4 py-3">
                      <select
                        value={app.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateStatus(app.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm border rounded px-2 py-1"
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {app.date_applied ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedId === app.id && (
                    <tr key={`${app.id}-detail`} className="border-b bg-gray-50">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Date Applied
                            </label>
                            <input
                              type="date"
                              defaultValue={app.date_applied ?? ""}
                              onChange={(e) =>
                                updateField(app.id, "date_applied", e.target.value || null)
                              }
                              className="text-sm border rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Interview Date
                            </label>
                            <input
                              type="date"
                              defaultValue={app.interview_date ?? ""}
                              onChange={(e) =>
                                updateField(app.id, "interview_date", e.target.value || null)
                              }
                              className="text-sm border rounded px-2 py-1"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1">
                              Notes
                            </label>
                            <textarea
                              defaultValue={app.notes ?? ""}
                              onBlur={(e) =>
                                updateField(app.id, "notes", e.target.value || null)
                              }
                              rows={3}
                              className="w-full text-sm border rounded px-2 py-1"
                            />
                          </div>
                          {app.generation_id && (
                            <div>
                              <Link
                                href={`/dashboard/generations/${app.generation_id}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View / Download Documents
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the job tracker page**

Create `src/app/dashboard/jobs/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobTrackerTable } from "@/components/jobs/job-tracker-table";
import { AddManualJobButton } from "@/components/jobs/add-manual-job-button";
import Link from "next/link";

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: applications } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Tracker</h1>
        <div className="flex gap-2">
          <AddManualJobButton />
          <Link
            href="/dashboard/jobs/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            + New Job (Generate)
          </Link>
        </div>
      </div>
      <JobTrackerTable applications={applications ?? []} />
    </div>
  );
}
```

Also create `src/components/jobs/add-manual-job-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AddManualJobButton() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create job record
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        company_name: form.get("company_name") as string,
        job_title: form.get("job_title") as string,
        job_description: form.get("job_description") as string || "N/A",
        source_url: form.get("source_url") as string || null,
        location_type: form.get("location_type") as string || null,
        scrape_status: "manual",
      })
      .select()
      .single();

    if (job) {
      // Create application record (no generation)
      await supabase.from("applications").insert({
        user_id: user.id,
        job_id: job.id,
        generation_id: null,
        status: "applied",
        date_applied: form.get("date_applied") as string || null,
      });
    }

    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
      >
        + Track a Job
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="font-bold text-lg mb-4">Track a Job</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="company_name" placeholder="Company Name *" required
            className="w-full px-3 py-2 border rounded-md text-sm" />
          <input name="job_title" placeholder="Job Title *" required
            className="w-full px-3 py-2 border rounded-md text-sm" />
          <input name="source_url" placeholder="Job URL (optional)"
            className="w-full px-3 py-2 border rounded-md text-sm" />
          <select name="location_type" className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Location Type...</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>
          <div>
            <label className="block text-xs font-medium mb-1">Date Applied</label>
            <input name="date_applied" type="date"
              className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Add to Tracker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add job tracker with status management and expandable rows"
```

---

### Task 12: Wire Up Dashboard with Real Data

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Update the dashboard to show real counts and recent generations**

Update `src/app/dashboard/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { count: activeApps } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["applied", "interviewing"]);

  const { count: interviews } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "interviewing");

  const { data: recentGenerations } = await supabase
    .from("generations")
    .select("*, jobs(company_name, job_title)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Credits Remaining</p>
          <p className="text-3xl font-bold">{profile?.credits_remaining ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Active Applications</p>
          <p className="text-3xl font-bold">{activeApps ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Interviewing</p>
          <p className="text-3xl font-bold">{interviews ?? 0}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Recent Generations</h2>
        <Link
          href="/dashboard/jobs/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          + New Job
        </Link>
      </div>

      {recentGenerations && recentGenerations.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm">
          {recentGenerations.map((gen) => (
            <Link
              key={gen.id}
              href={`/dashboard/generations/${gen.id}`}
              className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{gen.jobs.job_title}</p>
                <p className="text-sm text-gray-500">{gen.jobs.company_name}</p>
              </div>
              <span className="text-sm text-gray-400">
                {new Date(gen.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          <p>No generations yet.</p>
          <Link href="/dashboard/jobs/new" className="text-blue-600 hover:underline text-sm">
            Create your first tailored resume
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: wire dashboard with real data from Supabase"
```

---

## Phase 5: Payments

### Task 13: Stripe Integration

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/app/dashboard/account/page.tsx`

**Prerequisites:**
1. Create a Stripe account at https://stripe.com
2. In Stripe Dashboard → Products, create two products:
   - "10 Credit Pack" with a one-time price (e.g., $9.99)
   - "Monthly Plan (15 credits)" with a recurring monthly price (e.g., $14.99)
3. Copy the Price IDs (e.g., `price_xxx`) into `.env.local`
4. Copy Stripe keys into `.env.local`

Add to `.env.local`:
```
STRIPE_CREDIT_PACK_PRICE_ID=price_xxx
STRIPE_MONTHLY_PRICE_ID=price_xxx
```

- [ ] **Step 1: Install Stripe**

```bash
npm install stripe
```

- [ ] **Step 2: Create Stripe helper**

Create `src/lib/stripe.ts`:

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

- [ ] **Step 3: Create the account/billing page**

Create `src/app/dashboard/account/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

async function createCheckoutSession(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const priceId = formData.get("priceId") as string;
  const mode = formData.get("mode") as "payment" | "subscription";
  const headerList = await headers();
  const origin = headerList.get("origin") || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/account?success=true`,
    cancel_url: `${origin}/dashboard/account?canceled=true`,
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { user_id: user.id },
  });

  redirect(session.url!);
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Account & Billing</h1>

      {/* Credit Balance */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <p className="text-sm text-gray-500">Credit Balance</p>
        <p className="text-4xl font-bold">{profile?.credits_remaining ?? 0}</p>
        <p className="text-sm text-gray-400 mt-1">
          Plan: {profile?.plan_type ?? "free"}
        </p>
      </div>

      {/* Purchase Options */}
      <h2 className="text-lg font-medium mb-3">Purchase Credits</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <form action={createCheckoutSession}>
          <input type="hidden" name="priceId" value={process.env.STRIPE_CREDIT_PACK_PRICE_ID} />
          <input type="hidden" name="mode" value="payment" />
          <button
            type="submit"
            className="w-full bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200 hover:border-blue-500 text-left"
          >
            <h3 className="font-bold text-lg">10 Credits</h3>
            <p className="text-gray-500 text-sm">One-time purchase</p>
            <p className="text-2xl font-bold mt-2">$9.99</p>
          </button>
        </form>
        <form action={createCheckoutSession}>
          <input type="hidden" name="priceId" value={process.env.STRIPE_MONTHLY_PRICE_ID} />
          <input type="hidden" name="mode" value="subscription" />
          <button
            type="submit"
            className="w-full bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200 hover:border-blue-500 text-left"
          >
            <h3 className="font-bold text-lg">15 Credits/Month</h3>
            <p className="text-gray-500 text-sm">Monthly subscription</p>
            <p className="text-2xl font-bold mt-2">$14.99/mo</p>
          </button>
        </form>
      </div>

      {/* Transaction History */}
      <h2 className="text-lg font-medium mb-3">Transaction History</h2>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Reason</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Credits</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((t) => (
              <tr key={t.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 text-sm">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm capitalize">
                  {t.reason.replace(/_/g, " ")}
                </td>
                <td
                  className={`px-4 py-3 text-sm text-right font-medium ${
                    t.amount > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the Stripe webhook handler**

Create `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;

      if (!userId) break;

      if (session.mode === "payment") {
        // One-time credit pack purchase: add 10 credits atomically
        await admin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: 10,
          p_reason: "purchase_credit_pack",
          p_stripe_payment_id: session.payment_intent as string,
        });

        await admin
          .from("profiles")
          .update({ plan_type: "credit_pack" })
          .eq("user_id", userId);
      }

      if (session.mode === "subscription") {
        // First subscription payment: add 15 credits atomically
        await admin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: 15,
          p_reason: "subscription_payment",
          p_stripe_payment_id: session.subscription as string,
        });

        await admin
          .from("profiles")
          .update({ plan_type: "subscription" })
          .eq("user_id", userId);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      // Recurring subscription renewal
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason !== "subscription_cycle") break;

      // Find user by subscription ID
      const subscriptionId = invoice.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.user_id;

      if (!userId) break;

      await admin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: 15,
        p_reason: "subscription_renewal",
        p_stripe_payment_id: invoice.id,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add Stripe checkout and webhook for credit purchases and subscriptions"
```

---

## Phase 6: Landing Page and Polish

### Task 14: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the landing page**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold">Resume Tailor</h1>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-4 max-w-4xl mx-auto">
        <h2 className="text-5xl font-bold mb-6">
          Tailored resumes in minutes, not hours
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Upload your resume, paste a job posting, and get a professionally
          tailored resume and cover letter — formatted and ready to send.
        </p>
        <Link
          href="/auth/login"
          className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700"
        >
          Start Free — 3 Credits Included
        </Link>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            How it works
          </h3>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                1
              </div>
              <h4 className="font-bold mb-2">Upload your resume</h4>
              <p className="text-gray-600 text-sm">
                Upload your baseline resume as a Word doc or PDF.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                2
              </div>
              <h4 className="font-bold mb-2">Add a job posting</h4>
              <p className="text-gray-600 text-sm">
                Paste a URL or enter the job details manually.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                3
              </div>
              <h4 className="font-bold mb-2">Download your docs</h4>
              <p className="text-gray-600 text-sm">
                Get a tailored resume and cover letter as Word and PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 max-w-4xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">Pricing</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="border rounded-lg p-6 text-center">
            <h4 className="font-bold text-lg mb-2">Free</h4>
            <p className="text-3xl font-bold mb-4">$0</p>
            <p className="text-gray-600 text-sm mb-4">3 credits to start</p>
            <Link
              href="/auth/login"
              className="block w-full py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
            >
              Get Started
            </Link>
          </div>
          <div className="border-2 border-blue-600 rounded-lg p-6 text-center">
            <h4 className="font-bold text-lg mb-2">Credit Pack</h4>
            <p className="text-3xl font-bold mb-4">$9.99</p>
            <p className="text-gray-600 text-sm mb-4">10 credits, one-time</p>
            <Link
              href="/auth/login"
              className="block w-full py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Buy Credits
            </Link>
          </div>
          <div className="border rounded-lg p-6 text-center">
            <h4 className="font-bold text-lg mb-2">Monthly</h4>
            <p className="text-3xl font-bold mb-4">$14.99</p>
            <p className="text-gray-600 text-sm mb-4">15 credits/month</p>
            <Link
              href="/auth/login"
              className="block w-full py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
            >
              Subscribe
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 border-t">
        Resume Tailor &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Test manually**

Navigate to `http://localhost:3000` — verify the landing page renders with hero, how-it-works, and pricing sections. Click "Get Started" to verify it navigates to login.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add landing page with hero, how-it-works, and pricing"
```

---

### Task 15: Make.com Workflow Adjustments

This task is done in Make.com, not in code.

- [ ] **Step 1: Open your existing Make.com scenario**

- [ ] **Step 2: Replace the Google Drive trigger with a Webhooks module**

- Add a "Custom webhook" trigger as the first module
- Set it to receive JSON with these fields: `generation_id`, `callback_token`, `resume_content`, `job_description`, `job_title`, `company_name`, `callback_url`
- Copy the webhook URL and add it to your `.env.local` as `MAKE_WEBHOOK_URL`

- [ ] **Step 3: Update LLM prompt to return structured JSON**

Update your GPT-4o module prompt to return the tailored resume as JSON:

```
Return the tailored resume as a JSON object with this structure:
{
  "name": "Full Name",
  "contact": "email | phone | location",
  "summary": "Professional summary paragraph",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "dates": "Start - End",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "School Name",
      "year": "Year"
    }
  ],
  "skills": ["Skill 1", "Skill 2"]
}
```

Similarly for the cover letter module:

```
Return the cover letter as a JSON object:
{
  "greeting": "Dear Hiring Manager,",
  "body": ["Paragraph 1", "Paragraph 2", "Paragraph 3"],
  "signoff": "Sincerely,",
  "name": "Full Name"
}
```

- [ ] **Step 4: Replace Google Docs output with an HTTP module**

- Add an HTTP "Make a request" module at the end
- Method: POST
- URL: Use the `callback_url` from the webhook payload
- Body: JSON with `generation_id`, `tailored_resume_content`, `cover_letter_content`
- Headers: `Content-Type: application/json`

- [ ] **Step 5: Test the Make.com webhook**

Use Make.com's "Run once" feature and send a test payload to the webhook URL to verify the flow works end-to-end.

---

### Task 16: Deploy to Vercel

- [ ] **Step 1: Push all code to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Connect to Vercel**

Go to https://vercel.com/new, import the `resume-tailor` GitHub repo.

- [ ] **Step 3: Add environment variables in Vercel**

In Vercel project settings → Environment Variables, add all variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAKE_WEBHOOK_URL`
- `MAKE_CALLBACK_BASE_URL` (update to your Vercel URL: `https://your-app.vercel.app/api/callback`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_CREDIT_PACK_PRICE_ID`
- `STRIPE_MONTHLY_PRICE_ID`
- `OPENAI_API_KEY`

- [ ] **Step 4: Update Supabase redirect URLs**

In Supabase Dashboard → Authentication → URL Configuration:
- Add your Vercel URL to Redirect URLs: `https://your-app.vercel.app/auth/callback`
- Update Site URL to your Vercel URL

- [ ] **Step 5: Set up Stripe webhook for production**

In Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://your-app.vercel.app/api/webhooks/stripe`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`
- Copy the webhook signing secret to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

- [ ] **Step 6: Deploy and verify**

Vercel auto-deploys on push. Verify:
1. Landing page loads
2. Magic link login works
3. Resume upload works
4. Full generation flow works end-to-end

- [ ] **Step 7: Commit any deployment fixes**

```bash
git add .
git commit -m "chore: deployment configuration and fixes"
git push
```

---

### Task 17: Add Credits for Testers

- [ ] **Step 1: Have your 4 testers sign up**

Send them the Vercel URL. They sign up via magic link.

- [ ] **Step 2: Add credits via Supabase Dashboard**

For each tester, in Supabase Dashboard → Table Editor → `profiles`:
- Find their row and update `credits_remaining` to a generous number (e.g., 20)

Also insert a `credit_transactions` row for audit:
- `user_id`: their user ID
- `amount`: 17 (20 minus the 3 they got on signup)
- `reason`: "tester_credits"

- [ ] **Step 3: Notify testers and collect feedback**

Share a feedback channel (group chat, Google Doc, etc.) and ask them to test:
- Uploading different resume formats (.docx, .pdf)
- Scraping various job URLs
- Manual job entry
- Downloading generated documents
- Using the job tracker
- General UX feedback
