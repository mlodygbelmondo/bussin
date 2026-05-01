"use client";

import { Button } from "@/components/ui/button";

export default function GenerateError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] p-4 text-foreground lg:p-9"
      data-testid="error-state"
    >
      <section className="mx-auto max-w-2xl rounded-lg border border-red-300/20 bg-red-500/10 p-6 text-red-100">
        <h1 className="text-xl font-semibold text-white">
          Could not load generation
        </h1>
        <p className="mt-2 text-sm leading-6 text-red-100/80">
          {error.message}
        </p>
        <Button className="mt-5" onClick={reset} type="button">
          Try again
        </Button>
      </section>
    </main>
  );
}
