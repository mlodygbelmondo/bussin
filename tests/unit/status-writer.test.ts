import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { InvalidStatusTransitionError } from "@/server/services/status-transition.service";
import {
  createStatusWriter,
  StatusRowNotFoundError,
} from "@/server/services/status-writer.service";

const workspaceId = "11111111-1111-4111-8111-111111111111";

type Row = Record<string, unknown>;

function createFakeSupabase(tables: Record<string, Row[]>) {
  const client = {
    from(table: string) {
      const rows = tables[table] ?? [];
      const makeQuery = (values?: Row) => {
        const filters: Array<(row: Row) => boolean> = [];
        const run = () => {
          const matched = rows.filter((row) =>
            filters.every((filter) => filter(row)),
          );

          if (values) {
            for (const row of matched) {
              Object.assign(row, values);
            }
          }

          return matched;
        };
        const query = {
          eq(column: string, value: unknown) {
            filters.push((row) => row[column] === value);
            return query;
          },
          in(column: string, allowed: unknown[]) {
            filters.push((row) => allowed.includes(row[column]));
            return query;
          },
          maybeSingle() {
            return Promise.resolve({ data: run()[0] ?? null, error: null });
          },
          select() {
            return query;
          },
          then(
            resolve: (result: { data: Row[]; error: null }) => unknown,
          ): unknown {
            return resolve({ data: run(), error: null });
          },
        };

        return query;
      };

      return {
        select: () => makeQuery(),
        update: (values: Row) => makeQuery(values),
      };
    },
  };

  return client as unknown as SupabaseClient<Database>;
}

describe("status writer", () => {
  it("refuses an illegal transition and leaves the row untouched", async () => {
    const track = {
      id: "track-1",
      status: "uploaded",
      workspace_id: workspaceId,
    };
    const writer = createStatusWriter(createFakeSupabase({ tracks: [track] }));

    await expect(
      writer.updateTrackStatus({
        status: "draft",
        trackId: "track-1",
        workspaceId,
      }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionError);
    expect(track.status).toBe("uploaded");
  });

  it("applies a legal transition and writes the failure reason", async () => {
    const track = {
      failure_reason: "Suno generation failed.",
      id: "track-1",
      status: "failed",
      workspace_id: workspaceId,
    };
    const writer = createStatusWriter(createFakeSupabase({ tracks: [track] }));

    await writer.updateTrackStatus({
      failureReason: null,
      status: "draft",
      trackId: "track-1",
      workspaceId,
    });

    expect(track.status).toBe("draft");
    expect(track.failure_reason).toBeNull();
  });

  it("stamps started_at when a render moves to running", async () => {
    const render = {
      id: "render-1",
      started_at: null,
      status: "queued",
      workspace_id: workspaceId,
    };
    const writer = createStatusWriter(
      createFakeSupabase({ video_renders: [render] }),
    );

    await writer.updateVideoRenderStatus({
      status: "running",
      videoRenderId: "render-1",
      workspaceId,
    });

    expect(render.status).toBe("running");
    expect(render.started_at).toEqual(expect.any(String));
  });

  it("throws when the row does not exist in the workspace", async () => {
    const writer = createStatusWriter(createFakeSupabase({ tracks: [] }));

    await expect(
      writer.updateTrackStatus({
        status: "failed",
        trackId: "missing",
        workspaceId,
      }),
    ).rejects.toBeInstanceOf(StatusRowNotFoundError);
  });

  it("bulk-transitions only rows in the allowed from set", async () => {
    const failedTrack = {
      id: "track-1",
      status: "failed",
      workspace_id: workspaceId,
    };
    const readyTrack = {
      id: "track-2",
      status: "preview_ready",
      workspace_id: workspaceId,
    };
    const writer = createStatusWriter(
      createFakeSupabase({ tracks: [failedTrack, readyTrack] }),
    );

    const updated = await writer.transitionTracks({
      from: ["failed"],
      status: "draft",
      trackIds: ["track-1", "track-2"],
      workspaceId,
    });

    expect(updated).toEqual(["track-1"]);
    expect(failedTrack.status).toBe("draft");
    expect(readyTrack.status).toBe("preview_ready");
  });

  it("refuses a bulk transition whose from set contains an illegal pair", async () => {
    const writer = createStatusWriter(createFakeSupabase({ tracks: [] }));

    await expect(
      writer.transitionTracks({
        from: ["uploaded"],
        status: "draft",
        trackIds: ["track-1"],
        workspaceId,
      }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionError);
  });
});
