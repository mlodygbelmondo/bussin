import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

export type UsageCounter = Tables<"usage_counters">;

export type UsageSummary = {
  currentPlan: string;
  monthlyGenerationRequests: number;
  monthlyUploads: number;
  scheduledUploads: number;
  youtubeChannels: number;
};

export type UsageRepository = {
  getCurrentPlan(workspaceId: string): Promise<string | null>;
  getUsageCounter(input: {
    workspaceId: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<UsageCounter | null>;
  upsertUsageCounter(
    input: TablesInsert<"usage_counters">,
  ): Promise<UsageCounter>;
  updateUsageCounter(input: {
    id: string;
    values: TablesUpdate<"usage_counters">;
  }): Promise<UsageCounter>;
};

export function createUsageService(repository: UsageRepository) {
  return {
    getCurrentUsagePeriod,
    async getUsageSummary(workspaceId: string, now = new Date()) {
      const period = getCurrentUsagePeriod(now);
      const [plan, counter] = await Promise.all([
        repository.getCurrentPlan(workspaceId),
        repository.getUsageCounter({ workspaceId, ...period }),
      ]);

      return {
        currentPlan: plan ?? "trial",
        monthlyGenerationRequests: counter?.generated_tracks_count ?? 0,
        monthlyUploads: counter?.uploaded_videos_count ?? 0,
        scheduledUploads: counter?.scheduled_uploads_count ?? 0,
        youtubeChannels: counter?.connected_channels_count ?? 0,
      } satisfies UsageSummary;
    },
    incrementGeneratedTracks(workspaceId: string, amount = 1) {
      return incrementCounter(
        repository,
        workspaceId,
        "generated_tracks_count",
        amount,
      );
    },
    incrementUploadedVideos(workspaceId: string, amount = 1) {
      return incrementCounter(
        repository,
        workspaceId,
        "uploaded_videos_count",
        amount,
      );
    },
    incrementConnectedChannels(workspaceId: string, amount = 1) {
      return incrementCounter(
        repository,
        workspaceId,
        "connected_channels_count",
        amount,
      );
    },
    incrementScheduledUploads(workspaceId: string, amount = 1) {
      return incrementCounter(
        repository,
        workspaceId,
        "scheduled_uploads_count",
        amount,
      );
    },
  };
}

export function getCurrentUsagePeriod(now = new Date()) {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

async function incrementCounter(
  repository: UsageRepository,
  workspaceId: string,
  field:
    | "generated_tracks_count"
    | "uploaded_videos_count"
    | "connected_channels_count"
    | "scheduled_uploads_count",
  amount: number,
) {
  const period = getCurrentUsagePeriod();
  const existing = await repository.getUsageCounter({ workspaceId, ...period });

  if (!existing) {
    return repository.upsertUsageCounter({
      workspace_id: workspaceId,
      period_start: period.periodStart,
      period_end: period.periodEnd,
      [field]: amount,
    });
  }

  return repository.updateUsageCounter({
    id: existing.id,
    values: {
      [field]: existing[field] + amount,
    },
  });
}
