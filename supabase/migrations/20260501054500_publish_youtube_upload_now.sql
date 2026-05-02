create or replace function public.publish_youtube_upload_now(
  target_workspace_id uuid,
  target_upload_id uuid,
  acting_user_id uuid
)
returns table (
  id uuid,
  workspace_id uuid,
  track_id uuid,
  video_render_id uuid,
  scheduled_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidate_upload as (
    select
      youtube_uploads.id,
      youtube_uploads.status as previous_status
    from public.youtube_uploads
    where youtube_uploads.workspace_id = target_workspace_id
      and youtube_uploads.id = target_upload_id
      and youtube_uploads.status in ('draft', 'scheduled')
      and youtube_uploads.track_id is not null
      and youtube_uploads.video_render_id is not null
      and auth.uid() = acting_user_id
      and public.can_manage_workspace(target_workspace_id)
    for update
  ),
  updated_upload as (
    update public.youtube_uploads
    set
      scheduled_at = null,
      status = 'uploading',
      updated_at = now()
    from candidate_upload
    where youtube_uploads.id = candidate_upload.id
    returning
      youtube_uploads.id,
      youtube_uploads.workspace_id,
      youtube_uploads.track_id,
      youtube_uploads.video_render_id,
      youtube_uploads.scheduled_at,
      youtube_uploads.status,
      candidate_upload.previous_status
  ),
  queued as (
    select pgmq.send(
      'youtube-upload-jobs',
      jsonb_build_object(
        'workspaceId', updated_upload.workspace_id,
        'trackId', updated_upload.track_id,
        'videoRenderId', updated_upload.video_render_id,
        'youtubeUploadId', updated_upload.id
      ),
      0
    )
    from updated_upload
  ),
  audit as (
    insert into public.audit_logs (
      workspace_id,
      user_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    select
      updated_upload.workspace_id,
      acting_user_id,
      'upload.publish_now_requested',
      'youtube_upload',
      updated_upload.id,
      jsonb_build_object('previous_status', updated_upload.previous_status)
    from updated_upload
    returning id
  )
  select
    updated_upload.id,
    updated_upload.workspace_id,
    updated_upload.track_id,
    updated_upload.video_render_id,
    updated_upload.scheduled_at,
    updated_upload.status
  from updated_upload
  where exists (select 1 from queued);
end;
$$;
