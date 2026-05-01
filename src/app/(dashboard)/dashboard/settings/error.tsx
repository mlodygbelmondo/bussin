"use client";

import { Button } from "@/components/ui/button";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[#07101f] p-7 text-foreground"
      data-testid="error-state"
    >
      <section className="bussin-panel max-w-md rounded-lg p-6 text-center">
        <h1 className="text-xl font-semibold text-white">
          Settings could not load
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {error.message || "Refresh the workspace and try again."}
        </p>
        <Button className="mt-5" onClick={reset} type="button">
          Try again
        </Button>
      </section>
    </main>
  );
}
