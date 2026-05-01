"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LibraryError({ reset }: { reset: () => void }) {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] px-4 py-12 text-foreground lg:px-9"
      data-testid="error-state"
    >
      <section className="mx-auto max-w-2xl rounded-lg border border-red-300/20 bg-red-500/10 p-6">
        <div className="flex gap-4">
          <AlertTriangle className="mt-1 size-6 text-red-200" />
          <div>
            <h1 className="text-xl font-semibold text-white">
              Library could not load
            </h1>
            <p className="mt-2 text-sm leading-6 text-red-100/75">
              Refresh the screen and try again. If this keeps happening, the
              library query needs attention.
            </p>
            <Button className="mt-5" onClick={reset} type="button">
              Retry
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
