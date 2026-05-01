import { redirect } from "next/navigation";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import {
  EmptyScheduledState,
  NoScheduledResultsState,
  ScheduledCalendar,
  ScheduledHeader,
  ScheduledSidebar,
  ScheduledToolbar,
  ScheduledTopBar,
} from "@/modules/scheduled/scheduled-components";
import { getScheduledUploadsData } from "@/modules/scheduled/scheduled.queries";
import type { ScheduledFilters } from "@/modules/scheduled/scheduled.types";

type ScheduledPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ScheduledPage({
  searchParams,
}: ScheduledPageProps) {
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const filters = toFilters(params);
  const data = await getScheduledUploadsData(user.id, filters);

  if (!data) {
    redirect("/onboarding");
  }

  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="screen-dashboard-scheduled"
    >
      <ScheduledTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-5 lg:px-7 xl:px-8">
        <ScheduledHeader />
        <ScheduledToolbar data={data} filters={filters} />
        {data.isEmpty ? (
          <div className="mt-6">
            <EmptyScheduledState />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <ScheduledCalendar data={data} filters={filters} />
              {data.uploads.length === 0 ? <NoScheduledResultsState /> : null}
            </div>
            <ScheduledSidebar data={data} />
          </div>
        )}
      </div>
    </main>
  );
}

function toFilters(
  params: Record<string, string | string[] | undefined> | undefined,
): ScheduledFilters {
  return {
    channel: singleParam(params?.channel) ?? "all",
    query: singleParam(params?.q) ?? "",
    status: singleParam(params?.status) ?? "all",
    timezone:
      singleParam(params?.timezone) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      "UTC",
    week: singleParam(params?.week) ?? null,
  };
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
