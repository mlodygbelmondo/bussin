// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260501053000_workspace_settings.sql",
);
const grantsMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260703010000_restore_workspace_settings_grants.sql",
);

describe("workspace settings migration", () => {
  it("adds workspace-scoped settings with RLS policies", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("create table public.workspace_settings");
    expect(migration).toContain(
      "workspace_id uuid primary key references public.workspaces(id) on delete cascade",
    );
    expect(migration).toMatch(
      /alter table public\.workspace_settings enable row level security;/,
    );
    expect(migration).toMatch(
      /create policy "members read workspace settings"\s+on public\.workspace_settings for select\s+to authenticated\s+using \(public\.is_workspace_member\(workspace_id\)\);/,
    );
    expect(migration).toMatch(
      /create policy "owners and admins update workspace settings"\s+on public\.workspace_settings for update\s+to authenticated\s+using \(public\.can_manage_workspace\(workspace_id\)\)\s+with check \(public\.can_manage_workspace\(workspace_id\)\);/,
    );
  });

  it("keeps default references inside the same workspace", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toMatch(
      /foreign key \(workspace_id, default_youtube_channel_id\)\s+references public\.youtube_channels\(workspace_id, id\)/,
    );
    expect(migration).toContain(
      "on delete set null (default_youtube_channel_id)",
    );
    expect(migration).toMatch(
      /foreign key \(workspace_id, default_image_asset_id\)\s+references public\.image_assets\(workspace_id, id\)/,
    );
    expect(migration).toContain("on delete set null (default_image_asset_id)");
  });

  it("restores table grants required by workspace settings RLS policies", async () => {
    const migration = await readFile(grantsMigrationPath, "utf8");

    expect(migration).toContain(
      "grant select, insert, update, delete\non table public.workspace_settings\nto authenticated;",
    );
    expect(migration).toContain(
      "grant all\non table public.workspace_settings\nto service_role;",
    );
  });
});
