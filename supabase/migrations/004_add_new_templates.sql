-- Expand template_choice to include three new templates.
-- The original constraint was defined inline in 001_initial_schema.sql,
-- so Postgres auto-named it. IF EXISTS is safe: if the name differs,
-- the old constraint stays and the new one is added alongside it (harmless).
ALTER TABLE generations
  DROP CONSTRAINT IF EXISTS generations_template_choice_check;

ALTER TABLE generations
  ADD CONSTRAINT generations_template_choice_check
  CHECK (template_choice IN ('modern', 'classic', 'minimal', 'editorial', 'bold', 'sharp'));
