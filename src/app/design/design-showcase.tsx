"use client";

import { ArrowUp, Music, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Aurora } from "@/components/common/aurora";
import { Reveal, staggerDelay } from "@/components/common/motion";
import { Starfield } from "@/components/common/starfield";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  ComposingEqualizer,
  PlaybackWaveform,
} from "@/modules/feed/track-waveform";
import { WAVEFORM_BAR_COUNT } from "@/modules/feed/waveform";

const SURFACE_TOKENS = [
  "background",
  "panel-soft",
  "panel",
  "card",
  "panel-strong",
  "popover",
  "input",
] as const;

const STATE_TOKENS = [
  "primary",
  "success",
  "warning",
  "danger",
  "info",
] as const;

const LOGOS = [
  { file: "logo-pulse.svg", name: "Pulse", idea: "waveform bars mid-drop" },
] as const;

const SIGNATURE_MOMENTS = [
  { className: "track-ready-pop", label: "Ready" },
  { className: "track-published-pop", label: "Published" },
  { className: "track-scheduled-pop", label: "Scheduled" },
] as const;

const DEMO_PEAKS = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
  const swell = Math.sin((index / WAVEFORM_BAR_COUNT) * Math.PI);

  return Math.min(
    1,
    Math.max(0.16, 0.3 + 0.5 * swell + 0.25 * Math.sin(index * 1.7)),
  );
});

