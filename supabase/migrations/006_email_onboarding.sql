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
