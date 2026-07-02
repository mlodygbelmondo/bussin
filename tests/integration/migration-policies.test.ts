// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260430210000_initial_platform.sql",
);

describe("Supabase migration policies", () => {
  it("allows workspace owners and admins to update image asset rows", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toMatch(
      /create policy "owners and admins update image assets"\s+on public\.image_assets for update\s+to authenticated\s+using \(public\.can_manage_workspace\(workspace_id\)\)\s+with check \(public\.can_manage_workspace\(workspace_id\)\);/,
    );
  });

  it("prevents client-side owner membership promotion or deletion", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toMatch(
      /create policy "owners and admins create workspace memberships"\s+on public\.workspace_members for insert\s+to authenticated\s+with check \(\s+public\.can_manage_workspace\(workspace_id\)\s+and role <> 'owner'\s+\);/,
    );
    expect(migration).toMatch(
      /create policy "owners and admins update workspace memberships"\s+on public\.workspace_members for update\s+to authenticated\s+using \(\s+public\.can_manage_workspace\(workspace_id\)\s+and role <> 'owner'\s+\)\s+with check \(\s+public\.can_manage_workspace\(workspace_id\)\s+and role <> 'owner'\s+\);/,
    );
    expect(migration).toMatch(
      /create policy "owners and admins delete workspace memberships"\s+on public\.workspace_members for delete\s+to authenticated\s+using \(\s+public\.can_manage_workspace\(workspace_id\)\s+and role <> 'owner'\s+\);/,
    );
  });

  it("allows member connection row reads without granting encrypted credential columns", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toMatch(
      /create policy "members read suno connections"\s+on public\.suno_connections for select\s+to authenticated\s+using \(public\.is_workspace_member\(workspace_id\)\);/,
    );
    expect(migration).toMatch(
      /create policy "members read youtube connections"\s+on public\.youtube_connections for select\s+to authenticated\s+using \(public\.is_workspace_member\(workspace_id\)\);/,
    );
    expect(migration).toMatch(
      /revoke select on public\.suno_connections, public\.youtube_connections from anon, authenticated;/,
    );
    expect(migration).toMatch(
      /grant select \(\s+id,\s+workspace_id,\s+label,\s+status,\s+credits_left,\s+monthly_limit,\s+monthly_usage,\s+last_checked_at,\s+last_error,\s+created_at,\s+updated_at\s+\)\s+on public\.suno_connections\s+to authenticated;/,
    );
    expect(migration).toMatch(
      /grant select \(\s+id,\s+workspace_id,\s+provider_account_email,\s+token_expires_at,\s+scopes,\s+status,\s+created_at,\s+updated_at\s+\)\s+on public\.youtube_connections\s+to authenticated;/,
    );
    expect(migration).not.toMatch(
      /grant select \([^;]*(encrypted_cookie|encrypted_api_url|encrypted_access_token|encrypted_refresh_token)[^;]*\)\s+on public\.(suno_connections|youtube_connections)\s+to authenticated;/,
    );
  });

  it("constrains storage metadata paths to their row workspace", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toMatch(
      /alter table public\.image_assets\s+add constraint image_assets_storage_path_workspace_check\s+check \(\s+public\.storage_workspace_id\(storage_path\) is not null\s+and public\.storage_workspace_id\(storage_path\) = workspace_id\s+\);/,
    );
    expect(migration).toMatch(
      /alter table public\.tracks\s+add constraint tracks_audio_storage_path_workspace_check\s+check \(\s+audio_storage_path is null\s+or \(\s+public\.storage_workspace_id\(audio_storage_path\) is not null\s+and public\.storage_workspace_id\(audio_storage_path\) = workspace_id\s+\)\s+\);/,
    );
    expect(migration).toMatch(
      /alter table public\.video_renders\s+add constraint video_renders_video_storage_path_workspace_check\s+check \(\s+video_storage_path is null\s+or \(\s+public\.storage_workspace_id\(video_storage_path\) is not null\s+and public\.storage_workspace_id\(video_storage_path\) = workspace_id\s+\)\s+\);/,
    );
  });

  it("configures worker queues and cron dispatchers", async () => {
    const migration = await readFile(migrationPath, "utf8");

    for (const queueName of [
      "generation-jobs",
      "suno-polling-jobs",
      "render-jobs",
      "youtube-upload-jobs",
      "scheduled-publish-jobs",
      "maintenance-jobs",
    ]) {
      expect(migration).toContain(`perform pgmq.create('${queueName}')`);
    }

    expect(migration).toContain(
      "create or replace function public.worker_queue_send",
    );
    expect(migration).toContain(
      "create or replace function public.dispatch_scheduled_youtube_uploads",
    );
    expect(migration).toMatch(
      /select cron\.schedule\(\s+'scheduled-publish-dispatcher'/,
    );
    expect(migration).toMatch(/select cron\.schedule\(\s+'stale-job-recovery'/);
    expect(migration).toMatch(/select cron\.schedule\(\s+'sync-suno-limits'/);
    expect(migration).toMatch(
      /select cron\.schedule\(\s+'cleanup-temp-assets'/,
    );
  });

  it("keeps a single scheduling dispatch path with a render-readiness guard", async () => {
    const schedulingMigration = await readFile(
      join(
        process.cwd(),
        "supabase/migrations/20260612090000_single_scheduling_path.sql",
      ),
      "utf8",
    );

    expect(schedulingMigration).toContain(
      "create or replace function public.dispatch_scheduled_youtube_uploads",
    );
    expect(schedulingMigration).toMatch(
      /video_renders\.status in \('rendered', 'completed'\)/,
    );
    expect(schedulingMigration).toContain(
      "select pgmq.drop_queue('scheduled-publish-jobs');",
    );
    expect(schedulingMigration).toMatch(
      /select cron\.schedule\(\s+'scheduled-publish-dispatcher'/,
    );
  });

  it("does not grant worker queue RPC execution to application users", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      "revoke execute on all functions in schema public from public;",
    );
    expect(migration).toContain(
      "revoke execute on all functions in schema public from anon, authenticated;",
    );
    expect(migration).not.toMatch(
      /grant execute on all functions in schema public to authenticated/,
    );

    for (const functionName of [
      "worker_queue_send",
      "worker_queue_read",
      "worker_queue_ack",
      "worker_queue_retry",
    ]) {
      expect(migration).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${functionName}[^;]+to authenticated`,
          "i",
        ),
      );
    }
  });

  it("hardens usage counters, webhook idempotency, and maintenance helpers", async () => {
    const hardeningMigration = await readFile(
      join(
        process.cwd(),
        "supabase/migrations/20260613090000_usage_billing_maintenance_hardening.sql",
      ),
      "utf8",
    );

    expect(hardeningMigration).toContain(
      "create or replace function public.increment_usage_counter",
    );
    expect(hardeningMigration).toMatch(
      /on conflict \(workspace_id, period_start, period_end\)/,
    );
    expect(hardeningMigration).toMatch(
      /generated_tracks_count\s*=\s*public\.usage_counters\.generated_tracks_count\s*\+\s*greatest\(excluded\.generated_tracks_count, 0\)/,
    );
    expect(hardeningMigration).toMatch(
      /if not public\.is_workspace_member\(target_workspace_id\)/,
    );
    expect(hardeningMigration).toMatch(
      /revoke execute on function public\.increment_usage_counter\(\s*uuid, timestamptz, timestamptz, integer, integer, integer, integer\s*\) from public, anon;/,
    );
    expect(hardeningMigration).toMatch(
      /grant execute on function public\.increment_usage_counter\(\s*uuid, timestamptz, timestamptz, integer, integer, integer, integer\s*\) to authenticated, service_role;/,
    );

    expect(hardeningMigration).toContain(
      "create table public.stripe_webhook_events",
    );
    expect(hardeningMigration).toContain(
      "alter table public.stripe_webhook_events enable row level security;",
    );
    expect(hardeningMigration).toContain(
      "revoke all on table public.stripe_webhook_events from public, anon, authenticated;",
    );
    expect(hardeningMigration).toContain(
      "grant select, insert, delete on table public.stripe_webhook_events to service_role;",
    );

    expect(hardeningMigration).toContain(
      "create or replace function public.reserve_monthly_upload_capacity",
    );
    expect(hardeningMigration).toMatch(/for update\s*;/);
    expect(hardeningMigration).toMatch(
      /uploaded_videos_count = counter\.uploaded_videos_count \+ 1/,
    );
    expect(hardeningMigration).toMatch(
      /grant execute on function public\.reserve_monthly_upload_capacity\(\s*uuid, timestamptz, timestamptz\s*\) to service_role;/,
    );

    expect(hardeningMigration).toContain(
      "create or replace function public.recover_stale_jobs",
    );
    expect(hardeningMigration).toMatch(
      /where status in \('generating', 'polling'\)\s+and updated_at < cutoff/,
    );
    expect(hardeningMigration).toMatch(
      /where status = 'running'\s+and updated_at < cutoff\s+returning workspace_id, track_id/,
    );
    expect(hardeningMigration).toMatch(
      /select render_counts\.recovered_count into stale_renders/,
    );
    expect(hardeningMigration).toMatch(
      /where status = 'uploading'\s+and updated_at < cutoff/,
    );
    expect(hardeningMigration).toContain(
      "create or replace function public.list_stale_temp_objects",
    );
    expect(hardeningMigration).toMatch(
      /where objects\.bucket_id = 'temp'\s+and objects\.created_at < now\(\) - make_interval\(days => greatest\(older_than_days, 1\)\)/,
    );
    expect(hardeningMigration).toMatch(
      /revoke execute on function public\.recover_stale_jobs\(integer\) from public, anon, authenticated;/,
    );
    expect(hardeningMigration).toMatch(
      /revoke execute on function public\.list_stale_temp_objects\(integer\) from public, anon, authenticated;/,
    );
    expect(hardeningMigration).toMatch(
      /grant execute on function public\.recover_stale_jobs\(integer\) to service_role;/,
    );
    expect(hardeningMigration).toMatch(
      /grant execute on function public\.list_stale_temp_objects\(integer\) to service_role;/,
    );
  });

  it("requires workspace manager access for publish-now RPC updates", async () => {
    const migration = await readFile(
      join(
        process.cwd(),
        "supabase/migrations/20260501054500_publish_youtube_upload_now.sql",
      ),
      "utf8",
    );

    expect(migration).toMatch(
      /and public\.can_manage_workspace\(target_workspace_id\)/,
    );
    expect(migration).not.toMatch(
      /from public\.workspace_members\s+where workspace_members\.workspace_id = target_workspace_id\s+and workspace_members\.user_id = acting_user_id/,
    );
  });
});
