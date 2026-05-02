create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgmq;
create extension if not exists pg_cron;

create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.asset_source as enum (
  'uploaded',
  'fallback',
  'generated_later'
);
create type public.publish_mode as enum (
  'draft',
  'publish_now',
  'schedule_later'
);
create type public.youtube_privacy_status as enum (
  'private',
  'unlisted',
  'public'
);

create table public.profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'trial',
  status text not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id),
  unique (workspace_id, id),
  unique (stripe_customer_id),
  unique (stripe_subscription_id),
  constraint subscriptions_status_check check (
    status in (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused'
    )
  )
);

create table public.usage_counters (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  generated_tracks_count int not null default 0,
  uploaded_videos_count int not null default 0,
  connected_channels_count int not null default 0,
  scheduled_uploads_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_start, period_end),
  unique (workspace_id, id),
  constraint usage_counters_period_check check (period_end > period_start),
  constraint usage_counters_nonnegative_check check (
    generated_tracks_count >= 0
    and uploaded_videos_count >= 0
    and connected_channels_count >= 0
    and scheduled_uploads_count >= 0
  )
);

create table public.suno_connections (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text,
  encrypted_cookie text,
  encrypted_api_url text,
  status text not null default 'unknown',
  credits_left int,
  monthly_limit int,
  monthly_usage int,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  constraint suno_connections_status_check check (
    status in ('unknown', 'connected', 'disconnected', 'error')
  ),
  constraint suno_connections_usage_check check (
    (credits_left is null or credits_left >= 0)
    and (monthly_limit is null or monthly_limit >= 0)
    and (monthly_usage is null or monthly_usage >= 0)
  )
);

create table public.youtube_connections (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_account_email text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  constraint youtube_connections_status_check check (
    status in ('connected', 'disconnected', 'expired', 'error')
  )
);

create table public.youtube_channels (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  youtube_connection_id uuid,
  youtube_channel_id text not null,
  title text not null,
  handle text,
  thumbnail_url text,
  is_default boolean not null default false,
  status text not null default 'connected',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, youtube_channel_id),
  foreign key (workspace_id, youtube_connection_id)
    references public.youtube_connections(workspace_id, id)
    on delete cascade,
  constraint youtube_channels_status_check check (
    status in ('connected', 'disconnected', 'error')
  )
);

create table public.image_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  storage_path text not null,
  public_url text,
  file_name text,
  mime_type text,
  width int,
  height int,
  source public.asset_source not null default 'uploaded',
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, storage_path),
  constraint image_assets_dimensions_check check (
    (width is null or width > 0)
    and (height is null or height > 0)
  )
);

create table public.generation_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  style text not null,
  mood text not null,
  duration_seconds int not null,
  track_count int not null,
  target_youtube_channel_id uuid,
  image_asset_id uuid,
  publish_mode public.publish_mode not null default 'draft',
  scheduled_at timestamptz,
  status text not null default 'queued',
  failure_reason text,
  prompt_summary text,
  final_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, target_youtube_channel_id)
    references public.youtube_channels(workspace_id, id)
    on delete restrict,
  foreign key (workspace_id, image_asset_id)
    references public.image_assets(workspace_id, id)
    on delete restrict,
  constraint generation_requests_duration_check check (duration_seconds > 0),
  constraint generation_requests_track_count_check check (track_count > 0),
  constraint generation_requests_status_check check (
    status in ('draft', 'queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  constraint generation_requests_schedule_check check (
    publish_mode <> 'schedule_later'
    or scheduled_at is not null
  )
);

create table public.tracks (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  generation_request_id uuid,
  suno_track_id text,
  title text,
  description text,
  tags text[],
  style text,
  mood text,
  duration_seconds int,
  audio_storage_path text,
  source_audio_url text,
  image_asset_id uuid,
  status text not null default 'draft',
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, generation_request_id)
    references public.generation_requests(workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, image_asset_id)
    references public.image_assets(workspace_id, id)
    on delete restrict,
  constraint tracks_duration_check check (
    duration_seconds is null
    or duration_seconds > 0
  ),
  constraint tracks_status_check check (
    status in (
      'draft',
      'generating',
      'polling',
      'preview_ready',
      'ready',
      'approved',
      'rendering',
      'rendered',
      'uploaded',
      'failed',
      'rejected'
    )
  )
);

