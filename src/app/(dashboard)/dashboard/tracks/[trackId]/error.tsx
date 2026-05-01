"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function TrackPreviewError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[#07101f] p-6"
      data-testid="error-state"
    >
      <section className="bussin-panel max-w-md rounded-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-white">
          Could not load track preview
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The preview data or signed media URL could not be prepared. Try again
          in a moment.
        </p>
        <Button className="mt-6" onClick={() => unstable_retry()} type="button">
          Try again
        </Button>
      </section>
    </main>
  );
}
