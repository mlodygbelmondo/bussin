-- Scheduling has exactly one dispatch path: the pg_cron job
-- 'scheduled-publish-dispatcher' calling dispatch_scheduled_youtube_uploads().
-- The worker-side 'scheduled-publish-jobs' consumer was dead code (nothing
-- ever enqueued to it) and is removed from the worker; drop its queue here.
--
-- The dispatcher also gains a render-readiness guard: uploads can now be
-- scheduled before their video render finishes, so a due upload whose render
-- is not complete must stay 'scheduled' and be picked up on a later tick
-- instead of being dispatched into a guaranteed failure.

select cron.unschedule(jobid)
from cron.job
where jobname = 'scheduled-publish-dispatcher';

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
      and exists (
        select 1
        from public.video_renders
        where video_renders.id = youtube_uploads.video_render_id
          and video_renders.status in ('rendered', 'completed')
      )
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

select pgmq.drop_queue('scheduled-publish-jobs');
