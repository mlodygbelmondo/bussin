import { z } from "zod";

const appModeSchema = z.enum(["live", "mock"]).default("live");
const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_MODE: appModeSchema,
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  })
  .superRefine((value, context) => {
    if (
      value.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required",
      path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    });
  });

type PublicEnvInput = Record<string, string | undefined>;

export type PublicEnv = {
  NEXT_PUBLIC_APP_MODE: z.infer<typeof appModeSchema>;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLIC_KEY: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
};

export function parsePublicEnv(input: PublicEnvInput): PublicEnv {
  const normalized = normalizeEmptyStrings(input);
  const mode = appModeSchema.parse(normalized.NEXT_PUBLIC_APP_MODE);
  const parsed = publicEnvSchema.safeParse(
    mode === "mock"
      ? {
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-supabase-anon-key",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "mock-supabase-publishable-key",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          ...normalized,
          NEXT_PUBLIC_APP_MODE: "mock",
        }
      : normalized,
  );

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables: ${parsed.error.issues
        .map((issue) => issue.path.join(".") || "environment")
        .join(", ")}`,
    );
  }

  return {
    NEXT_PUBLIC_APP_MODE: parsed.data.NEXT_PUBLIC_APP_MODE,
    NEXT_PUBLIC_APP_URL: parsed.data.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_PUBLIC_KEY:
      parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
    NEXT_PUBLIC_SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

function normalizeEmptyStrings(input: PublicEnvInput): PublicEnvInput {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}
