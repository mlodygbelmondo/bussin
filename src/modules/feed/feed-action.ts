import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { isMockMode } from "@/lib/app-config";
import type { FeedActionResult } from "@/modules/feed/feed.types";
import { requireWorkspace } from "@/modules/feed/workspace-context";

export type FeedWorkspaceContext = Awaited<ReturnType<typeof requireWorkspace>>;

type FeedActionOptions<TInput> = {
  /** Message used when a thrown value is not an Error with a message. */
  errorFallback: string;
  formData: FormData;
  /** Message used when Zod fails without an issue message. Defaults to `errorFallback`. */
  invalidMessage?: string;
  /** Mock-mode success message; the action short-circuits before any work. */
  mockMessage: string;
  /** The actual work. Return `{ ok: false }` for domain failures; throw for unexpected ones. */
  run: (args: {
    ctx: FeedWorkspaceContext;
    input: TInput;
  }) => Promise<FeedActionResult>;
  schema: ZodType<TInput>;
  /** Extracts the raw values from the form for `schema` to parse. */
  values: (formData: FormData) => unknown;
};

/**
 * The single seam every feed server action goes through. Owns the shared
 * six-step shape: mock-mode short-circuit → `requireWorkspace()` → Zod parse
 * (first issue message wins) → run the work with thrown errors mapped to the
 * `FeedActionResult` shape → revalidate `/dashboard` on success.
 *
 * `requireWorkspace()` runs outside the try/catch on purpose so its
 * `redirect()` throws propagate to Next instead of becoming toast errors.
 */
export async function runFeedAction<TInput>(
  options: FeedActionOptions<TInput>,
): Promise<FeedActionResult> {
  if (isMockMode) {
    return { message: options.mockMessage, ok: true };
  }

  const ctx = await requireWorkspace();
  const parsed = options.schema.safeParse(options.values(options.formData));

  if (!parsed.success) {
    return {
      message:
        parsed.error.issues[0]?.message ??
        options.invalidMessage ??
        options.errorFallback,
      ok: false,
    };
  }

  let result: FeedActionResult;

  try {
    result = await options.run({ ctx, input: parsed.data });
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : options.errorFallback,
      ok: false,
    };
  }

  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}
