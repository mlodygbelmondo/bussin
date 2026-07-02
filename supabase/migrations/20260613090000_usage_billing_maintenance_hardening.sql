-- Completeness hardening: atomic usage counters, Stripe webhook idempotency,
-- and SQL helpers for the worker maintenance jobs.

-- 1) Atomic usage counter increments.
--
-- The previous read-then-write pattern lost increments under concurrency and
-- silently failed for plain members (insert/update policies require
-- owner/admin). This function is SECURITY DEFINER with an explicit membership
-- check so any workspace member's activity is counted, atomically.
create or replace function public.increment_usage_counter(
  target_workspace_id uuid,
  target_period_start timestamptz,
  target_period_end timestamptz,
  generated_tracks_delta integer default 0,
  uploaded_videos_delta integer default 0,
  connected_channels_delta integer default 0,
  scheduled_uploads_delta integer default 0
)
returns public.usage_counters
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.usage_counters;
begin
  if not public.is_workspace_member(target_workspace_id)
    and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception 'Not a member of this workspace.';
  end if;

  insert into public.usage_counters (
    workspace_id,
    period_start,
    period_end,
    generated_tracks_count,
    uploaded_videos_count,
    connected_channels_count,
    scheduled_uploads_count
  )
  values (
    target_workspace_id,
    target_period_start,
    target_period_end,
    greatest(generated_tracks_delta, 0),
    greatest(uploaded_videos_delta, 0),
    greatest(connected_channels_delta, 0),
    greatest(scheduled_uploads_delta, 0)
  )
  on conflict (workspace_id, period_start, period_end)
  do update set
    generated_tracks_count =
      public.usage_counters.generated_tracks_count
        + greatest(excluded.generated_tracks_count, 0),
    uploaded_videos_count =
      public.usage_counters.uploaded_videos_count
        + greatest(excluded.uploaded_videos_count, 0),
    connected_channels_count =
      public.usage_counters.connected_channels_count
        + greatest(excluded.connected_channels_count, 0),
    scheduled_uploads_count =
      public.usage_counters.scheduled_uploads_count
        + greatest(excluded.scheduled_uploads_count, 0),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.increment_usage_counter(
  uuid, timestamptz, timestamptz, integer, integer, integer, integer
) from public, anon;

grant execute on function public.increment_usage_counter(
  uuid, timestamptz, timestamptz, integer, integer, integer, integer
) to authenticated, service_role;

-- 2) Stripe webhook idempotency.
--
-- Stripe redelivers events; processing must be exactly-once. The webhook
-- route records each event id here and skips ids it has already seen.
-- Service-role only (RLS enabled with no policies).
create table public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from public, anon, authenticated;

grant select, insert, delete on table public.stripe_webhook_events to service_role;

-- 3) Atomic monthly upload reservations for the external worker.
--
-- The app does a preflight limit check for UX, but concurrent worker
-- processes need a database-side reservation immediately before the YouTube
-- API call so workspaces cannot exceed monthly upload limits by queuing jobs.
create or replace function public.reserve_monthly_upload_capacity(
  target_workspace_id uuid,
  target_period_start timestamptz,
  target_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  billing_plan text := 'trial';
  billing_status text;
  counter public.usage_counters;
  effective_plan text := 'trial';
  upload_limit integer := 10;
begin
  select subscriptions.plan, subscriptions.status
  into billing_plan, billing_status
  from public.subscriptions
  where subscriptions.workspace_id = target_workspace_id;

  billing_plan := coalesce(billing_plan, 'trial');

  if billing_plan in ('creator', 'pro', 'studio')
    and (billing_status is null or billing_status in ('trialing', 'active'))
  then
    effective_plan := billing_plan;
  end if;

  upload_limit := case effective_plan
    when 'creator' then 100
    when 'pro' then 500
    when 'studio' then 2000
    else 10
  end;

  insert into public.usage_counters (
    workspace_id,
    period_start,
    period_end,
    generated_tracks_count,
    uploaded_videos_count,
    connected_channels_count,
    scheduled_uploads_count
  )
  values (
    target_workspace_id,
    target_period_start,
    target_period_end,
    0,
    0,
    0,
    0
  )
  on conflict (workspace_id, period_start, period_end)
  do nothing;

  select *
  into counter
  from public.usage_counters
  where usage_counters.workspace_id = target_workspace_id
    and usage_counters.period_start = target_period_start
    and usage_counters.period_end = target_period_end
  for update;

  if counter.uploaded_videos_count + 1 > upload_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', format('%s allows %s monthly uploads.', effective_plan, upload_limit)
    );
  end if;

  update public.usage_counters
  set
    uploaded_videos_count = counter.uploaded_videos_count + 1,
    updated_at = now()
  where usage_counters.id = counter.id
  returning * into counter;

  return jsonb_build_object('allowed', true, 'reason', null);
