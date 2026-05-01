"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  cancelQueueRequest,
  retryFailedQueueItem,
} from "@/modules/queue/queue.actions";
import type { QueueTrackItem } from "@/modules/queue/queue.types";

type QueueActionButtonProps =
  | {
      id: string;
      kind: "cancel";
    }
  | {
      item: QueueTrackItem;
      kind: "retry";
    };

export function QueueActionButton(props: QueueActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const label = props.kind === "retry" ? "Retry" : "Cancel";

  return (
    <Button
      className={
        props.kind === "retry"
          ? "h-9 justify-start px-3 text-violet-200"
          : "h-9 justify-start px-3 text-red-300 hover:text-red-100"
      }
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();

          if (props.kind === "retry") {
            formData.set("id", props.item.actionTargetId);
            formData.set("type", props.item.actionTargetType);

            const result = await retryFailedQueueItem(formData);
            showToast(result.ok, result.message);
            return;
          }

          formData.set("id", props.id);

          const result = await cancelQueueRequest(formData);
          showToast(result.ok, result.message);
        });
      }}
      type="button"
      variant="ghost"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function showToast(ok: boolean, message: string) {
  if (ok) {
    toast.success(message);
    return;
  }

  toast.error(message);
}