function MotionDemo() {
  const [revealRun, setRevealRun] = useState(0);
  const [moment, setMoment] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">
            Stagger reveal
          </CardTitle>
          <CardDescription>
            Enter-only cascade: fade + 8px rise, ~45ms apart. Used on every page
            mount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3" key={revealRun}>
          {["Header", "Hero content", "Body section"].map((label, index) => (
            <Reveal delay={staggerDelay(index, 0.12)} key={label}>
              <div className="rounded-lg border border-line bg-panel px-4 py-3 text-sm">
                {label}
              </div>
            </Reveal>
          ))}
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => setRevealRun((run) => run + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw className="size-4" />
            Replay
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">
            Signature moments
          </CardTitle>
          <CardDescription>
            The Studio&apos;s budget of four: composing equalizer while
            generation is live, plus one-shot pops for ready (ember), published
            (success), and schedule armed (amber). Adding a fifth means retiring
            one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={`flex items-center gap-4 rounded-lg border border-line bg-panel px-4 py-3 ${
              moment ?? ""
            }`}
          >
            <span className="grid size-10 place-items-center rounded-md bg-accent text-muted-foreground">
              <Music className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Midnight drive</p>
              <Badge className="mt-1" variant="info">
                Ready to publish
              </Badge>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ComposingEqualizer />
            Composing equalizer — runs only while a track is generating.
          </p>
        </CardContent>
        <CardFooter className="gap-2">
          {SIGNATURE_MOMENTS.map(({ className, label }) => (
            <Button
              disabled={moment !== null}
              key={className}
              onClick={() => {
                setMoment(className);
                window.setTimeout(() => setMoment(null), 900);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {label}
            </Button>
          ))}
        </CardFooter>
      </Card>

      <WaveformDemo />
    </div>
  );
}

function WaveformDemo() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((value) => (value >= 1 ? 0 : value + 1 / WAVEFORM_BAR_COUNT));
    }, 120);

    return () => window.clearInterval(interval);
  }, [playing]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">
          Playback waveform
        </CardTitle>
        <CardDescription>
          The track&apos;s real audio shape, lit bar-by-bar with preview
          progress. Appears on a track card only while its preview is playing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-line bg-panel px-4 py-3">
          <PlaybackWaveform peaks={DEMO_PEAKS} progress={progress} />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => setPlaying((value) => !value)}
          size="sm"
          type="button"
          variant="outline"
        >
          {playing ? "Stop" : "Simulate playback"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-line pb-2 font-display text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DesignShowcase() {
  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
      <header className="grain relative overflow-hidden rounded-xl border border-line px-8 py-16 text-center">
        <Aurora />
        <Starfield />
        <div className="relative">
          <p className="text-sm text-muted-foreground">Ember on Ink</p>
          <h1 className="mt-2 font-display text-5xl font-bold tracking-tight">
            What are we making today?
          </h1>
          <div className="prompt-card mx-auto mt-8 max-w-xl rounded-xl border border-border bg-popover p-4 text-left shadow-[var(--shadow-elevated)]">
            <p className="text-base text-muted-foreground">
              Describe the track you want to generate…
            </p>
            <div className="mt-6 flex items-center justify-between">
              <Button size="icon" variant="ghost" aria-label="Add reference">
                <Plus />
              </Button>
              <Button size="icon" aria-label="Generate">
                <ArrowUp />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Section title="Motion">
        <MotionDemo />
      </Section>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {SURFACE_TOKENS.map((token) => (
            <div key={token} className="space-y-1.5">
              <div
                className="h-14 rounded-md border border-line"
                style={{ background: `var(--${token})` }}
              />
              <p className="font-mono text-xs text-muted-foreground">
                --{token}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATE_TOKENS.map((token) => (
            <div key={token} className="space-y-1.5">
              <div
                className="h-10 rounded-md"
                style={{ background: `var(--${token})` }}
              />
              <p className="font-mono text-xs text-muted-foreground">
                --{token}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="h-10 rounded-md bg-[linear-gradient(90deg,var(--aurora-1),var(--aurora-2),var(--aurora-3))]" />
          <p className="font-mono text-xs text-muted-foreground">
            aurora (backdrop only, via &lt;Aurora /&gt;)
          </p>
        </div>
      </Section>

      <Section title="Logo concepts">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {LOGOS.map((logo) => (
            <Card key={logo.file} className="items-center gap-4 text-center">
              <CardContent className="flex flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${logo.name} logo concept`}
                  className="size-16"
                  src={`/brand/${logo.file}`}
                />
                <div>
                  <p className="font-display font-semibold">{logo.name}</p>
                  <p className="text-xs text-muted-foreground">{logo.idea}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-3">
          <p className="font-display text-4xl font-bold tracking-tight">
            Hero headline — Bricolage Grotesque
          </p>
          <p className="text-2xl font-semibold">Section heading — Geist Sans</p>
          <p className="text-sm">
            Body text — Geist Sans at text-sm. Secondary copy uses{" "}
            <span className="text-muted-foreground">muted-foreground</span>.
          </p>
          <p className="font-mono text-sm">02:34 · 128 BPM · Geist Mono</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Music /> Generate
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">
            <Trash2 /> Delete
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Large</Button>
          <Button size="default">Default</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" aria-label="Upload">
            <Upload />
          </Button>
        </div>
      </Section>

      <Section title="Badges (status)">
        <div className="flex flex-wrap gap-2">
          <Badge>Generating</Badge>
          <Badge variant="info">Rendering</Badge>
          <Badge variant="success">Published</Badge>
          <Badge variant="warning">Scheduled</Badge>
          <Badge variant="destructive">Failed</Badge>
          <Badge variant="secondary">Draft</Badge>
          <Badge variant="outline">Neutral</Badge>
        </div>
      </Section>

      <Section title="Forms">
        <div className="grid max-w-md gap-3">
          <Input placeholder="Track title" />
          <Input aria-invalid placeholder="Invalid input" />
          <Input disabled placeholder="Disabled" />
          <Textarea placeholder="Prompt: dreamy lo-fi with vinyl crackle…" />
        </div>
      </Section>

      <Section title="Card + async states">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Midnight Drive</CardTitle>
              <CardDescription>Synthwave · 3:12</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ready to publish to Night Loops.
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">Publish</Button>
              <Button size="sm" variant="outline">
                Schedule
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Loading state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Error state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-danger">
                Suno rejected the request: quota exceeded.
              </p>
              <Button size="sm" variant="outline">
                <RefreshCw /> Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Overlays & feedback">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete track?</DialogTitle>
                <DialogDescription>
                  This removes the track and its render. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="destructive">Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Publish</DropdownMenuLabel>
              <DropdownMenuItem>Publish now</DropdownMenuItem>
              <DropdownMenuItem>Schedule…</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => toast.success("Track published to Night Loops")}
          >
            Success toast
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("Render failed: FFmpeg exited 1")}
          >
            Error toast
          </Button>
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Track</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Midnight Drive</TableCell>
              <TableCell>
                <Badge variant="success">Published</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">3:12</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Neon Rain</TableCell>
              <TableCell>
                <Badge variant="info">Rendering</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">2:47</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>
    </main>
  );
}