create table public.video_renders (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  track_id uuid,
  status text not null default 'queued',
  video_storage_path text,
  failure_reason text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, track_id)
    references public.tracks(workspace_id, id)
    on delete cascade,
  constraint video_renders_status_check check (
    status in ('queued', 'running', 'rendered', 'completed', 'failed', 'cancelled')
  ),
  constraint video_renders_finished_after_started_check check (
    started_at is null
    or finished_at is null
    or finished_at >= started_at
  )
);

create table public.youtube_uploads (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  track_id uuid,
  video_render_id uuid,
  youtube_channel_id uuid,
  youtube_video_id text,
  title text not null,
  description text,
  tags text[],
  privacy_status public.youtube_privacy_status not null default 'private',
  scheduled_at timestamptz,
  status text not null default 'draft',
  failure_reason text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, track_id)
    references public.tracks(workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, video_render_id)
    references public.video_renders(workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, youtube_channel_id)
    references public.youtube_channels(workspace_id, id)
    on delete restrict,
  constraint youtube_uploads_status_check check (
    status in (
      'draft',
      'scheduled',
      'uploading',
      'uploaded',
      'failed',
      'cancelled'
    )
  ),
  constraint youtube_uploads_schedule_check check (
    status <> 'scheduled'
    or scheduled_at is not null
  )
);

create table public.prompt_history (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  generation_request_id uuid,
  style text not null,
  mood text not null,
  duration_seconds int,
  track_count int,
  final_prompt text,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, generation_request_id)
    references public.generation_requests(workspace_id, id)
    on delete cascade,
  constraint prompt_history_duration_check check (
    duration_seconds is null
    or duration_seconds > 0
  ),
  constraint prompt_history_track_count_check check (
    track_count is null
    or track_count > 0
  )
);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_workspace_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_user_id <> old.owner_user_id then
    raise exception 'workspace owner_user_id cannot be changed';
  end if;

  return new;
end;
$$;

create or replace function public.create_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = 'owner';

  return new;
end;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.workspace_role_for_current_user(
  target_workspace_id uuid
)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members as wm
  where wm.workspace_id = target_workspace_id
    and wm.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.can_manage_workspace(
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspaces as w
    where w.id = target_workspace_id
      and w.owner_user_id = (select auth.uid())
  )
  or public.workspace_role_for_current_user(target_workspace_id) in ('owner', 'admin');
$$;

create or replace function public.storage_workspace_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first_folder text;
begin
  first_folder := split_part(object_name, '/', 1);

  if first_folder is null or first_folder = '' then
    return null;
  end if;

  return first_folder::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

do $$
begin
  perform pgmq.create('generation-jobs');
exception
  when duplicate_table or unique_violation then
    null;
end;
$$;

do $$
begin
  perform pgmq.create('suno-polling-jobs');
exception
  when duplicate_table or unique_violation then
    null;
end;
$$;

do $$
begin
  perform pgmq.create('render-jobs');
exception
  when duplicate_table or unique_violation then
    null;
end;
$$;

do $$
begin
  perform pgmq.create('youtube-upload-jobs');
exception
  when duplicate_table or unique_violation then
    null;
end;
$$;

do $$
begin
  perform pgmq.create('scheduled-publish-jobs');
exception
  when duplicate_table or unique_violation then
    null;
end;
$$;

do $$
begin
  perform pgmq.create('maintenance-jobs');
exception
  when duplicate_table or unique_violation then
    null;
end;
$$;

