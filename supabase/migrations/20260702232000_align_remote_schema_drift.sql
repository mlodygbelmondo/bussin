drop extension if exists "pg_net";

revoke delete on table "public"."audit_logs" from "anon";

revoke insert on table "public"."audit_logs" from "anon";

revoke update on table "public"."audit_logs" from "anon";

revoke delete on table "public"."generation_requests" from "anon";

revoke insert on table "public"."generation_requests" from "anon";

revoke update on table "public"."generation_requests" from "anon";

revoke delete on table "public"."image_assets" from "anon";

revoke insert on table "public"."image_assets" from "anon";

revoke update on table "public"."image_assets" from "anon";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."prompt_history" from "anon";

revoke insert on table "public"."prompt_history" from "anon";

revoke update on table "public"."prompt_history" from "anon";

revoke update on table "public"."stripe_webhook_events" from "service_role";

revoke delete on table "public"."subscriptions" from "anon";

revoke insert on table "public"."subscriptions" from "anon";

revoke update on table "public"."subscriptions" from "anon";

revoke delete on table "public"."suno_connections" from "anon";

revoke insert on table "public"."suno_connections" from "anon";

revoke update on table "public"."suno_connections" from "anon";

revoke delete on table "public"."tracks" from "anon";

revoke insert on table "public"."tracks" from "anon";

revoke update on table "public"."tracks" from "anon";

revoke delete on table "public"."usage_counters" from "anon";

revoke insert on table "public"."usage_counters" from "anon";

revoke update on table "public"."usage_counters" from "anon";

revoke delete on table "public"."video_renders" from "anon";

revoke insert on table "public"."video_renders" from "anon";

revoke update on table "public"."video_renders" from "anon";

revoke delete on table "public"."workspace_members" from "anon";

revoke insert on table "public"."workspace_members" from "anon";

revoke update on table "public"."workspace_members" from "anon";

revoke delete on table "public"."workspace_settings" from "anon";

revoke insert on table "public"."workspace_settings" from "anon";

revoke select on table "public"."workspace_settings" from "anon";

revoke update on table "public"."workspace_settings" from "anon";

revoke delete on table "public"."workspace_settings" from "authenticated";

revoke insert on table "public"."workspace_settings" from "authenticated";

revoke select on table "public"."workspace_settings" from "authenticated";

revoke update on table "public"."workspace_settings" from "authenticated";

revoke delete on table "public"."workspace_settings" from "service_role";

revoke insert on table "public"."workspace_settings" from "service_role";

revoke select on table "public"."workspace_settings" from "service_role";

revoke update on table "public"."workspace_settings" from "service_role";

revoke delete on table "public"."workspaces" from "anon";

revoke insert on table "public"."workspaces" from "anon";

revoke update on table "public"."workspaces" from "anon";

revoke delete on table "public"."youtube_channels" from "anon";

revoke insert on table "public"."youtube_channels" from "anon";

revoke update on table "public"."youtube_channels" from "anon";

revoke delete on table "public"."youtube_connections" from "anon";

revoke insert on table "public"."youtube_connections" from "anon";

revoke update on table "public"."youtube_connections" from "anon";

revoke delete on table "public"."youtube_uploads" from "anon";

revoke insert on table "public"."youtube_uploads" from "anon";

revoke update on table "public"."youtube_uploads" from "anon";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
