import type { Tables, TablesInsert } from "@/lib/database.types";
import type { AuditLogAction } from "@/server/services/audit-log.service";
import { composePrompt } from "@/server/services/prompt-composer.service";
import { checkPlanLimit } from "@/server/services/plan-limits.service";
import { ServiceError } from "@/server/services/service-error";
import {
  createGenerationRequestSchema,
  type CreateGenerationRequestInput,
} from "@/server/validators/generation.validator";

export type GenerationRequestRecord = Partial<Tables<"generation_requests">> & {
  id: string;
  workspace_id: string;
  status: string;
};

export type TrackRecord = Partial<Tables<"tracks">> & {
  id: string;
  workspace_id: string;
  status: string;
};

export type GenerationQueuePort = {
  enqueueGenerationJob(input: {
    workspaceId: string;
    generationRequestId: string;
    trackId: string;
  }): Promise<void>;
};

export type GenerationRequestRepository = {
  createAuditLog(input: {
    workspace_id: string;
    user_id?: string | null;
    action: AuditLogAction;
    entity_type?: string | null;
    entity_id?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
  createGenerationRequest(
    input: TablesInsert<"generation_requests">,
  ): Promise<GenerationRequestRecord>;
  createPromptHistory(
    input: TablesInsert<"prompt_history">,
  ): Promise<Partial<Tables<"prompt_history">>>;
  createTrack(input: TablesInsert<"tracks">): Promise<TrackRecord>;
  getUsageSummary(workspaceId: string): Promise<{
    currentPlan: string;
    monthlyGenerationRequests: number;
    monthlyUploads: number;
    scheduledUploads: number;
    youtubeChannels: number;
  }>;
  hasConnectedSunoAccount(workspaceId: string): Promise<boolean>;
  incrementGeneratedTracks(
    workspaceId: string,
    amount: number,
  ): Promise<unknown>;
};

export function createGenerationRequestService(input: {
  repository: GenerationRequestRepository;
  queue: GenerationQueuePort;
}) {
  return {
    async create(params: {
      workspaceId: string;
      createdByUserId: string;
      input: CreateGenerationRequestInput;
    }) {
      const parsed = createGenerationRequestSchema.parse(params.input);
      const sunoConnected = await input.repository.hasConnectedSunoAccount(
        params.workspaceId,
      );

      if (!sunoConnected) {
        throw new ServiceError(
          "SUNO_NOT_CONNECTED",
          "Connect your Suno account before generating tracks.",
        );
      }

      const usage = await input.repository.getUsageSummary(params.workspaceId);
      const limit = checkPlanLimit({
        currentPlan: usage.currentPlan,
        metric: "monthlyGenerationRequests",
        currentUsage: usage.monthlyGenerationRequests,
        requestedUsage: parsed.track_count,
      });

      if (!limit.allowed) {
        throw new ServiceError("PLAN_LIMIT_EXCEEDED", limit.reason, limit);
      }

      const prompt = composePrompt(parsed);
      const request = await input.repository.createGenerationRequest({
        workspace_id: params.workspaceId,
        created_by_user_id: params.createdByUserId,
        style: parsed.style,
        mood: parsed.mood,
        duration_seconds: parsed.duration_seconds,
        track_count: parsed.track_count,
        target_youtube_channel_id: parsed.target_youtube_channel_id,
        image_asset_id: parsed.image_asset_id,
        publish_mode: parsed.publish_mode,
        scheduled_at: parsed.scheduled_at,
        status: "queued",
        prompt_summary: prompt.prompt_summary,
        final_prompt: prompt.final_prompt,
        suno_options: parsed.suno_options,
      });
      const tracks: TrackRecord[] = [];

      for (let index = 0; index < parsed.track_count; index += 1) {
        const track = await input.repository.createTrack({
          workspace_id: params.workspaceId,
          generation_request_id: request.id,
          title: `${prompt.title_seed} ${index + 1}`,
          style: parsed.style,
          mood: parsed.mood,
          duration_seconds: parsed.duration_seconds,
          image_asset_id: parsed.image_asset_id,
          tags: prompt.suggested_tags,
          status: "draft",
        });
        tracks.push(track);

        await input.queue.enqueueGenerationJob({
          workspaceId: params.workspaceId,
          generationRequestId: request.id,
          trackId: track.id,
        });
      }

      await input.repository.createPromptHistory({
        workspace_id: params.workspaceId,
        generation_request_id: request.id,
        style: parsed.style,
        mood: parsed.mood,
        duration_seconds: parsed.duration_seconds,
        track_count: parsed.track_count,
        final_prompt: prompt.final_prompt,
      });

      await input.repository.createAuditLog({
        workspace_id: params.workspaceId,
        user_id: params.createdByUserId,
        action: "generation.created",
        entity_type: "generation_request",
        entity_id: request.id,
        metadata: {
          track_count: parsed.track_count,
          publish_mode: parsed.publish_mode,
        },
      });
      await input.repository.incrementGeneratedTracks(
        params.workspaceId,
        parsed.track_count,
      );

      return { prompt, request, tracks };
    },
  };
}
