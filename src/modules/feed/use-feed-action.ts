"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";
import type { FeedMutator } from "@/modules/feed/feed-optimism";
import type { FeedActionResult, FeedData } from "@/modules/feed/feed.types";

export type FeedAction = (formData: FormData) => Promise<FeedActionResult>;

export type FeedActionOptions = {
  /** Runs after the server confirms; UI updates should not wait for this. */
  onSuccess?: () => void;
  /**
   * Applied to the ["feed"] cache synchronously, before the server round
   * trip, so the click is acknowledged in under 100ms (design-system →
   * Motion 4). Rolled back if the action fails.
   */
  optimistic?: FeedMutator;
};

/**
 * Runs a feed server action from the client: applies the optimistic cache
 * update, builds the FormData, shows a success/error toast (rolling the
 * optimistic update back on failure), and invalidates the ["feed"] query so
 * the poll resyncs with the server. All feed mutations go through this hook.
 */
export function useFeedAction() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  function run(
    action: FeedAction,
    entries: Record<string, string | Blob>,
    options: FeedActionOptions = {},
  ) {
    const snapshot = options.optimistic
      ? queryClient.getQueryData<FeedData>(["feed"])
      : undefined;

    if (options.optimistic && snapshot) {
      // Stop any in-flight poll from clobbering the optimistic state.
      void queryClient.cancelQueries({ queryKey: ["feed"] });
      queryClient.setQueryData<FeedData>(
        ["feed"],
        options.optimistic(snapshot),
      );
    }

    startTransition(async () => {
      const formData = new FormData();

      for (const [key, value] of Object.entries(entries)) {
        formData.append(key, value);
      }

      let result: FeedActionResult;

      try {
        result = await action(formData);
      } catch {
        result = { message: "Something went wrong. Please retry.", ok: false };
      }

      if (result.ok) {
        toast.success(result.message);
        options.onSuccess?.();
      } else {
        if (snapshot) {
          queryClient.setQueryData<FeedData>(["feed"], snapshot);
        }

        toast.error(result.message);
      }

      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    });
  }

  return { pending, run };
}
