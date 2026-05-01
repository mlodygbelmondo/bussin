import { env, requireEnv } from "@/lib/env";
import { createSunoAdapter } from "@/server/services/suno/suno-adapter";

type SunoGenerateInput = {
  prompt: string;
  title: string;
};

export async function requestSunoGeneration(input: SunoGenerateInput) {
  const adapter = createSunoAdapter({
    apiUrl: env.SUNO_DEFAULT_API_BASE_URL,
    credential: requireEnv(env.SUNO_API_KEY, "SUNO_API_KEY"),
  });
  const result = await adapter.createCustomGeneration({
    finalPrompt: input.prompt,
    makeInstrumental: true,
    style: "instrumental",
    title: input.title,
    waitAudio: false,
  });

  return { taskId: result.sunoTrackId };
}
