create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  default_youtube_channel_id uuid,
  default_image_asset_id uuid,
  default_privacy_status public.youtube_privacy_status not null default 'private',
  timezone text not null default 'America/Los_Angeles',
  default_license text not null default 'Standard License',
  auto_normalize_audio boolean not null default true,
  extract_stems_on_upload boolean not null default false,
  default_storage_location text not null default 'library',
  default_genre text not null default 'Synthwave',
  default_mood text not null default 'Night Drive',
  default_key text not null default 'auto',
  default_bpm int not null default 120,
  default_format text not null default 'MP3 320kbps',
  notify_product_updates boolean not null default true,
  notify_generation_completions boolean not null default true,
  notify_billing_payments boolean not null default true,
  notify_marketing_emails boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, default_youtube_channel_id)
    references public.youtube_channels(workspace_id, id)
    on delete set null (default_youtube_channel_id),
  foreign key (workspace_id, default_image_asset_id)
    references public.image_assets(workspace_id, id)
    on delete set null (default_image_asset_id),
  constraint workspace_settings_default_bpm_check check (
    default_bpm between 40 and 240
  )
);

alter table public.workspace_settings enable row level security;

create trigger workspace_settings_touch_updated_at
before update on public.workspace_settings
for each row execute function public.touch_updated_at();

create policy "members read workspace settings"
on public.workspace_settings for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create workspace settings"
on public.workspace_settings for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update workspace settings"
on public.workspace_settings for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete workspace settings"
on public.workspace_settings for delete
to authenticated
using (public.can_manage_workspace(workspace_id));
