"use client";

import { ChevronDown, CirclePlus, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startChannelsYoutubeOAuthAction } from "@/modules/channels/channels.actions";
import type { ChannelsScreenData } from "@/modules/channels/channels.types";

type ChannelsStatusFilter = "all" | "connected" | "disconnected" | "error";

export function ChannelsToolbar({
  data,
  query,
  status,
}: {
  data: ChannelsScreenData;
  query: string;
  status: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftQuery, setDraftQuery] = useState(query);
  const normalizedStatus = useMemo<ChannelsStatusFilter>(
    () =>
      ["all", "connected", "disconnected", "error"].includes(status)
        ? (status as ChannelsStatusFilter)
        : "all",
    [status],
  );
  const [selectedStatus, setSelectedStatus] =
    useState<ChannelsStatusFilter>(normalizedStatus);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams();
      const trimmedQuery = draftQuery.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }

      if (selectedStatus !== "all") {
        params.set("status", selectedStatus);
      }

      const nextUrl = params.size
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [draftQuery, pathname, router, selectedStatus]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Your channels ({data.channels.length} of {data.plan.limit})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your YouTube channels and publishing destinations.
        </p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-[minmax(220px,1fr)_minmax(170px,210px)] lg:max-w-[680px] lg:grid-cols-[minmax(240px,1fr)_190px_190px]">
        <label className="flex h-10 min-w-0 items-center gap-3 rounded-lg border border-border bg-input px-4 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            data-testid="channels-search"
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Search channels..."
            value={draftQuery}
          />
        </label>
        <label className="relative min-w-0">
          <select
            className="h-10 w-full appearance-none rounded-lg border border-border bg-input px-4 pr-9 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/35"
            data-testid="channels-status"
            onChange={(event) =>
              setSelectedStatus(event.target.value as ChannelsStatusFilter)
            }
            value={selectedStatus}
          >
            <option value="all">All statuses</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected</option>
            <option value="error">Sync issues</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-muted-foreground" />
        </label>
        <form
          action={startChannelsYoutubeOAuthAction}
          className="sm:col-span-2 lg:col-span-1"
        >
          <Button
            className="h-10 w-full"
            data-pending={isPending}
            data-testid="primary-action"
            disabled={data.hasPlanLimitReached}
            type="submit"
          >
            <CirclePlus className="size-4" />
            Connect channel
          </Button>
        </form>
      </div>
    </div>
  );
}
