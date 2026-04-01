-- Add terms acceptance timestamp column
ALTER TABLE profiles
  ADD COLUMN terms_accepted_at TIMESTAMPTZ NULL;

-- Grandfather all existing users: they have implicitly accepted
UPDATE profiles
  SET terms_accepted_at = NOW()
  WHERE terms_accepted_at IS NULL;
