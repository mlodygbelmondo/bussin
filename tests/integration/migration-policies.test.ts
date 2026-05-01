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
});
