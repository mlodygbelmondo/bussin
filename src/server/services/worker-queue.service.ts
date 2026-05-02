import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkerQueueName =
  | "generation-jobs"
  | "render-jobs"
  | "youtube-upload-jobs";

export type WorkerQueueMessage = Record<string, string>;

type WorkerQueueRpcClient = SupabaseClient & {
  rpc(
    fn: "worker_queue_send",
    args: {
      delay_seconds: number;
      message: WorkerQueueMessage;
      queue_name: WorkerQueueName;
    },
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function enqueueWorkerQueueJob(input: {
  delaySeconds?: number;
  message: WorkerQueueMessage;
  queueName: WorkerQueueName;
}) {
  const { error } = await (createAdminClient() as WorkerQueueRpcClient).rpc(
    "worker_queue_send",
    {
      delay_seconds: input.delaySeconds ?? 0,
      message: input.message,
      queue_name: input.queueName,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}
