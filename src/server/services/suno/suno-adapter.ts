import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import {
  normalizeSunoError,
  SunoIntegrationError,
} from "@/server/services/suno/suno.errors";
import type {
  SunoAdapter,
  SunoGenerationInput,
  SunoTrack,
  SunoTrackStatus,
} from "@/server/services/suno/suno.types";

const sunoGenerationInputSchema = z
  .object({
    callbackUrl: z.string().url().optional(),
    finalPrompt: z.string().trim().min(1).max(5000),
    makeInstrumental: z.boolean(),
    style: z.string().trim().min(1).max(1000),
    title: z.string().trim().min(1).max(100),
    waitAudio: z.boolean(),
  })
  .strict();

export function validateSunoGenerationInput(input: SunoGenerationInput) {
  return sunoGenerationInputSchema.parse(input);
}

export function createSunoAdapter(input: {
  apiUrl: string;
  credential: string;
  fetch?: typeof fetch;
  model?: string;
  timeoutMs?: number;
}): SunoAdapter {
  const baseUrl = new URL(input.apiUrl);
  const fetchImpl = input.fetch ?? fetch;
  const model = input.model ?? "V4_5";
  const timeoutMs = input.timeoutMs ?? 30_000;
  const validateNetwork = !input.fetch;

  return {
    async createCustomGeneration(rawInput) {
      const parsed = validateSunoGenerationInput(rawInput);
      const body = await requestJson<SunoGenerateResponse>({
        baseUrl,
        body: {
          callBackUrl: parsed.callbackUrl,
          customMode: true,
          instrumental: parsed.makeInstrumental,
          make_instrumental: parsed.makeInstrumental,
          model,
          prompt: parsed.finalPrompt,
          style: parsed.style,
          title: parsed.title,
          waitAudio: parsed.waitAudio,
          wait_audio: parsed.waitAudio,
        },
        credential: input.credential,
        fetchImpl,
        method: "POST",
        path: "/api/v1/generate",
        timeoutMs,
        validateNetwork,
      });
      const sunoTrackId =
        body.data?.taskId ?? body.data?.id ?? body.taskId ?? body.id;

      if (!sunoTrackId) {
        throw new SunoIntegrationError(
          "invalid_response",
          "Suno generation response did not include a task id.",
          body,
        );
      }

      return { sunoTrackId };
    },
    async getLimits() {
      const body = await requestJson<SunoCreditsResponse>({
        baseUrl,
        credential: input.credential,
        fetchImpl,
        method: "GET",
        path: "/api/v1/generate/credit",
        timeoutMs,
        validateNetwork,
      });
      const creditsData = body.data;
      const credits =
        typeof creditsData === "number"
          ? creditsData
          : (creditsData?.credits ?? null);

      return {
        creditsLeft: credits,
        monthlyLimit:
          typeof creditsData === "number"
            ? null
            : (creditsData?.monthlyLimit ?? null),
        monthlyUsage:
          typeof creditsData === "number"
            ? null
            : (creditsData?.monthlyUsage ?? null),
      };
    },
    async getTrackById(sunoTrackId) {
      const status = await this.getTrackStatus({ sunoTrackId });

      if (status.status === "ready") {
        return status.track;
      }

      return {
        id: sunoTrackId,
        status: status.status,
      };
    },
    async getTrackStatus({ sunoTrackId }) {
      const params = new URLSearchParams({ taskId: sunoTrackId });
      const body = await requestJson<SunoRecordInfoResponse>({
        baseUrl,
        credential: input.credential,
        fetchImpl,
        method: "GET",
        path: `/api/v1/generate/record-info?${params.toString()}`,
        timeoutMs,
        validateNetwork,
      });

      return parseTrackStatus(body, sunoTrackId);
    },
    async testConnection() {
      const limits = await this.getLimits();
      return { limits, ok: true };
    },
  };
}

