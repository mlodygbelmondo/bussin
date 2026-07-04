-- Publish dialog metadata: YouTube's made-for-kids declaration per upload,
-- and workspace-level title/description templates that prefill the dialog
-- ({title} placeholder expands to the track title).
alter table public.youtube_uploads
  add column made_for_kids boolean not null default false;

alter table public.workspace_settings
  add column youtube_title_template text,
  add column youtube_description_template text;
