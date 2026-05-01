import type { SupabaseClient } from "@supabase/supabase-js";
import {
  QUEUE_NAMES,
  type GenerationJobPayload,
  type QueueName,
  type QueuePayloadByName,
  type RenderJobPayload,
  type SunoPollingJobPayload,
  type YoutubeUploadJobPayload,
  parseQueuePayload,
} from "./queue-types";

export type QueueMessage<TPayload = unknown> = {
  id: string;
  queueName: QueueName;
  payload: TPayload;
  readCount: number;
  enqueuedAt: string;
};

export type ConsumeQueueOptions = {
  maxMessages: number;
  visibilityTimeoutSeconds: number;
};

export type QueueSendOptions = {
  delaySeconds?: number;
};

export type QueueClient = {
  send(
    queueName: QueueName,
    payload: QueuePayloadByName[QueueName],
    options?: QueueSendOptions,
  ): Promise<string>;
  read<TQueueName extends QueueName>(
    queueName: TQueueName,
    options: ConsumeQueueOptions,
  ): Promise<Array<QueueMessage<QueuePayloadByName[TQueueName]>>>;
  ack(queueName: QueueName, messageId: string): Promise<void>;
  retry(
    queueName: QueueName,
    messageId: string,
    delaySeconds: number,
  ): Promise<void>;
  fail(queueName: QueueName, messageId: string, reason: string): Promise<void>;
};

type StoredMessage = QueueMessage & {
  availableAt: number;
  failedReason?: string;
  visibleAfter: number;
};

export function createInMemoryQueueClient(input?: {
  now?: () => number;
}): QueueClient {
  const messages = new Map<string, StoredMessage>();
  const now = input?.now ?? (() => Date.now());
  let sequence = 0;

  return {
    async send(queueName, payload, options) {
      const id = String((sequence += 1));
      const currentTime = now();
      const parsed = parseQueuePayload(queueName, payload);

      messages.set(id, {
        id,
        queueName,
        payload: parsed,
        readCount: 0,
        enqueuedAt: new Date(currentTime).toISOString(),
        availableAt: currentTime + (options?.delaySeconds ?? 0) * 1000,
        visibleAfter: currentTime,
      });

      return id;
    },
    async read(queueName, options) {
      const currentTime = now();
      const visibleMessages = [...messages.values()]
        .filter(
          (message) =>
            message.queueName === queueName &&
            !message.failedReason &&
            message.availableAt <= currentTime &&
            message.visibleAfter <= currentTime,
        )
        .slice(0, options.maxMessages);

      for (const message of visibleMessages) {
        message.readCount += 1;
        message.visibleAfter =
          currentTime + options.visibilityTimeoutSeconds * 1000;
      }

      return visibleMessages.map((message) => ({
        id: message.id,
        queueName: message.queueName,
        payload: parseQueuePayload(queueName, message.payload),
        readCount: message.readCount,
        enqueuedAt: message.enqueuedAt,
      }));
    },
    async ack(_queueName, messageId) {
      messages.delete(messageId);
    },
    async retry(queueName, messageId, delaySeconds) {
      const message = messages.get(messageId);

      if (!message || message.queueName !== queueName) {
        return;
      }

      const nextVisibleAt = now() + delaySeconds * 1000;
      message.availableAt = nextVisibleAt;
      message.visibleAfter = nextVisibleAt;
    },
    async fail(queueName, messageId, reason) {
      const message = messages.get(messageId);

      if (!message || message.queueName !== queueName) {
        return;
      }

      message.failedReason = reason;
      messages.delete(messageId);
    },
  };
}

export function createSupabaseQueueClient(
  supabase: SupabaseClient,
): QueueClient {
  const rpcClient = supabase as unknown as SupabaseRpcClient;

  return {
    async send(queueName, payload, options) {
      const { data, error } = await rpcClient.rpc("worker_queue_send", {
        delay_seconds: options?.delaySeconds ?? 0,
        message: parseQueuePayload(queueName, payload),
        queue_name: queueName,
      });

      if (error) {
        throw new Error(error.message);
      }

      return String(data);
    },
    async read(queueName, options) {
      const { data, error } = await rpcClient.rpc("worker_queue_read", {
        max_messages: options.maxMessages,
        queue_name: queueName,
        visibility_timeout_seconds: options.visibilityTimeoutSeconds,
      });

      if (error) {
        throw new Error(error.message);
      }

      const rows = Array.isArray(data) ? data : [];

      return rows.map((message: SupabaseQueueMessage) => ({
        id: String(message.msg_id),
        queueName,
        payload: parseQueuePayload(queueName, message.message),
        readCount: message.read_ct,
        enqueuedAt: message.enqueued_at,
      }));
    },
    async ack(queueName, messageId) {
      const { error } = await rpcClient.rpc("worker_queue_ack", {
        message_id: Number(messageId),
        queue_name: queueName,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    async retry(queueName, messageId, delaySeconds) {
      const { error } = await rpcClient.rpc("worker_queue_retry", {
        delay_seconds: delaySeconds,
        message_id: Number(messageId),
        queue_name: queueName,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    async fail(queueName, messageId) {
      const { error } = await rpcClient.rpc("worker_queue_ack", {
        message_id: Number(messageId),
        queue_name: queueName,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

export function enqueueGenerationJob(
  queue: QueueClient,
  payload: GenerationJobPayload,
  options?: QueueSendOptions,
) {
  return queue.send(QUEUE_NAMES.generation, payload, options);
}

export function enqueueSunoPollingJob(
  queue: QueueClient,
  payload: SunoPollingJobPayload,
  options?: QueueSendOptions,
) {
  return queue.send(QUEUE_NAMES.sunoPolling, payload, options);
}

export function enqueueRenderJob(
  queue: QueueClient,
  payload: RenderJobPayload,
  options?: QueueSendOptions,
) {
  return queue.send(QUEUE_NAMES.render, payload, options);
}

export function enqueueYoutubeUploadJob(
  queue: QueueClient,
  payload: YoutubeUploadJobPayload,
  options?: QueueSendOptions,
) {
  return queue.send(QUEUE_NAMES.youtubeUpload, payload, options);
}

export function consumeQueue<TQueueName extends QueueName>(
  queue: QueueClient,
  queueName: TQueueName,
  options: ConsumeQueueOptions,
) {
  return queue.read(queueName, options);
}

export function ackMessage(queue: QueueClient, message: QueueMessage) {
  return queue.ack(message.queueName, message.id);
}

export function retryMessage(
  queue: QueueClient,
  message: QueueMessage,
  delaySeconds: number,
) {
  return queue.retry(message.queueName, message.id, delaySeconds);
}

export function failMessage(
  queue: QueueClient,
  message: QueueMessage,
  reason: string,
) {
  return queue.fail(message.queueName, message.id, reason);
}

type SupabaseRpcClient = {
  rpc(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<{
    data: null | string | number | SupabaseQueueMessage[];
    error: { message: string } | null;
  }>;
};

type SupabaseQueueMessage = {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: unknown;
};
