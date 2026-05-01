"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  CopyPlus,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Loader2,
  Play,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { publishTrackNowAction } from "@/modules/tracks/track-preview.actions";
import type { LibraryTrack } from "@/modules/library/library.types";

export function LibraryTrackActions({ track }: { track: LibraryTrack }) {
  const [isPending, startTransition] = useTransition();
  const similarHref = buildGenerateHref(track);
  const reuseImageHref = buildGenerateHref(track, true);

  function publish() {
    startTransition(async () => {
      const formData = new FormData();

      formData.set("trackId", track.trackId);

      const result = await publishTrackNowAction(formData);

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="grid grid-cols-5 gap-1.5">
      <Button
        asChild
        className="h-12 flex-col gap-1 rounded-md border-white/10 bg-white/[0.035] px-1 text-[11px] font-medium text-slate-300 hover:bg-violet-500/10"
        title="Preview"
        variant="outline"
      >
        <Link href={`/dashboard/tracks/${track.trackId}`}>
          <Play className="size-5 text-violet-200" />
          Preview
        </Link>
      </Button>
      <Button
        asChild
        className="h-12 flex-col gap-1 rounded-md border-white/10 bg-white/[0.035] px-1 text-[11px] font-medium text-slate-300 hover:bg-violet-500/10"
        title="Generate similar"
        variant="outline"
      >
        <Link data-testid="generate-similar-action" href={similarHref}>
          <SlidersHorizontal className="size-5" />
          Similar
        </Link>
      </Button>
      <Button
        asChild
        className="h-12 flex-col gap-1 rounded-md border-white/10 bg-white/[0.035] px-1 text-[11px] font-medium text-slate-300 hover:bg-violet-500/10"
        title="Reuse image"
        variant="outline"
      >
        <Link href={reuseImageHref}>
          <ImageIcon className="size-5" />
          Reuse image
        </Link>
      </Button>
      <Button
        asChild
        className="h-12 flex-col gap-1 rounded-md border-white/10 bg-white/[0.035] px-1 text-[11px] font-medium text-slate-300 hover:bg-violet-500/10"
        title="Open details"
        variant="outline"
      >
        <Link href={`/dashboard/tracks/${track.trackId}`}>
          <Info className="size-5" />
          Details
        </Link>
      </Button>
      <Button
        className="h-12 flex-col gap-1 rounded-md border-white/10 bg-white/[0.035] px-1 text-[11px] font-medium text-slate-300 hover:bg-violet-500/10"
        disabled={!track.canPublish || isPending}
        onClick={publish}
        title="Publish"
        type="button"
        variant="outline"
      >
        {isPending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Send className="size-5" />
        )}
        Publish
      </Button>
    </div>
  );
}

export function LibraryMoreMenu({ track }: { track: LibraryTrack }) {
  const href = buildGenerateHref(track);

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2">
      <Link
        aria-label={`Open details for ${track.title}`}
        className="grid size-8 place-items-center rounded-full bg-slate-950/58 text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.3)] ring-1 ring-white/10 hover:bg-violet-500/30"
        href={`/dashboard/tracks/${track.trackId}`}
      >
        <ExternalLink className="size-4" />
      </Link>
      <Link
        aria-label={`Generate similar to ${track.title}`}
        className="grid size-8 place-items-center rounded-full bg-slate-950/58 text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.3)] ring-1 ring-white/10 hover:bg-violet-500/30"
        href={href}
      >
        <CopyPlus className="size-4" />
      </Link>
    </div>
  );
}

function buildGenerateHref(track: LibraryTrack, includeImage = false) {
  const params = new URLSearchParams();

  if (track.style) {
    params.set("style", track.style);
  }

  if (track.mood) {
    params.set("mood", track.mood);
  }

  if (track.durationSeconds) {
    params.set("duration_seconds", String(track.durationSeconds));
  }

  if (includeImage && track.imageAssetId) {
    params.set("image_asset_id", track.imageAssetId);
  }

  return `/dashboard/generate?${params.toString()}`;
}
