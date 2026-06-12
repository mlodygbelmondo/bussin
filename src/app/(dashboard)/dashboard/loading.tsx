import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4" data-testid="loading-state">
      <div className="flex h-14 items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="mt-10 h-36 w-full" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
