import { PulseMark } from "@/components/common/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/app-public-config";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col" data-testid="loading-state">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="flex items-center gap-2.5 text-lg tracking-tight">
            <PulseMark className="size-5.5" />
            <span className="font-display font-semibold tracking-tight">
              {APP_NAME}
            </span>
          </span>
          <Skeleton className="size-8 rounded-full" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4">
        <Skeleton className="mt-10 h-40 w-full rounded-xl" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
