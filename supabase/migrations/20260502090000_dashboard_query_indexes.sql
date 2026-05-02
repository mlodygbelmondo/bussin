create index if not exists workspace_members_user_workspace_idx
on public.workspace_members (user_id, workspace_id);

create index if not exists usage_counters_workspace_period_start_idx
on public.usage_counters (workspace_id, period_start desc);

create index if not exists suno_connections_workspace_updated_at_idx
on public.suno_connections (workspace_id, updated_at desc);

create index if not exists youtube_connections_workspace_created_at_idx
on public.youtube_connections (workspace_id, created_at desc);

create index if not exists youtube_channels_workspace_default_created_idx
on public.youtube_channels (workspace_id, is_default desc, created_at desc);

create index if not exists image_assets_workspace_created_at_idx
on public.image_assets (workspace_id, created_at desc);

create index if not exists generation_requests_workspace_created_at_idx
on public.generation_requests (workspace_id, created_at desc);

create index if not exists tracks_workspace_created_at_idx
on public.tracks (workspace_id, created_at desc);

create index if not exists video_renders_workspace_track_created_at_idx
on public.video_renders (workspace_id, track_id, created_at desc);

create index if not exists youtube_uploads_workspace_track_created_at_idx
on public.youtube_uploads (workspace_id, track_id, created_at desc);

create index if not exists youtube_uploads_workspace_created_at_idx
on public.youtube_uploads (workspace_id, created_at desc);

create index if not exists youtube_uploads_workspace_scheduled_at_idx
on public.youtube_uploads (workspace_id, scheduled_at);

create index if not exists youtube_uploads_workspace_active_scheduled_idx
on public.youtube_uploads (workspace_id, scheduled_at)
where status <> 'cancelled';

create index if not exists prompt_history_workspace_created_at_idx
on public.prompt_history (workspace_id, created_at desc);

create index if not exists audit_logs_workspace_created_at_idx
on public.audit_logs (workspace_id, created_at desc);
