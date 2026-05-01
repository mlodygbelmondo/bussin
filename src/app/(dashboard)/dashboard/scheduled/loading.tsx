import {
  ScheduledHeader,
  ScheduledTopBar,
} from "@/modules/scheduled/scheduled-components";

export default function ScheduledLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="loading-state"
    >
      <ScheduledTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-5 lg:px-7 xl:px-8">
        <ScheduledHeader />
        <div className="grid gap-3 xl:grid-cols-[165px_165px_minmax(260px,1fr)_230px_auto_auto_auto_auto]">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              className="h-10 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]"
              key={index}
            />
          ))}
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[860px] animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
          <div className="space-y-3">
            <div className="h-[420px] animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
            <div className="h-[250px] animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </main>
  );
}
