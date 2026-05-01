"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ScheduledHeader,
  ScheduledTopBar,
} from "@/modules/scheduled/scheduled-components";

export default function ScheduledError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="error-state"
    >
      <ScheduledTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-5 lg:px-7 xl:px-8">
        <ScheduledHeader />
        <section className="mt-6 grid min-h-[520px] place-items-center rounded-lg border border-red-300/20 bg-red-500/[0.04] px-6 text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-white">
              Scheduled uploads could not load
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {error.message || "Try again in a moment."}
            </p>
            <Button className="mt-6" onClick={reset} type="button">
              <RotateCcw className="size-4" />
              Try again
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
