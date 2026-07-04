import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
  Tables,
  TablesInsert,
} from "@/lib/database.types";
import type { GenerationRequestRepository } from "@/server/services/generation-request.service";
import { effectiveBillingPlan } from "@/server/services/plan-limits.service";
import {
  selectCount,
  selectMaybeSingle,
  selectSingle,
} from "@/server/services/supabase-query";
import {
  createUsageService,
  getCurrentUsagePeriod,
  type UsageRepository,
} from "@/server/services/usage.service";

type Supabase = SupabaseClient<Database>;

type IncrementUsageCounterRpcArgs = {
  connected_channels_delta?: number;
  generated_tracks_delta?: number;
  scheduled_uploads_delta?: number;
  target_period_end: string;
  target_period_start: string;
  target_workspace_id: string;
  uploaded_videos_delta?: number;
};

type IncrementUsageCounterRpcClient = {
  rpc(
    fn: "increment_usage_counter",
    args: IncrementUsageCounterRpcArgs,
  ): Promise<{
    data: Tables<"usage_counters"> | null;
    error: { message: string } | null;
  }>;
};

export function createGenerationRepository(
  supabase: Supabase,
): GenerationRequestRepository {
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
    async createGenerationRequest(input) {
      return selectSingle(
        supabase.from("generation_requests").insert(input).select("*").single(),
      );
    },
    async createPromptHistory(input) {
      return selectSingle(
        supabase.from("prompt_history").insert(input).select("*").single(),
      );
    },
    async createTrack(input: TablesInsert<"tracks">) {
      return selectSingle(
        supabase.from("tracks").insert(input).select("*").single(),
      );
    },
    async hasConnectedSunoAccount(workspaceId) {
      const count = await selectCount(
        supabase
          .from("suno_connections")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", "connected"),
      );

      return count > 0;
    },
    async getUsageSummary(workspaceId) {
      const period = getCurrentUsagePeriod();
      const [subscriptionResult, usageResult, channelsResult] =
        await Promise.all([
          supabase
            .from("subscriptions")
            .select("plan, status")
            .eq("workspace_id", workspaceId)
            .maybeSingle(),
          supabase
            .from("usage_counters")
            .select(
              "generated_tracks_count, uploaded_videos_count, scheduled_uploads_count",
            )
            .eq("workspace_id", workspaceId)
            .eq("period_start", period.periodStart)
            .eq("period_end", period.periodEnd)
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
        currentPlan: effectiveBillingPlan(
          subscriptionResult.data?.plan,
          subscriptionResult.data?.status,
        ),
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
      const data = await selectMaybeSingle(
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
      );

      return data ? effectiveBillingPlan(data.plan, data.status) : null;
    },
    async getUsageCounter(input) {
      return selectMaybeSingle(
        supabase
          .from("usage_counters")
          .select("*")
          .eq("workspace_id", input.workspaceId)
          .eq("period_start", input.periodStart)
          .eq("period_end", input.periodEnd)
          .maybeSingle(),
      );
    },
    async incrementUsageCounter(input) {
      const rpcClient = supabase as unknown as IncrementUsageCounterRpcClient;
      const { data, error } = await rpcClient.rpc("increment_usage_counter", {
        connected_channels_delta: input.deltas.connectedChannels ?? 0,
        generated_tracks_delta: input.deltas.generatedTracks ?? 0,
        scheduled_uploads_delta: input.deltas.scheduledUploads ?? 0,
        target_period_end: input.periodEnd,
        target_period_start: input.periodStart,
        target_workspace_id: input.workspaceId,
        uploaded_videos_delta: input.deltas.uploadedVideos ?? 0,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("increment_usage_counter returned no usage counter.");
      }

      return data;
    },
  };
}
