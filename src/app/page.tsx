import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  CheckCircle2,
  LayoutDashboard,
  Play,
  Tv,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-config";

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-background px-4 py-5 text-foreground sm:px-6">
      <section className="mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="max-w-3xl py-14">
          <Link
            className="mb-12 flex w-fit items-center gap-2 text-sm font-semibold text-white"
            href="/"
          >
            <span className="grid size-8 place-items-center rounded-md border border-violet-300/25 bg-violet-500/15">
              <AudioWaveform className="size-4 text-violet-100" />
            </span>
            {APP_NAME}
          </Link>

          <h1 className="text-4xl leading-none font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Create. Preview. Publish to YouTube.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Generate instrumental AI music, approve the best track and publish a
            rendered video to one or many YouTube channels from a single dark
            cockpit.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">
                Sign in
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3">
            {["Generate", "Preview", "Publish"].map((item) => (
              <div
                className="rounded-lg border border-violet-200/10 bg-slate-950/35 p-4"
                key={item}
              >
                <CheckCircle2 className="size-4 text-cyan-200" />
                <p className="mt-3 text-sm font-medium text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-violet-200/10 bg-slate-950/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_70px_rgba(7,11,32,0.58)]">
          <div className="bussin-spectrum absolute inset-0 opacity-80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_60%,rgba(139,92,246,0.18),transparent_34%),linear-gradient(180deg,transparent,rgba(8,12,31,0.82))]" />

          <div className="absolute top-6 right-6 left-6 flex items-center justify-between">
            <Badge variant="secondary">Workspace monitor</Badge>
            <span className="font-mono text-xs text-muted-foreground">
              245.6K plays
            </span>
          </div>

          <div className="absolute right-10 bottom-32 left-10">
            <div className="bussin-waveform h-28 opacity-95" />
          </div>

          <div className="absolute right-8 bottom-8 left-8 grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="rounded-lg border border-violet-200/10 bg-slate-950/70 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-violet-500 text-white">
                  <Play className="size-4 fill-current" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">Neon Skyline</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Preview approved, rendering video
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-violet-200/10 bg-slate-950/70 p-4 backdrop-blur">
              <Tv className="size-5 text-red-200" />
              <p className="mt-4 font-mono text-2xl text-white">36</p>
              <p className="text-xs text-muted-foreground">scheduled uploads</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
