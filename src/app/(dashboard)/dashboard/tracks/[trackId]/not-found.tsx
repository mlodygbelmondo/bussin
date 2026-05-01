import Link from "next/link";
import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TrackPreviewNotFound() {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[#07101f] p-6"
      data-testid="empty-state"
    >
      <section className="bussin-panel max-w-md rounded-lg p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-violet-500/15 text-violet-200">
          <Music2 className="size-7" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-white">
          Track preview not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          This track is missing, still belongs to another workspace, or is no
          longer available for review.
        </p>
        <Button asChild className="mt-6" data-testid="primary-action">
          <Link href="/dashboard/queue">Back to queue</Link>
        </Button>
      </section>
    </main>
  );
}