create or replace function public.worker_queue_send(
  queue_name text,
  message jsonb,
  delay_seconds integer default 0
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id bigint;
begin
  select send
  into message_id
  from pgmq.send(queue_name, message, delay_seconds)
  limit 1;

  return message_id;
end;
$$;

create or replace function public.worker_queue_read(
  queue_name text,
  visibility_timeout_seconds integer,
  max_messages integer
)
returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    message_record.msg_id,
    message_record.read_ct,
    message_record.enqueued_at,
    message_record.vt,
    message_record.message
  from pgmq.read(
    queue_name,
    visibility_timeout_seconds,
    max_messages
  ) as message_record;
end;
$$;

create or replace function public.worker_queue_ack(
  queue_name text,
  message_id bigint
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select pgmq.archive(queue_name, message_id);
$$;

create or replace function public.worker_queue_retry(
  queue_name text,
  message_id bigint,
  delay_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pgmq.set_vt(queue_name, message_id, delay_seconds);
end;
$$;

create or replace function public.dispatch_scheduled_youtube_uploads()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  enqueue_count integer := 0;
begin
  with due_uploads as (
    update public.youtube_uploads
    set
      status = 'uploading',
      updated_at = now()
    where status = 'scheduled'
      and scheduled_at <= now()
      and track_id is not null
      and video_render_id is not null
    returning
      id,
      workspace_id,
      track_id,
      video_render_id
  ),
  queued as (
    select pgmq.send(
      'youtube-upload-jobs',
      jsonb_build_object(
        'workspaceId', workspace_id,
        'trackId', track_id,
        'videoRenderId', video_render_id,
        'youtubeUploadId', id
      ),
      0
    )
    from due_uploads
  )
  select count(*)
  into enqueue_count
  from queued;

  return enqueue_count;
end;
$$;

select cron.schedule(
  'scheduled-publish-dispatcher',
  '*/1 * * * *',
  $$select public.dispatch_scheduled_youtube_uploads();$$
);

select cron.schedule(
  'stale-job-recovery',
  '*/5 * * * *',
  $$select pgmq.send('maintenance-jobs', jsonb_build_object('task', 'stale-job-recovery'), 0);$$
);

select cron.schedule(
  'sync-suno-limits',
  '0 */6 * * *',
  $$select pgmq.send('maintenance-jobs', jsonb_build_object('task', 'sync-suno-limits'), 0);$$
);

select cron.schedule(
  'cleanup-temp-assets',
  '0 3 * * *',
  $$select pgmq.send('maintenance-jobs', jsonb_build_object('task', 'cleanup-temp-assets'), 0);$$
);

alter table public.image_assets
add constraint image_assets_storage_path_workspace_check
check (
  public.storage_workspace_id(storage_path) is not null
  and public.storage_workspace_id(storage_path) = workspace_id
);

alter table public.tracks
add constraint tracks_audio_storage_path_workspace_check
check (
  audio_storage_path is null
  or (
    public.storage_workspace_id(audio_storage_path) is not null
    and public.storage_workspace_id(audio_storage_path) = workspace_id
  )
);

alter table public.video_renders
add constraint video_renders_video_storage_path_workspace_check
check (
  video_storage_path is null
  or (
    public.storage_workspace_id(video_storage_path) is not null
    and public.storage_workspace_id(video_storage_path) = workspace_id
  )
);

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger workspaces_touch_updated_at
before update on public.workspaces
for each row execute function public.touch_updated_at();

create trigger workspaces_prevent_owner_change
before update on public.workspaces
for each row execute function public.prevent_workspace_owner_change();

create trigger workspaces_create_owner_membership
after insert on public.workspaces
for each row execute function public.create_workspace_owner_membership();

create trigger subscriptions_touch_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

create trigger usage_counters_touch_updated_at
before update on public.usage_counters
for each row execute function public.touch_updated_at();

create trigger suno_connections_touch_updated_at
before update on public.suno_connections
for each row execute function public.touch_updated_at();

create trigger youtube_connections_touch_updated_at
before update on public.youtube_connections
for each row execute function public.touch_updated_at();

create trigger youtube_channels_touch_updated_at
before update on public.youtube_channels
for each row execute function public.touch_updated_at();

create trigger generation_requests_touch_updated_at
before update on public.generation_requests
for each row execute function public.touch_updated_at();

create trigger tracks_touch_updated_at
before update on public.tracks
for each row execute function public.touch_updated_at();

create trigger video_renders_touch_updated_at
before update on public.video_renders
for each row execute function public.touch_updated_at();

create trigger youtube_uploads_touch_updated_at
before update on public.youtube_uploads
for each row execute function public.touch_updated_at();

create unique index workspace_members_one_owner_idx
on public.workspace_members (workspace_id)
where role = 'owner';

create unique index youtube_channels_one_default_idx
on public.youtube_channels (workspace_id)
where is_default;

create index profiles_created_at_idx on public.profiles (created_at desc);
create index workspaces_owner_user_id_idx on public.workspaces (owner_user_id);
create index workspaces_created_at_idx on public.workspaces (created_at desc);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_created_at_idx on public.workspace_members (created_at desc);
create index subscriptions_workspace_id_idx on public.subscriptions (workspace_id);
create index subscriptions_created_at_idx on public.subscriptions (created_at desc);
create index usage_counters_workspace_id_idx on public.usage_counters (workspace_id);
create index usage_counters_created_at_idx on public.usage_counters (created_at desc);
create index suno_connections_workspace_id_idx on public.suno_connections (workspace_id);
create index suno_connections_created_at_idx on public.suno_connections (created_at desc);
create index youtube_connections_workspace_id_idx on public.youtube_connections (workspace_id);
create index youtube_connections_created_at_idx on public.youtube_connections (created_at desc);
create index youtube_channels_workspace_id_idx on public.youtube_channels (workspace_id);
create index youtube_channels_youtube_connection_id_idx on public.youtube_channels (youtube_connection_id);
create index youtube_channels_created_at_idx on public.youtube_channels (created_at desc);
create index image_assets_workspace_id_idx on public.image_assets (workspace_id);
create index image_assets_created_at_idx on public.image_assets (created_at desc);
create index generation_requests_workspace_id_idx on public.generation_requests (workspace_id);
create index generation_requests_created_by_user_id_idx on public.generation_requests (created_by_user_id);
create index generation_requests_target_youtube_channel_id_idx on public.generation_requests (target_youtube_channel_id);
create index generation_requests_image_asset_id_idx on public.generation_requests (image_asset_id);
create index generation_requests_status_idx on public.generation_requests (status);
create index generation_requests_created_at_idx on public.generation_requests (created_at desc);
create index tracks_workspace_id_idx on public.tracks (workspace_id);
create index tracks_generation_request_id_idx on public.tracks (generation_request_id);
create index tracks_image_asset_id_idx on public.tracks (image_asset_id);
create index tracks_status_idx on public.tracks (status);
create index tracks_created_at_idx on public.tracks (created_at desc);
create index video_renders_workspace_id_idx on public.video_renders (workspace_id);
create index video_renders_track_id_idx on public.video_renders (track_id);
create index video_renders_status_idx on public.video_renders (status);
create index video_renders_created_at_idx on public.video_renders (created_at desc);
create index youtube_uploads_workspace_id_idx on public.youtube_uploads (workspace_id);
create index youtube_uploads_track_id_idx on public.youtube_uploads (track_id);
create index youtube_uploads_video_render_id_idx on public.youtube_uploads (video_render_id);
create index youtube_uploads_youtube_channel_id_idx on public.youtube_uploads (youtube_channel_id);
create index youtube_uploads_status_idx on public.youtube_uploads (status);
create index youtube_uploads_scheduled_at_idx on public.youtube_uploads (scheduled_at);
create index youtube_uploads_created_at_idx on public.youtube_uploads (created_at desc);
create index prompt_history_workspace_id_idx on public.prompt_history (workspace_id);
create index prompt_history_generation_request_id_idx on public.prompt_history (generation_request_id);
create index prompt_history_created_at_idx on public.prompt_history (created_at desc);
create index audit_logs_workspace_id_idx on public.audit_logs (workspace_id);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.suno_connections enable row level security;
alter table public.youtube_connections enable row level security;
alter table public.youtube_channels enable row level security;
alter table public.image_assets enable row level security;
alter table public.generation_requests enable row level security;
alter table public.tracks enable row level security;
alter table public.video_renders enable row level security;
alter table public.youtube_uploads enable row level security;
alter table public.prompt_history enable row level security;
alter table public.audit_logs enable row level security;

create policy "users read own profile"
on public.profiles for select
to authenticated
using (user_id = (select auth.uid()));

create policy "users create own profile"
on public.profiles for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "users update own profile"
on public.profiles for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "members read workspaces"
on public.workspaces for select
to authenticated
using (
  public.is_workspace_member(id)
  or owner_user_id = (select auth.uid())
);

create policy "users create owned workspaces"
on public.workspaces for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "owners and admins update workspaces"
on public.workspaces for update
to authenticated
using (public.can_manage_workspace(id))
with check (public.can_manage_workspace(id));

create policy "owners delete workspaces"
on public.workspaces for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
  or public.workspace_role_for_current_user(id) = 'owner'
);

create policy "members read workspace memberships"
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create workspace memberships"
on public.workspace_members for insert
to authenticated
with check (
  public.can_manage_workspace(workspace_id)
  and role <> 'owner'
);

create policy "owners and admins update workspace memberships"
on public.workspace_members for update
to authenticated
using (
  public.can_manage_workspace(workspace_id)
  and role <> 'owner'
)
with check (
  public.can_manage_workspace(workspace_id)
  and role <> 'owner'
);

create policy "owners and admins delete workspace memberships"
on public.workspace_members for delete
to authenticated
using (
  public.can_manage_workspace(workspace_id)
  and role <> 'owner'
);

create policy "members read subscriptions"
on public.subscriptions for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create subscriptions"
on public.subscriptions for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update subscriptions"
on public.subscriptions for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete subscriptions"
on public.subscriptions for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read usage counters"
on public.usage_counters for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create usage counters"
on public.usage_counters for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update usage counters"
on public.usage_counters for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete usage counters"
on public.usage_counters for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read suno connections"
on public.suno_connections for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create suno connections"
on public.suno_connections for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update suno connections"
on public.suno_connections for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete suno connections"
on public.suno_connections for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read youtube connections"
on public.youtube_connections for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create youtube connections"
on public.youtube_connections for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update youtube connections"
on public.youtube_connections for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete youtube connections"
on public.youtube_connections for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read youtube channels"
on public.youtube_channels for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create youtube channels"
on public.youtube_channels for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update youtube channels"
on public.youtube_channels for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete youtube channels"
on public.youtube_channels for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read image assets"
on public.image_assets for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create image assets"
on public.image_assets for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update image assets"
on public.image_assets for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete image assets"
on public.image_assets for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read generation requests"
on public.generation_requests for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create generation requests"
on public.generation_requests for insert
to authenticated
with check (
  public.can_manage_workspace(workspace_id)
  and created_by_user_id = (select auth.uid())
);

create policy "owners and admins update generation requests"
on public.generation_requests for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete generation requests"
on public.generation_requests for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read tracks"
on public.tracks for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create tracks"
on public.tracks for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update tracks"
on public.tracks for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete tracks"
on public.tracks for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read video renders"
on public.video_renders for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create video renders"
on public.video_renders for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update video renders"
on public.video_renders for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete video renders"
on public.video_renders for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read youtube uploads"
on public.youtube_uploads for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create youtube uploads"
on public.youtube_uploads for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins update youtube uploads"
on public.youtube_uploads for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete youtube uploads"
on public.youtube_uploads for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read prompt history"
on public.prompt_history for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create prompt history"
on public.prompt_history for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "owners and admins delete prompt history"
on public.prompt_history for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "members read audit logs"
on public.audit_logs for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins create audit logs"
on public.audit_logs for insert
to authenticated
with check (
  public.can_manage_workspace(workspace_id)
  and (user_id is null or user_id = (select auth.uid()))
);

insert into storage.buckets (id, name, public)
values
  ('image-assets', 'image-assets', false),
  ('audio-assets', 'audio-assets', false),
  ('video-renders', 'video-renders', false),
  ('temp', 'temp', false)
on conflict (id) do update
set public = false;

create policy "members read bussin storage objects"
on storage.objects for select
to authenticated
using (
  bucket_id in ('image-assets', 'audio-assets', 'video-renders', 'temp')
  and public.is_workspace_member(public.storage_workspace_id(name))
);

create policy "owners and admins create bussin storage objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('image-assets', 'audio-assets', 'video-renders', 'temp')
  and public.can_manage_workspace(public.storage_workspace_id(name))
);

create policy "owners and admins update bussin storage objects"
on storage.objects for update
to authenticated
using (
  bucket_id in ('image-assets', 'audio-assets', 'video-renders', 'temp')
  and public.can_manage_workspace(public.storage_workspace_id(name))
)
with check (
  bucket_id in ('image-assets', 'audio-assets', 'video-renders', 'temp')
  and public.can_manage_workspace(public.storage_workspace_id(name))
);

create policy "owners and admins delete bussin storage objects"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('image-assets', 'audio-assets', 'video-renders', 'temp')
  and public.can_manage_workspace(public.storage_workspace_id(name))
);

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon, authenticated;
revoke select on public.suno_connections, public.youtube_connections from anon, authenticated;
grant select (
  id,
  workspace_id,
  label,
  status,
  credits_left,
  monthly_limit,
  monthly_usage,
  last_checked_at,
  last_error,
  created_at,
  updated_at
)
on public.suno_connections
to authenticated;
grant select (
  id,
  workspace_id,
  provider_account_email,
  token_expires_at,
  scopes,
  status,
  created_at,
  updated_at
)
on public.youtube_connections
to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.workspace_role_for_current_user(uuid) to authenticated;
grant execute on function public.can_manage_workspace(uuid) to authenticated;
grant execute on function public.storage_workspace_id(text) to authenticated;
