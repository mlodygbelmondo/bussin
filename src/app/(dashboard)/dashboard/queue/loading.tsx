import { DashboardTopBar } from "@/components/common/dashboard-top-bar";

export default function QueueLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="loading-state"
    >
      <DashboardTopBar />
      <div className="mx-auto max-w-[1536px] animate-pulse space-y-5 px-4 py-5 lg:px-9">
        <div className="h-10 w-80 rounded-lg bg-white/10" />
        <div className="flex justify-between gap-4">
          <div className="h-11 w-96 rounded-lg bg-white/[0.06]" />
          <div className="h-11 w-[520px] rounded-lg bg-white/[0.06]" />
        </div>
        <div className="h-72 rounded-lg border border-white/10 bg-white/[0.04]" />
        <div className="h-48 rounded-lg border border-white/10 bg-white/[0.04]" />
        <div className="h-72 rounded-lg border border-white/10 bg-white/[0.04]" />
      </div>
    </main>
  );
}