end;
$$;

revoke execute on function public.reserve_monthly_upload_capacity(
  uuid, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_monthly_upload_capacity(
  uuid, timestamptz, timestamptz
) to service_role;

-- 4) Stale job recovery, called by the worker's maintenance handler.
--
-- Anything stuck in a transient status with no progress for longer than
-- stale_minutes is marked failed with a retryable failure_reason that the
-- feed surfaces verbatim next to a Retry button.
create or replace function public.recover_stale_jobs(stale_minutes integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - make_interval(mins => greatest(stale_minutes, 5));
  stale_tracks integer := 0;
  stale_renders integer := 0;
  stale_uploads integer := 0;
begin
  with recovered as (
    update public.tracks
    set
      status = 'failed',
      failure_reason = 'Generation timed out. Retry to start a new generation.',
      updated_at = now()
    where status in ('generating', 'polling')
      and updated_at < cutoff
    returning id
  )
  select count(*) into stale_tracks from recovered;

  with recovered_renders as (
    update public.video_renders
    set
      status = 'failed',
      failure_reason = 'Render timed out. Retry to render again.',
      finished_at = now(),
      updated_at = now()
    where status = 'running'
      and updated_at < cutoff
    returning workspace_id, track_id
  ),
  failed_render_tracks as (
    update public.tracks
    set
      status = 'failed',
      failure_reason = 'Render timed out. Retry to render again.',
      updated_at = now()
    from recovered_renders
    where tracks.workspace_id = recovered_renders.workspace_id
      and tracks.id = recovered_renders.track_id
    returning tracks.id
  )
  select render_counts.recovered_count into stale_renders
  from (
    select count(*) as recovered_count
    from recovered_renders
  ) as render_counts
  cross join (
    select count(*)
    from failed_render_tracks
  ) as track_updates;

  with recovered_uploads as (
    update public.youtube_uploads
    set
      status = 'failed',
      failure_reason = 'YouTube upload timed out. Retry to upload again.',
      updated_at = now()
    where status = 'uploading'
      and updated_at < cutoff
    returning id
  )
  select count(*) into stale_uploads from recovered_uploads;

  return jsonb_build_object(
    'staleTracks', stale_tracks,
    'staleRenders', stale_renders,
    'staleUploads', stale_uploads
  );
end;
$$;

revoke execute on function public.recover_stale_jobs(integer) from public, anon, authenticated;

grant execute on function public.recover_stale_jobs(integer) to service_role;

-- 5) Stale temp-storage discovery for the cleanup-temp-assets maintenance
-- task. Returns object names so the worker can delete them through the
-- Storage API (deleting rows directly would orphan the underlying files).
create or replace function public.list_stale_temp_objects(older_than_days integer default 2)
returns table (name text)
language sql
security definer
set search_path = ''
as $$
  select objects.name
  from storage.objects
  where objects.bucket_id = 'temp'
    and objects.created_at < now() - make_interval(days => greatest(older_than_days, 1));
$$;

revoke execute on function public.list_stale_temp_objects(integer) from public, anon, authenticated;

grant execute on function public.list_stale_temp_objects(integer) to service_role;
