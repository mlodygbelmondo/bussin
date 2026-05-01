"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  disconnectYoutubeConnectionAction,
  setDefaultChannelAction,
  syncYoutubeChannelsAction,
  testSunoConnectionAction,
} from "@/modules/channels/channels.actions";

type ChannelsActionButtonProps =
  | {
      channelId: string;
      disabled?: boolean;
      label?: string;
      kind: "set-default";
    }
  | {
      connectionId: string | null;
      disabled?: boolean;
      label?: string;
      kind: "disconnect" | "sync";
    }
  | {
      disabled?: boolean;
      label?: string;
      kind: "test-suno";
    };

export function ChannelsActionButton(props: ChannelsActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const label = props.label ?? defaultLabel(props.kind);

  return (
    <Button
      className={
        props.kind === "disconnect"
          ? "h-9 w-full border-red-300/15 bg-red-500/5 px-3 text-red-300 hover:bg-red-500/10 hover:text-red-100"
          : "h-9 w-full px-3 text-violet-200"
      }
      disabled={pending || props.disabled}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          const result =
            props.kind === "set-default"
              ? await setDefaultChannelAction(
                  append(formData, "channelId", props.channelId),
                )
              : props.kind === "disconnect"
                ? await disconnectYoutubeConnectionAction(
                    append(formData, "connectionId", props.connectionId ?? ""),
                  )
                : props.kind === "sync"
                  ? await syncYoutubeChannelsAction(
                      append(
                        formData,
                        "connectionId",
                        props.connectionId ?? "",
                      ),
                    )
                  : await testSunoConnectionAction();

          if (result.ok) {
            toast.success(result.message);
            return;
          }

          toast.error(result.message);
        });
      }}
      type="button"
      variant={props.kind === "disconnect" ? "outline" : "outline"}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function append(formData: FormData, key: string, value: string) {
  formData.set(key, value);
  return formData;
}

function defaultLabel(kind: ChannelsActionButtonProps["kind"]) {
  if (kind === "set-default") {
    return "Set as default";
  }

  if (kind === "disconnect") {
    return "Disconnect";
  }

  if (kind === "sync") {
    return "Sync";
  }

  return "Test connection";
}
