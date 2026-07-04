/**
 * Guarded status writes — the canonical way to write any status column.
 *
 * Every method reads the row's current status, asserts the move against the
 * status vocabulary (status-transition.service), then applies a conditional
 * update that only lands if the status has not changed underneath us. The
 * bulk `transition*` helpers instead take an explicit `from` list, assert
 * every from -> status pair up front, and filter the set-based update to
 * those statuses, so an illegal transition cannot be expressed.
 *
 * Shared by app code and the worker. The worker's tsx runtime does not
 * resolve the `@/` alias, so this file must only use relative imports.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "../../lib/database.types";
import {
  assertStatusTransition,
  type GenerationRequestStatus,
  type StatusEntity,
  type TrackStatus,
  type VideoRenderStatus,
  type YoutubeUploadStatus,
} from "./status-transition.service";

type Client = SupabaseClient<Database>;

type StatusTable =
  | "generation_requests"
  | "tracks"
  | "video_renders"
  | "youtube_uploads";

/** Video render statuses that stamp `finished_at` when entered. */
const FINISHED_RENDER_STATUSES: VideoRenderStatus[] = [
  "failed",
  "rendered",
  "completed",
];

export class StatusRowNotFoundError extends Error {
  constructor(entity: StatusEntity, id: string) {
    super(`No ${entity} row found for id ${id}.`);
    this.name = "StatusRowNotFoundError";
  }
}

export class StaleStatusError extends Error {
  constructor(entity: StatusEntity, id: string) {
    super(`Status of ${entity} row ${id} changed before the update landed.`);
    this.name = "StaleStatusError";
  }
}

export type StatusWriter = ReturnType<typeof createStatusWriter>;

