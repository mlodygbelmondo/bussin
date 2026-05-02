import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="loading-state"
    >
      <DashboardTopBar />
      <div className="dashboard-grid mx-auto grid max-w-[1536px] gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_365px] lg:px-9">
        <section className="min-w-0 space-y-4">
          <div className="pt-2">
            <Skeleton className="h-8 w-72 bg-white/10" />
            <Skeleton className="mt-2 h-4 w-96 max-w-full bg-white/8" />
          </div>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                className="h-[132px] rounded-lg bg-white/8"
                key={index}
              />
            ))}
          </section>
          <Skeleton className="h-[360px] rounded-lg bg-white/8" />
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.28fr)]">
            <Skeleton className="h-[260px] rounded-lg bg-white/8" />
            <Skeleton className="h-[260px] rounded-lg bg-white/8" />
          </section>
          <Skeleton className="h-[340px] rounded-lg bg-white/8" />
        </section>
        <aside className="space-y-3 lg:pt-[178px]">
          <Skeleton className="h-[268px] rounded-lg bg-white/8" />
          <Skeleton className="h-[300px] rounded-lg bg-white/8" />
          <Skeleton className="h-[170px] rounded-lg bg-white/8" />
        </aside>
      </div>
    </main>
  );
}
