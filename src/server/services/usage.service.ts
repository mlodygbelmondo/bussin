import type { Tables } from "@/lib/database.types";

export type UsageCounter = Tables<"usage_counters">;

export type UsageSummary = {
  currentPlan: string;
  monthlyGenerationRequests: number;
  monthlyUploads: number;
  scheduledUploads: number;
  youtubeChannels: number;
};

export type UsageCounterDeltas = {
  generatedTracks?: number;
  uploadedVideos?: number;
  connectedChannels?: number;
  scheduledUploads?: number;
};

export type UsageRepository = {
  getCurrentPlan(workspaceId: string): Promise<string | null>;
  getUsageCounter(input: {
    workspaceId: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<UsageCounter | null>;
  incrementUsageCounter(input: {
    workspaceId: string;
    periodStart: string;
    periodEnd: string;
    deltas: UsageCounterDeltas;
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
      return incrementCounter(repository, workspaceId, {
        generatedTracks: amount,
      });
    },
    incrementUploadedVideos(workspaceId: string, amount = 1) {
      return incrementCounter(repository, workspaceId, {
        uploadedVideos: amount,
      });
    },
    incrementConnectedChannels(workspaceId: string, amount = 1) {
      return incrementCounter(repository, workspaceId, {
        connectedChannels: amount,
      });
    },
    incrementScheduledUploads(workspaceId: string, amount = 1) {
      return incrementCounter(repository, workspaceId, {
        scheduledUploads: amount,
      });
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

function incrementCounter(
  repository: UsageRepository,
  workspaceId: string,
  deltas: UsageCounterDeltas,
) {
  // Single atomic upsert via the increment_usage_counter RPC; the previous
  // read-then-write pattern lost increments under concurrent requests.
  return repository.incrementUsageCounter({
    workspaceId,
    ...getCurrentUsagePeriod(),
    deltas,
  });
}
