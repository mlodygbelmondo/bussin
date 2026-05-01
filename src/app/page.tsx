import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  CheckCircle2,
  Clock3,
  ImagePlus,
  LayoutDashboard,
  Music2,
  Play,
  Radio,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-config";

const promptIdeas = [
  {
    duration: "120",
    label: "lofi sleep channel",
    mood: "calm, warm, late night",
    style:
      "A soft lofi instrumental for a sleep and focus YouTube channel. Gentle vinyl texture, warm keys, deep sub bass, no vocals, clean loopable ending.",
  },
  {
    duration: "150",
    label: "cinematic launch bed",
    mood: "confident, dramatic, premium",
    style:
      "A cinematic instrumental bed for a product launch video. Modern pulses, wide strings, clean percussion, premium tension, no vocals.",
  },
  {
    duration: "180",
    label: "neon workout upload",
    mood: "driving, electric, focused",
    style:
      "A high-energy synthwave instrumental for a workout upload. Driving bass, bright arps, punchy drums, futuristic night-drive atmosphere.",
  },
];

const moodOptions = [
  { label: "Focused", value: "focused, polished, repeatable" },
  { label: "Cinematic", value: "cinematic, emotional, expansive" },
  { label: "Late night", value: "late night, neon, atmospheric" },
];

const durationOptions = [
  { label: "2:00", value: "120" },
  { label: "2:30", value: "150" },
  { label: "3:00", value: "180" },
];

const workflow = [
  {
    description: "Bussin turns the chat brief into a structured Suno request.",
    icon: WandSparkles,
    title: "Prompt composed",
  },
  {
    description: "Approve a track, attach a cover, and render the video.",
    icon: Play,
    title: "Preview ready",
  },
  {
    description: "Publish now or schedule the upload to a connected channel.",
    icon: UploadCloud,
    title: "YouTube queued",
  },
];

const previewBars = [
  34, 52, 42, 78, 96, 58, 72, 118, 84, 62, 108, 136, 92, 68, 122, 156, 104, 80,
  132, 172, 118, 90, 146, 188, 126, 86, 114, 152, 98, 72, 106, 138, 82, 54, 76,
  110,
];

export const metadata: Metadata = {
  title: `${APP_NAME} - Generate instrumental music for YouTube`,
  description:
    "Start with a music brief, generate instrumental tracks, render static-image videos, and publish them to YouTube.",
};

