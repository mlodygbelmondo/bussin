import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import {
  selectMaybeSingle,
  selectRows,
  selectSingle,
} from "@/server/services/supabase-query";
import type { TrackRepository } from "@/server/services/track.service";

type Supabase = SupabaseClient<Database>;

export function createTrackRepository(supabase: Supabase): TrackRepository {
  return {
    async createAuditLog(input) {
      return selectSingle(
        supabase
          .from("audit_logs")
          .insert({
            ...input,
            metadata: (input.metadata ?? {}) as Json,
          })
          .select("*")
          .single(),
      );
    },
    async createVideoRender(input) {
      return selectSingle(
        supabase.from("video_renders").insert(input).select("*").single(),
      );
    },
    async getTrackById(input) {
      return selectMaybeSingle(
        supabase
          .from("tracks")
          .select("*")
          .eq("workspace_id", input.workspaceId)
          .eq("id", input.trackId)
          .maybeSingle(),
      );
    },
    async listTracks(workspaceId) {
      return selectRows(
        supabase.from("tracks").select("*").eq("workspace_id", workspaceId),
      );
    },
    async updateTrack(input) {
      return selectSingle(
        supabase
          .from("tracks")
          .update(input.values)
          .eq("id", input.trackId)
          .select("*")
          .single(),
      );
    },
  };
}
