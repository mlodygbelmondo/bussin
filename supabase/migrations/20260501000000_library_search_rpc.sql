create or replace function public.search_library_tracks(
  p_workspace_id uuid,
  p_query text default null,
  p_status text default null,
  p_mood text default null,
  p_channel_id uuid default null,
  p_created_after timestamptz default null,
  p_limit int default 8,
  p_offset int default 0
)
returns table (
  id uuid,
  workspace_id uuid,
  generation_request_id uuid,
  title text,
  tags text[],
  style text,
  mood text,
  duration_seconds int,
  image_asset_id uuid,
  status text,
  failure_reason text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered_tracks as (
    select
      t.id,
      t.workspace_id,
      t.generation_request_id,
      t.title,
      t.tags,
      t.style,
      t.mood,
      t.duration_seconds,
      t.image_asset_id,
      t.status,
      t.failure_reason,
      t.created_at,
      count(*) over () as total_count
    from public.tracks t
    left join public.generation_requests gr
      on gr.workspace_id = t.workspace_id
      and gr.id = t.generation_request_id
    left join lateral (
      select yu.youtube_channel_id, yu.status
      from public.youtube_uploads yu
      where yu.workspace_id = t.workspace_id
        and yu.track_id = t.id
      order by yu.created_at desc
      limit 1
    ) latest_upload on true
    where t.workspace_id = p_workspace_id
      and (
        p_status is null
        or case
          when latest_upload.status = 'uploaded' then 'uploaded'
          else t.status
        end = p_status
      )
      and (
        p_mood is null
        or t.mood ilike ('%' || p_mood || '%')
      )
      and (
        p_created_after is null
        or t.created_at >= p_created_after
      )
      and (
        p_channel_id is null
        or latest_upload.youtube_channel_id = p_channel_id
        or (
          latest_upload.youtube_channel_id is null
          and gr.target_youtube_channel_id = p_channel_id
        )
      )
      and (
        p_query is null
        or t.title ilike ('%' || p_query || '%')
        or t.style ilike ('%' || p_query || '%')
        or t.mood ilike ('%' || p_query || '%')
      )
    order by t.created_at desc
    limit greatest(1, least(p_limit, 100))
    offset greatest(0, p_offset)
  )
  select * from filtered_tracks;
$$;

grant execute on function public.search_library_tracks(
  uuid,
  text,
  text,
  text,
  uuid,
  timestamptz,
  int,
  int
) to authenticated, service_role;
