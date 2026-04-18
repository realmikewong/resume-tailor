-- supabase/migrations/007_roadmap.sql

-- Status enum
CREATE TYPE roadmap_status AS ENUM ('backlog', 'planned', 'in_progress', 'complete');

-- Items
CREATE TABLE roadmap_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      roadmap_status NOT NULL DEFAULT 'backlog',
  vote_count  INTEGER NOT NULL DEFAULT 0,
  shipped_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes (composite PK = one vote per user per item)
CREATE TABLE roadmap_votes (
  roadmap_item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (roadmap_item_id, user_id)
);

CREATE INDEX idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX idx_roadmap_votes_user   ON roadmap_votes(user_id);

-- Keep vote_count in sync. SECURITY DEFINER with a pinned search_path so RLS
-- can't block the count update and search_path can't be hijacked.
CREATE OR REPLACE FUNCTION update_roadmap_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE roadmap_items SET vote_count = vote_count + 1 WHERE id = NEW.roadmap_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE roadmap_items SET vote_count = vote_count - 1 WHERE id = OLD.roadmap_item_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER roadmap_vote_count_trigger
AFTER INSERT OR DELETE ON roadmap_votes
FOR EACH ROW EXECUTE FUNCTION update_roadmap_vote_count();

-- Updated-at trigger for items
CREATE OR REPLACE FUNCTION roadmap_items_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER roadmap_items_updated_at
BEFORE UPDATE ON roadmap_items
FOR EACH ROW EXECUTE FUNCTION roadmap_items_set_updated_at();

-- RLS
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_items public read"
  ON roadmap_items FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies on roadmap_items -- admin mutations use
-- the service-role client which bypasses RLS.

CREATE POLICY "roadmap_votes read own"
  ON roadmap_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "roadmap_votes insert own"
  ON roadmap_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "roadmap_votes delete own"
  ON roadmap_votes FOR DELETE
  USING (auth.uid() = user_id);

-- No UPDATE policy on roadmap_votes -- votes are toggled via delete + insert,
-- never updated in place. Leaving UPDATE uncovered by any policy means RLS
-- denies it by default, which is the safe behavior.
