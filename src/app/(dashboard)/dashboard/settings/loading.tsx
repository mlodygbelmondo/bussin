import { DashboardTopBar } from "@/components/common/dashboard-top-bar";

export default function SettingsLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="loading-state"
    >
      <DashboardTopBar />
      <div className="mx-auto grid max-w-[1536px] gap-5 px-4 py-4 lg:px-9">
        <div className="grid gap-3">
          <div className="h-9 w-64 animate-pulse rounded bg-white/10" />
          <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              className="h-20 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]"
              key={index}
            />
          ))}
        </div>
        <div className="bussin-panel h-40 animate-pulse rounded-lg" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-5">
            <div className="bussin-panel h-72 animate-pulse rounded-lg" />
            <div className="bussin-panel h-64 animate-pulse rounded-lg" />
            <div className="bussin-panel h-64 animate-pulse rounded-lg" />
          </div>
          <div className="bussin-panel h-96 animate-pulse rounded-lg" />
        </div>
      </div>
    </main>
  );
}
