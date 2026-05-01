import { Bell, ChevronDown, Megaphone, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="loading-state"
    >
      <header className="flex h-[73px] items-center justify-end gap-4 border-b border-white/10 bg-[#0b1022]/80 px-4 backdrop-blur lg:px-9">
        <Link
          className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white md:flex"
          href="/dashboard/channels"
        >
          <Megaphone className="size-4 text-slate-300" />
          What&apos;s new
        </Link>
        <div className="hidden h-9 w-full max-w-[335px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-500 md:flex">
          <Search className="size-4 text-slate-500" />
          Search anything...
        </div>
        <Button
          aria-label="Notifications"
          className="text-slate-300"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Bell className="size-5" />
        </Button>
        <button className="flex items-center gap-2 text-sm text-slate-300">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 font-semibold text-white">
            AM
          </span>
          <ChevronDown className="size-4" />
        </button>
      </header>
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