export function createStatusWriter(client: Client) {
  async function readCurrentStatus(input: {
    table: StatusTable;
    id: string;
    workspaceId: string;
  }): Promise<string> {
    const { data, error } = await client
      .from(input.table)
      .select("status")
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new StatusRowNotFoundError(input.table, input.id);
    }

    return data.status;
  }

  async function applyGuardedUpdate(input: {
    table: StatusTable;
    id: string;
    workspaceId: string;
    fromStatus: string;
    values: Record<string, unknown>;
  }) {
    const { data, error } = await client
      .from(input.table)
      // The concrete update payload is typed by each public method below.
      .update(input.values as never)
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.id)
      .eq("status", input.fromStatus)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new StaleStatusError(input.table, input.id);
    }
  }

  async function guardedSingleUpdate(input: {
    table: StatusTable;
    id: string;
    workspaceId: string;
    status: string;
    values: Record<string, unknown>;
  }) {
    const current = await readCurrentStatus({
      id: input.id,
      table: input.table,
      workspaceId: input.workspaceId,
    });

    assertStatusTransition(input.table, current, input.status);
    await applyGuardedUpdate({
      fromStatus: current,
      id: input.id,
      table: input.table,
      values: input.values,
      workspaceId: input.workspaceId,
    });
  }

  return {
    async updateGenerationRequestStatus(input: {
      workspaceId: string;
      generationRequestId: string;
      status: GenerationRequestStatus;
      failureReason?: string | null;
    }) {
      const values: TablesUpdate<"generation_requests"> = {
        status: input.status,
      };

      if (input.failureReason !== undefined) {
        values.failure_reason = input.failureReason;
      }

      await guardedSingleUpdate({
        id: input.generationRequestId,
        status: input.status,
        table: "generation_requests",
        values,
        workspaceId: input.workspaceId,
      });
    },
    async updateTrackStatus(input: {
      workspaceId: string;
      trackId: string;
      status: TrackStatus;
      failureReason?: string | null;
    }) {
      const values: TablesUpdate<"tracks"> = { status: input.status };

      if (input.failureReason !== undefined) {
        values.failure_reason = input.failureReason;
      }

      await guardedSingleUpdate({
        id: input.trackId,
        status: input.status,
        table: "tracks",
        values,
        workspaceId: input.workspaceId,
      });
    },
    async updateVideoRenderStatus(input: {
      workspaceId: string;
      videoRenderId: string;
      status: VideoRenderStatus;
      failureReason?: string | null;
    }) {
      const values: TablesUpdate<"video_renders"> = { status: input.status };

      if (input.failureReason !== undefined) {
        values.failure_reason = input.failureReason;
      }

      if (input.status === "running") {
        values.started_at = new Date().toISOString();
        // A retry re-enters running on a row whose previous attempt already
        // stamped finished_at; clear it or the new started_at violates the
        // finished-after-started check constraint.
        values.finished_at = null;
      }

      if (FINISHED_RENDER_STATUSES.includes(input.status)) {
        values.finished_at = new Date().toISOString();
      }

      await guardedSingleUpdate({
        id: input.videoRenderId,
        status: input.status,
        table: "video_renders",
        values,
        workspaceId: input.workspaceId,
      });
    },
    async updateYoutubeUploadStatus(input: {
      workspaceId: string;
      youtubeUploadId: string;
      status: YoutubeUploadStatus;
      failureReason?: string | null;
    }) {
      const values: TablesUpdate<"youtube_uploads"> = { status: input.status };

      if (input.failureReason !== undefined) {
        values.failure_reason = input.failureReason;
      }

      await guardedSingleUpdate({
        id: input.youtubeUploadId,
        status: input.status,
        table: "youtube_uploads",
        values,
        workspaceId: input.workspaceId,
      });
    },
    /**
     * Moves every listed track whose status is in `from` into `status`.
     * Returns the ids that were actually updated.
     */
    async transitionTracks(input: {
      workspaceId: string;
      trackIds: string[];
      from: TrackStatus[];
      status: TrackStatus;
      failureReason?: string | null;
    }): Promise<string[]> {
      for (const from of input.from) {
        assertStatusTransition("tracks", from, input.status);
      }

      if (input.trackIds.length === 0) {
        return [];
      }

      const values: TablesUpdate<"tracks"> = { status: input.status };

      if (input.failureReason !== undefined) {
        values.failure_reason = input.failureReason;
      }

      const { data, error } = await client
        .from("tracks")
        .update(values)
        .eq("workspace_id", input.workspaceId)
        .in("id", input.trackIds)
        .in("status", input.from)
        .select("id");

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => row.id);
    },
    /** Same as transitionTracks, for the video renders of the given tracks. */
    async transitionRendersForTracks(input: {
      workspaceId: string;
      trackIds: string[];
      from: VideoRenderStatus[];
      status: VideoRenderStatus;
      failureReason?: string | null;
    }): Promise<string[]> {
      for (const from of input.from) {
        assertStatusTransition("video_renders", from, input.status);
      }

      if (input.trackIds.length === 0) {
        return [];
      }

      const values: TablesUpdate<"video_renders"> = { status: input.status };

      if (input.failureReason !== undefined) {
        values.failure_reason = input.failureReason;
      }

      const { data, error } = await client
        .from("video_renders")
        .update(values)
        .eq("workspace_id", input.workspaceId)
        .in("track_id", input.trackIds)
        .in("status", input.from)
        .select("id");

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => row.id);
    },
    /** Same as transitionTracks, for the YouTube uploads of the given tracks. */
    async transitionUploadsForTracks(input: {
      workspaceId: string;
      trackIds: string[];
      from: YoutubeUploadStatus[];
      status: YoutubeUploadStatus;
      failureReason?: string | null;
    }): Promise<string[]> {
      for (const from of input.from) {
        assertStatusTransition("youtube_uploads", from, input.status);
      }

      if (input.trackIds.length === 0) {
        return [];
      }

      const values: TablesUpdate<"youtube_uploads"> = { status: input.status };

      if (input.failureReason !== undefined) {
        values.failure_reason = input.failureReason;
      }

      const { data, error } = await client
        .from("youtube_uploads")
        .update(values)
        .eq("workspace_id", input.workspaceId)
        .in("track_id", input.trackIds)
        .in("status", input.from)
        .select("id");

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => row.id);
    },
  };
}
