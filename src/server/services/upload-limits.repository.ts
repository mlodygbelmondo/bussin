import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { effectiveBillingPlan } from "@/server/services/plan-limits.service";
import {
  selectCount,
  selectMaybeSingle,
} from "@/server/services/supabase-query";
import type { UploadLimitsRepository } from "@/server/services/upload-limits.service";
import { getCurrentUsagePeriod } from "@/server/services/usage.service";

type Supabase = SupabaseClient<Database>;

export function createUploadLimitsRepository(
  supabase: Supabase,
): UploadLimitsRepository {
  return {
    async countScheduledUploads(workspaceId) {
      return selectCount(
        supabase
          .from("youtube_uploads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", "scheduled"),
      );
    },
    async getEffectivePlan(workspaceId) {
      const data = await selectMaybeSingle(
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
      );

      return data ? effectiveBillingPlan(data.plan, data.status) : null;
    },
    async getMonthlyUploadedCount(workspaceId) {
      const period = getCurrentUsagePeriod();
      const data = await selectMaybeSingle(
        supabase
          .from("usage_counters")
          .select("uploaded_videos_count")
          .eq("workspace_id", workspaceId)
          .eq("period_start", period.periodStart)
          .eq("period_end", period.periodEnd)
          .maybeSingle(),
      );

      return data?.uploaded_videos_count ?? 0;
    },
    async getMonthlyPendingUploadCount(workspaceId) {
      const period = getCurrentUsagePeriod();

      return selectCount(
        supabase
          .from("youtube_uploads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .is("scheduled_at", null)
          .gte("created_at", period.periodStart)
          .lt("created_at", period.periodEnd)
          .in("status", ["draft", "uploading"]),
      );
    },
  };
}
