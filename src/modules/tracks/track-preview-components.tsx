"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Download,
  Heart,
  MoreHorizontal,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TrackPreviewData } from "@/modules/tracks/track-preview.types";

type AudioPlayerProps = {
  audioUrl: string | null;
  durationSeconds: number;
  title: string;
};

export function TrackAudioPlayer({
  audioUrl,
  durationSeconds,
  title,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const progress = durationSeconds > 0 ? currentTime / durationSeconds : 0;

  async function togglePlayback() {
    if (!audioRef.current || !audioUrl) {
      return;
    }

    if (audioRef.current.paused) {
      await audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    audioRef.current.pause();
    setIsPlaying(false);
  }

  return (
    <div
      className="rounded-lg border border-white/10 bg-[#11182b]/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      data-testid="track-audio-player"
    >
      {audioUrl ? (
        <audio
          aria-label={`${title} audio preview`}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime);
          }}
          preload="metadata"
          ref={audioRef}
          src={audioUrl}
        />
      ) : null}
      <div className="grid items-center gap-4 md:grid-cols-[150px_minmax(160px,1fr)_360px]">
        <div className="flex items-center gap-3">
          <button
            aria-label="Skip back"
            className="grid size-8 place-items-center rounded-full text-slate-300 hover:bg-white/5"
            type="button"
          >
            <SkipBack className="size-4" />
          </button>
          <button
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
            className="grid size-12 place-items-center rounded-full border border-violet-300/40 bg-violet-500/20 text-white shadow-[0_0_28px_rgba(151,71,255,0.72),inset_0_1px_0_rgba(255,255,255,0.22)]"
            disabled={!audioUrl}
            onClick={togglePlayback}
            type="button"
          >
            {isPlaying ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="ml-0.5 size-5 fill-current" />
            )}
          </button>
          <button
            aria-label="Skip forward"
            className="grid size-8 place-items-center rounded-full text-slate-300 hover:bg-white/5"
            type="button"
          >
            <SkipForward className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-11 text-sm text-slate-300">
            {formatDuration(currentTime)}
          </span>
          <div
            aria-label="Audio progress"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <span className="w-11 text-right text-sm text-slate-300">
            {formatDuration(durationSeconds)}
          </span>
        </div>
        <div className="flex items-center justify-end gap-4 text-slate-300">
          <Heart className="size-5 text-red-300" />
          <Download className="size-5" />
          <MoreHorizontal className="size-5" />
          <span className="h-6 w-px bg-white/10" />
          <Volume2 className="size-5" />
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-3/4 rounded-full bg-violet-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetadataPreview({ data }: { data: TrackPreviewData }) {
  return (
    <section
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px]"
      data-testid="metadata-preview"
    >
      <div className="space-y-5">
        <Field label="Generated Title" required>
          <div className="flex h-10 items-center justify-between rounded-lg border border-white/10 bg-[#101729] px-4 text-sm text-white">
            <span>{data.title}</span>
            <span className="text-xs text-slate-500">
              {data.title.length}/100
            </span>
          </div>
        </Field>
        <Field label="YouTube Description" required>
          <div className="min-h-44 rounded-lg border border-white/10 bg-[#101729] p-4 text-sm leading-6 text-slate-300">
            <p>{data.description}</p>
            <p className="mt-5">Best enjoyed at night.</p>
            <p className="mt-5">
              Like, comment, and subscribe for more instrumental releases.
            </p>
            <p className="mt-5 text-slate-400">
              {data.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}
            </p>
          </div>
        </Field>
        <Field label="Tags">
          <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-[#101729] p-2">
            {data.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <span className="text-slate-500">x</span>
              </Badge>
            ))}
            <span className="px-2 py-1 text-xs text-slate-500">+ Add tag</span>
          </div>
        </Field>
        <Field label="Target Channel">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#101729] p-3">
            <div className="flex items-center gap-3">
              <ChannelAvatar image={data.channel?.thumbnailUrl} />
              <div>
                <p className="text-sm font-semibold text-white">
                  {data.channel?.title ?? "No channel connected"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.channel?.handle ?? "Connect YouTube in settings"}
                </p>
              </div>
            </div>
            <span className="text-slate-500">⌄</span>
          </div>
        </Field>
      </div>
      <CoverPreview data={data} />
    </section>
  );
}

export function CoverImage({
  alt,
  className = "",
  src,
}: {
  alt: string;
  className?: string;
  src: string | null;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} className={className} src={src} />
    );
  }

  return (
    <div
      aria-label={alt}
      className={`track-cover-fallback ${className}`}
      role="img"
    />
  );
}

function CoverPreview({ data }: { data: TrackPreviewData }) {
  const thumbnails = useMemo(() => [0, 1, 2], []);

  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Video / Cover Preview
        </h3>
        <button className="text-xs text-violet-200" type="button">
          Edit Image
        </button>
      </div>
      <CoverImage
        alt={`${data.title} cover`}
        className="aspect-square w-full rounded-lg object-cover"
        src={data.coverUrl}
      />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {thumbnails.map((item) => (
          <div
            className="aspect-square overflow-hidden rounded-md border border-violet-300/25"
            key={item}
          >
            <CoverImage
              alt={`${data.title} thumbnail ${item + 1}`}
              className="size-full object-cover"
              src={data.coverUrl}
            />
          </div>
        ))}
        <div className="grid aspect-square place-items-center rounded-md border border-dashed border-slate-500 text-3xl text-slate-400">
          +
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-slate-300">
          Aspect Ratio
        </p>
        <div className="grid grid-cols-3 gap-2">
          {["16:9", "1:1", "9:16"].map((ratio, index) => (
            <button
              className={
                index === 0
                  ? "h-9 rounded-md border border-violet-400 bg-violet-500/18 text-sm font-semibold text-violet-100"
                  : "h-9 rounded-md border border-white/10 bg-white/[0.03] text-sm text-slate-400"
              }
              key={ratio}
              type="button"
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Field({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">
        {label} {required ? <span className="text-red-300">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function ChannelAvatar({ image }: { image: string | null | undefined }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="size-10 rounded-full border border-violet-300/30 object-cover"
        src={image}
      />
    );
  }

  return (
    <span className="grid size-10 place-items-center rounded-full border border-violet-300/30 bg-gradient-to-br from-fuchsia-500 to-blue-500 text-sm font-semibold text-white">
      YT
    </span>
  );
}

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}