function parseTrackStatus(
  body: SunoRecordInfoResponse,
  fallbackId: string,
): SunoTrackStatus {
  const status = body.data?.status;
  const failureReason =
    body.data?.errorMessage ?? body.data?.errorCode ?? body.msg ?? null;
  const trackBody = body.data?.response?.sunoData?.[0];
  const audioUrl = trackBody?.audioUrl ?? trackBody?.audio_url;

  // CALLBACK_EXCEPTION means Suno could not deliver its callback, not that
  // generation failed — we poll for results, so if the audio is there the
  // track is done.
  const readyDespiteCallbackFailure =
    status === "CALLBACK_EXCEPTION" && Boolean(audioUrl);

  if (
    status &&
    !readyDespiteCallbackFailure &&
    [
      "CREATE_TASK_FAILED",
      "GENERATE_AUDIO_FAILED",
      "CALLBACK_EXCEPTION",
    ].includes(status)
  ) {
    return {
      failureReason: failureReason ?? "Suno generation failed.",
      raw: body,
      status: "failed",
    };
  }

  if (status !== "SUCCESS" && !readyDespiteCallbackFailure) {
    return { raw: body, status: "processing" };
  }

  if (!audioUrl) {
    throw new SunoIntegrationError(
      "invalid_response",
      "Suno success response did not include an audio URL.",
      body,
    );
  }

  const track: SunoTrack = {
    audioUrl,
    durationSeconds: trackBody?.duration ?? null,
    id: trackBody?.id ?? fallbackId,
    imageUrl: trackBody?.imageUrl ?? null,
    status: "ready",
    title: trackBody?.title ?? null,
  };

  return { audioUrl, raw: body, status: "ready", track };
}

async function requestJson<T>(input: {
  baseUrl: URL;
  body?: Record<string, unknown>;
  credential: string;
  fetchImpl: typeof fetch;
  method: "GET" | "POST";
  path: string;
  timeoutMs: number;
  validateNetwork: boolean;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const requestUrl = new URL(input.path, input.baseUrl);

  try {
    if (input.validateNetwork) {
      await assertSafeOutboundUrl(requestUrl);
    }

    const response = await input.fetchImpl(requestUrl.toString(), {
      body: input.body ? JSON.stringify(input.body) : undefined,
      headers: buildHeaders(input.credential, Boolean(input.body)),
      method: input.method,
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as
      | (T & { code?: number; msg?: string })
      | null;

    if (!response.ok || body?.code === 401 || body?.code === 429) {
      throw normalizeSunoError({
        code: body?.code ?? response.status,
        message: body?.msg ?? response.statusText,
        status: response.status,
      });
    }

    if (!body) {
      throw new SunoIntegrationError(
        "invalid_response",
        "Suno response was not JSON.",
      );
    }

    if (typeof body.code === "number" && body.code !== 200) {
      throw normalizeSunoError({ code: body.code, msg: body.msg });
    }

    return body;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SunoIntegrationError(
        "timeout",
        "Suno request timed out.",
        error,
      );
    }

    throw normalizeSunoError(error);
  } finally {
    clearTimeout(timeout);
  }
}

async function assertSafeOutboundUrl(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new SunoIntegrationError(
      "unsafe_url",
      "Unsafe Suno API URL was blocked.",
    );
  }

  const literalIpVersion = isIP(url.hostname);

  if (literalIpVersion && isPrivateAddress(url.hostname)) {
    throw new SunoIntegrationError(
      "unsafe_url",
      "Unsafe Suno API URL resolved to a private address.",
    );
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });

  if (
    addresses.length === 0 ||
    addresses.some((entry) => isPrivateAddress(entry.address))
  ) {
    throw new SunoIntegrationError(
      "unsafe_url",
      "Unsafe Suno API URL resolved to a private address.",
    );
  }
}

function isPrivateAddress(address: string) {
  const version = isIP(address);

  if (version === 4) {
    const parts = address.split(".").map((part) => Number(part));
    const [first, second] = parts;

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19))
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:169.254.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }

  return true;
}

function buildHeaders(credential: string, hasBody: boolean) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${credential}`,
  };

  if (credential.includes("=")) {
    headers.Cookie = credential;
  }

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

type SunoGenerateResponse = {
  code?: number;
  data?: {
    id?: string;
    taskId?: string;
  };
  id?: string;
  taskId?: string;
};

type SunoCreditsResponse = {
  code?: number;
  data?:
    | number
    | {
        credits?: number;
        monthlyLimit?: number | null;
        monthlyUsage?: number | null;
      };
  msg?: string;
};

type SunoRecordInfoResponse = {
  code?: number;
  data?: {
    errorCode?: string | null;
    errorMessage?: string | null;
    response?: {
      sunoData?: Array<{
        audioUrl?: string;
        audio_url?: string;
        duration?: number;
        id?: string;
        imageUrl?: string;
        title?: string;
      }>;
    };
    status?: string;
    taskId?: string;
  };
  msg?: string;
};
