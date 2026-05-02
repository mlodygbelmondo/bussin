import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="loading-state"
    >
      <DashboardTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-6 lg:px-9">
        <Skeleton className="h-9 w-36 bg-white/10" />
        <Skeleton className="mt-3 h-5 w-80 bg-white/8" />
        <section className="bussin-panel mt-5 rounded-lg p-3">
          <div className="grid gap-3 xl:grid-cols-[1fr_130px_130px_150px_150px_160px]">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-10 bg-white/8" key={index} />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                className="h-[420px] rounded-lg bg-white/8"
                key={index}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
