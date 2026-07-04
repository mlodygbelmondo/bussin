import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChannelsLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-background text-foreground"
      data-testid="loading-state"
    >
      <DashboardTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-6 lg:px-9">
        <Skeleton className="mt-3 h-9 w-36" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full" />
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
          <Skeleton className="h-[292px] rounded-lg" />
          <Skeleton className="h-[292px] rounded-lg" />
        </div>
        <div className="mt-7 flex items-end justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-52" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <Skeleton className="hidden h-10 w-[660px] lg:block" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-[276px] rounded-lg" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
