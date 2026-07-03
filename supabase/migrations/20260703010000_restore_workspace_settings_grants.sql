grant select, insert, update, delete
on table public.workspace_settings
to authenticated;

grant all
on table public.workspace_settings
to service_role;
