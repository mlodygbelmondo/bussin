revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon, authenticated;

grant execute on all functions in schema public to service_role;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.workspace_role_for_current_user(uuid) to authenticated;
grant execute on function public.can_manage_workspace(uuid) to authenticated;
grant execute on function public.storage_workspace_id(text) to authenticated;
grant execute on function public.search_library_tracks(
  uuid,
  text,
  text,
  text,
  uuid,
  timestamptz,
  int,
  int
) to authenticated;
grant execute on function public.publish_youtube_upload_now(
  uuid,
  uuid,
  uuid
) to authenticated;
