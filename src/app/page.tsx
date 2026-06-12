import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  CalendarClock,
  Play,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-config";

const examplePrompts = [
  "Chill lofi beats for a late-night study channel",
  "Cinematic instrumental bed for a product launch",
  "High-energy synthwave for workout videos",
];

const workflow = [
  {
    description:
      "Describe the track in one prompt. Suno generates it in minutes.",
    icon: Sparkles,
    title: "Generate",
  },
  {
    description: "Listen to each take and keep only the ones you like.",
    icon: Play,
    title: "Review",
  },
  {
    description:
      "Publish to your YouTube channel now, or schedule it for later.",
    icon: UploadCloud,
    title: "Publish",
  },
];

export const metadata: Metadata = {
  title: `${APP_NAME} - Generate instrumental music for YouTube`,
  description:
    "Type what you want, get instrumental tracks, and publish or schedule them on YouTube — all from one window.",
};

export default function Home() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          href="/"
        >
          <AudioWaveform className="size-6 text-primary" strokeWidth={2.4} />
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          What do you want to make?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Type a prompt, get instrumental tracks, and publish or schedule them
          on your YouTube channel — all from one window.
        </p>

        <div className="mt-8 rounded-lg border border-line bg-card p-3 text-left">
          <p className="min-h-16 p-1 text-sm text-muted-foreground">
            Describe the track you want — style, mood, instruments…
          </p>
          <div className="flex items-center justify-end">
            <Button asChild data-testid="landing-cta">
              <Link href="/signup">
                <Sparkles className="size-4" />
                Start creating
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {examplePrompts.map((prompt) => (
            <Link
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-ring hover:text-foreground"
              href="/signup"
              key={prompt}
            >
              {prompt}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-3 px-4 pb-16 sm:px-6 md:grid-cols-3">
        {workflow.map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="rounded-lg border border-line bg-card p-4"
              key={item.title}
            >
              <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <h2 className="mt-3 font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </article>
          );
        })}
      </section>

      <footer className="border-t border-line py-5 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          Scheduling included — set it and forget it.
        </span>
      </footer>
    </main>
  );
}
