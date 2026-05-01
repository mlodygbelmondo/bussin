import { Skeleton } from "@/components/ui/skeleton";

export default function TrackPreviewLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] px-4 py-6 lg:px-8"
      data-testid="loading-state"
    >
      <div className="mx-auto max-w-[1536px] space-y-5">
        <Skeleton className="h-10 w-72 bg-white/10" />
        <Skeleton className="h-64 rounded-lg bg-white/10" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[560px] rounded-lg bg-white/10" />
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-lg bg-white/10" />
            <Skeleton className="h-40 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>
    </main>
  );
}
