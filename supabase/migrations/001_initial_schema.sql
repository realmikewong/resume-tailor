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
