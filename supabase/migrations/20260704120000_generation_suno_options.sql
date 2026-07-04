-- Per-request Suno generation options (model, style weight, weirdness,
-- optional lyrics). Stored as jsonb so new knobs don't need migrations;
-- the shape is validated by sunoOptionsSchema in the generation validator.
alter table public.generation_requests
  add column suno_options jsonb not null default '{}'::jsonb;