export default function Home() {
  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#050b17] text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(82,116,255,0.18),transparent_34rem),linear-gradient(180deg,#080d1c_0%,#050b17_45%,#070f1f_100%)]" />
        <div className="bussin-grid absolute inset-0 opacity-[0.08]" />
        <div className="absolute inset-x-[-20%] top-[34rem] h-[34rem] rounded-[100%] border-t border-cyan-200/35 bg-[linear-gradient(180deg,rgba(56,189,248,0.18),transparent_28%)] shadow-[0_-28px_90px_rgba(56,189,248,0.18)]" />
      </div>

      <header className="relative z-10 mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          className="flex items-center gap-2 text-sm font-semibold text-white"
          href="/"
        >
          <span className="grid size-9 place-items-center rounded-md border border-violet-300/25 bg-violet-500/15 shadow-[0_0_24px_rgba(124,58,237,0.24)]">
            <AudioWaveform className="size-4 text-violet-100" />
          </span>
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mx-auto flex w-fit items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/[0.08] px-3 py-1 text-xs font-semibold text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Sparkles className="size-3.5" />
            Chat-first music generation workspace
          </p>
          <h1 className="mt-6 text-4xl leading-[1.02] font-semibold tracking-[0] text-white sm:text-6xl">
            What should Bussin publish for you today?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Describe the instrumental track, pick the basic settings, and move
            straight into a ready-to-review generation draft.
          </p>
        </div>

        <div className="mx-auto mt-9 grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
          <form
            action="/dashboard/generate"
            className="overflow-hidden rounded-lg border border-white/10 bg-[#0d1729]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_34px_100px_rgba(0,0,0,0.45)] backdrop-blur"
            data-testid="landing-chat-composer"
            method="get"
          >
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-md bg-violet-500 text-white shadow-[0_0_22px_rgba(124,58,237,0.36)]">
                    <Music2 className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      New generation
                    </p>
                    <p className="text-xs text-slate-500">
                      Suno prompt, render, YouTube handoff
                    </p>
                  </div>
                </div>
                <span className="hidden rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200 sm:inline-flex">
                  Draft mode
                </span>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                  <AudioWaveform className="size-4 text-cyan-200" />
                </span>
                <div className="max-w-[38rem] rounded-lg rounded-tl-sm border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
                  Give me the channel idea, mood, and anything the track should
                  avoid. I&apos;ll set up the first generation in the cockpit.
                </div>
              </div>

              <label className="block">
                <span className="sr-only">Music generation brief</span>
                <textarea
                  className="min-h-[170px] w-full resize-none rounded-lg border border-white/10 bg-[#07101f]/90 px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/45 focus:ring-4 focus:ring-violet-500/15"
                  maxLength={5000}
                  name="style"
                  placeholder="Example: A moody synthwave instrumental for a late-night YouTube channel. Driving bass, glossy arps, cinematic pads, no vocals, clean ending for video outros."
                  required
                />
              </label>

              <div className="grid gap-3 md:grid-cols-[1fr_0.68fr]">
                <fieldset>
                  <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Radio className="size-4 text-violet-200" />
                    Mood
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {moodOptions.map((option, index) => (
                      <label className="cursor-pointer" key={option.value}>
                        <input
                          className="peer sr-only"
                          defaultChecked={index === 0}
                          name="mood"
                          type="radio"
                          value={option.value}
                        />
                        <span className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-300 transition peer-checked:border-violet-300/45 peer-checked:bg-violet-500/[0.16] peer-checked:text-white hover:bg-white/[0.07]">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Clock3 className="size-4 text-cyan-200" />
                    Length
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {durationOptions.map((option, index) => (
                      <label className="cursor-pointer" key={option.value}>
                        <input
                          className="peer sr-only"
                          defaultChecked={index === 0}
                          name="duration_seconds"
                          type="radio"
                          value={option.value}
                        />
                        <span className="grid h-9 place-items-center rounded-md border border-white/10 bg-white/[0.04] font-mono text-sm text-slate-300 transition peer-checked:border-cyan-200/45 peer-checked:bg-cyan-300/[0.12] peer-checked:text-white hover:bg-white/[0.07]">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-400">
                    <ImagePlus className="size-4 text-slate-500" />
                    cover later
                  </span>
                  <span className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-400">
                    <UploadCloud className="size-4 text-slate-500" />
                    draft first
                  </span>
                </div>
                <Button className="h-11 px-5" type="submit">
                  <Sparkles className="size-4" />
                  Start creating
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </form>

          <aside className="space-y-3">
            <section className="overflow-hidden rounded-lg border border-white/10 bg-[#0d1729]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="relative h-44 border-b border-white/10">
                <div className="library-cover-art library-cover-art-0 absolute inset-0 opacity-85" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,16,31,0.86))]" />
                <div className="absolute inset-x-4 bottom-4">
                  <div className="bussin-waveform h-16 opacity-90" />
                </div>
                <span className="absolute left-4 top-4 rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  Live draft
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-white">Neon Skyline</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  2:00 instrumental, preview queued, cover optional.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {["Suno", "Render", "YouTube"].map((item) => (
                    <span
                      className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-xs text-slate-300"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-white">
                Start from a channel idea
              </p>
              <div className="mt-3 space-y-2">
                {promptIdeas.map((idea) => (
                  <Link
                    className="group flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#07101f]/68 px-3 py-2 text-sm text-slate-300 transition hover:border-violet-300/35 hover:bg-violet-500/10 hover:text-white"
                    href={generationHref(idea)}
                    key={idea.label}
                  >
                    {idea.label}
                    <ArrowRight className="size-4 text-slate-500 transition group-hover:text-violet-200" />
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-3 px-4 pb-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {workflow.map((item, index) => {
          const Icon = item.icon;

          return (
            <article
              className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              key={item.title}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0d1729] text-violet-100">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-mono text-xs text-slate-500">
                    0{index + 1}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#07101f]/72">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-5 sm:p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                <CheckCircle2 className="size-4" />
                Built for the existing Bussin cockpit
              </p>
              <h2 className="mt-3 text-2xl leading-tight font-semibold text-white">
                A landing page that hands off to the real generation screen.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                The prompt, mood, and duration travel into the authenticated
                dashboard flow, where channels, assets, plan limits, and
                publishing choices stay protected behind the workspace.
              </p>
            </div>
            <div className="relative min-h-64 border-t border-white/10 p-5 lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_35%,rgba(124,58,237,0.22),transparent_24rem)]" />
              <div className="relative flex h-full items-end gap-1">
                {previewBars.map((height, index) => (
                  <span
                    className="flex-1 rounded-t-full bg-gradient-to-t from-violet-700 via-violet-400 to-cyan-300 shadow-[0_0_18px_rgba(124,58,237,0.26)]"
                    key={`${height}-${index}`}
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function generationHref({
  duration,
  mood,
  style,
}: {
  duration: string;
  mood: string;
  style: string;
}) {
  const params = new URLSearchParams({
    duration_seconds: duration,
    mood,
    style,
  });

  return `/dashboard/generate?${params.toString()}`;
}
