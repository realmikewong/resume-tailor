-- Add subscription columns to profiles
ALTER TABLE profiles
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN subscription_tier TEXT CHECK (subscription_tier IN ('pro', 'ultimate')),
  ADD COLUMN subscription_period_end TIMESTAMPTZ;

-- Update free tier default from 3 to 10 credits
ALTER TABLE profiles ALTER COLUMN credits_remaining SET DEFAULT 10;

-- Update handle_new_user trigger to give 10 credits
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO credit_transactions (user_id, amount, reason)
  VALUES (NEW.id, 10, 'initial_free');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit reset RPC (sets credits to exact amount, no rollover)
CREATE OR REPLACE FUNCTION reset_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE profiles
  SET credits_remaining = p_amount
  WHERE user_id = p_user_id
  RETURNING credits_remaining INTO remaining;

  INSERT INTO credit_transactions (user_id, amount, reason, stripe_payment_id)
  VALUES (p_user_id, p_amount, p_reason, p_stripe_payment_id);

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
