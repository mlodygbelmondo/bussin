import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";
import type { GenerationRequestRepository } from "@/server/services/generation-request.service";
import {
  createUsageService,
  type UsageRepository,
} from "@/server/services/usage.service";

type Supabase = SupabaseClient<Database>;

export function createGenerationRepository(
  supabase: Supabase,
): GenerationRequestRepository {
  return {
    async createAuditLog(input) {
      const { data, error } = await supabase
        .from("audit_logs")
        .insert({
          ...input,
          metadata: (input.metadata ?? {}) as Json,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async createGenerationRequest(input) {
      const { data, error } = await supabase
        .from("generation_requests")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async createPromptHistory(input) {
      const { data, error } = await supabase
        .from("prompt_history")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async createTrack(input: TablesInsert<"tracks">) {
      const { data, error } = await supabase
        .from("tracks")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async getUsageSummary(workspaceId) {
      const [subscriptionResult, usageResult, channelsResult] =
        await Promise.all([
          supabase
            .from("subscriptions")
            .select("plan")
            .eq("workspace_id", workspaceId)
            .maybeSingle(),
          supabase
            .from("usage_counters")
            .select(
              "generated_tracks_count, uploaded_videos_count, scheduled_uploads_count",
            )
            .eq("workspace_id", workspaceId)
            .order("period_start", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("youtube_channels")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId),
        ]);

      for (const result of [subscriptionResult, usageResult, channelsResult]) {
        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      return {
        currentPlan: subscriptionResult.data?.plan ?? "trial",
        monthlyGenerationRequests:
          usageResult.data?.generated_tracks_count ?? 0,
        monthlyUploads: usageResult.data?.uploaded_videos_count ?? 0,
        scheduledUploads: usageResult.data?.scheduled_uploads_count ?? 0,
        youtubeChannels: channelsResult.count ?? 0,
      };
    },
    incrementGeneratedTracks(workspaceId, amount) {
      return createUsageService(
        createUsageRepository(supabase),
      ).incrementGeneratedTracks(workspaceId, amount);
    },
  };
}

export function createUsageRepository(supabase: Supabase): UsageRepository {
  return {
    async getCurrentPlan(workspaceId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data?.plan ?? null;
    },
    async getUsageCounter(input) {
      const { data, error } = await supabase
        .from("usage_counters")
        .select("*")
        .eq("workspace_id", input.workspaceId)
        .eq("period_start", input.periodStart)
        .eq("period_end", input.periodEnd)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async upsertUsageCounter(input: TablesInsert<"usage_counters">) {
      const { data, error } = await supabase
        .from("usage_counters")
        .upsert(input, {
          onConflict: "workspace_id,period_start,period_end",
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    async updateUsageCounter(input: {
      id: string;
      values: TablesUpdate<"usage_counters">;
    }) {
      const { data, error } = await supabase
        .from("usage_counters")
        .update(input.values)
        .eq("id", input.id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  };
}
