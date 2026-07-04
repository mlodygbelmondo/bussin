import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-background text-foreground"
      data-testid="loading-state"
    >
      <DashboardTopBar />
      <div className="mx-auto grid max-w-[1536px] gap-5 px-4 py-4 lg:px-9">
        <div className="grid gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton className="h-20 rounded-lg" key={index} />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
