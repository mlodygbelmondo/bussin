"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";
import type { FeedActionResult } from "@/modules/feed/feed.types";

export type FeedAction = (formData: FormData) => Promise<FeedActionResult>;

/**
 * Runs a feed server action from the client: builds the FormData, shows a
 * success/error toast, and invalidates the ["feed"] query so the poll
 * refreshes immediately. All feed mutations go through this hook.
 */
export function useFeedAction() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  function run(
    action: FeedAction,
    entries: Record<string, string>,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const formData = new FormData();

      for (const [key, value] of Object.entries(entries)) {
        formData.append(key, value);
      }

      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
        await queryClient.invalidateQueries({ queryKey: ["feed"] });
      } else {
        toast.error(result.message);
      }
    });
  }

  return { pending, run };
}
