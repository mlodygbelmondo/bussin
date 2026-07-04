"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  computeWaveformPeaks,
  fallbackWaveformPeaks,
  isNearPlayhead,
} from "@/modules/feed/waveform";

/*
 * Sound made visible on the Studio tier: the playback waveform renders the
 * track's real audio shape and lights up with playback progress — reactive
 * to preview playback, never idle (design-system → principle 5). The
 * composing equalizer is the "generation in progress" signature moment; it
 * runs only while a track is actually generating.
 */

/** Only one preview plays at a time across the whole feed. */
let activePreview: HTMLAudioElement | null = null;

export function useAudioPreview(src: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // The URL captured when playback first started. Feed polls re-sign storage
  // URLs, so the `src` prop churns; the created element keeps its own copy.
  const [capturedSrc, setCapturedSrc] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (!audioRef.current) {
        return;
      }

      audioRef.current.pause();

      if (activePreview === audioRef.current) {
        activePreview = null;
      }
    },
    [],
  );

  function toggle() {
    if (!src && !audioRef.current) {
      return;
    }

    if (!audioRef.current && src) {
      const audio = new Audio(src);

      audio.addEventListener("pause", () => setPlaying(false));
      audio.addEventListener("ended", () => setProgress(0));
      audio.addEventListener("timeupdate", () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setProgress(audio.currentTime / audio.duration);
        }
      });
      audioRef.current = audio;
      setCapturedSrc(src);
    }

    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (playing) {
      audio.pause();

      return;
    }

    if (activePreview && activePreview !== audio) {
      activePreview.pause();
    }

    activePreview = audio;
    void audio.play();
    setPlaying(true);
  }

  return {
    /** True once a preview was started and hasn't finished. */
    active: playing || progress > 0,
    playing,
    progress,
    src: capturedSrc,
    toggle,
  };
}

/** null = decode failed (fall back), array = ready. */
const peaksCache = new Map<string, number[] | null>();

async function loadWaveformPeaks(src: string): Promise<number[] | null> {
  try {
    const response = await fetch(src);

    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    const context = new OfflineAudioContext(1, 1, 44100);
    const decoded = await context.decodeAudioData(buffer);

    return computeWaveformPeaks(decoded.getChannelData(0));
  } catch {
    return null;
  }
}

/**
 * Fetches and decodes the preview audio into per-bar peaks once playback has
 * started. Returns undefined while loading and null when the audio can't be
 * decoded (e.g. a CORS-restricted source) — callers fall back to pulse bars.
 */
export function useWaveformPeaks(
  src: string | null,
): number[] | null | undefined {
  // The cache is read during render; this state only triggers the re-render
  // once a decode lands.
  const [, setDecodedCount] = useState(0);

  useEffect(() => {
    if (!src || peaksCache.has(src)) {
      return;
    }

    let cancelled = false;

    void loadWaveformPeaks(src).then((result) => {
      peaksCache.set(src, result);

      if (!cancelled) {
        setDecodedCount((count) => count + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return src ? peaksCache.get(src) : undefined;
}

/**
 * The track's waveform, lit bar-by-bar with playback progress. While peaks
 * are loading or undecodable, deterministic placeholder bars pulse instead —
 * still only while the preview is audible.
 */
export function PlaybackWaveform({
  peaks,
  playing = false,
  progress,
}: {
  peaks: number[] | null | undefined;
  playing?: boolean;
  progress: number;
}) {
  const bars = peaks ?? fallbackWaveformPeaks();
  const isFallback = !peaks;

  return (
    <div
      aria-hidden="true"
      className="flex h-6 w-full items-center gap-px"
      data-testid="track-waveform"
    >
      {bars.map((peak, index) => {
        // Fallback bars pulse across the whole strip; real peaks pulse only
        // around the playhead so the waveform never looks frozen mid-play.
        const pulsing =
          playing &&
          (isFallback || isNearPlayhead(index, progress, bars.length));

        return (
          <span
            className={cn(
              "min-h-[3px] flex-1 rounded-full bg-primary transition-opacity duration-200",
              pulsing && "eq-bar",
            )}
            key={index}
            style={{
              animationDelay: pulsing ? `${(index % 8) * 110}ms` : undefined,
              height: `${Math.round(peak * 100)}%`,
              opacity: progress * bars.length >= index + 0.5 ? 0.95 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}

const EQUALIZER_HEIGHTS = [0.45, 0.85, 0.6, 1, 0.5];

/**
 * Signature moment: generation in progress. Five ember bars oscillating while
 * a track is composing; static bars under reduced motion.
 */
export function ComposingEqualizer({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-4 items-center gap-[3px]", className)}
    >
      {EQUALIZER_HEIGHTS.map((height, index) => (
        <span
          className="eq-bar w-[3px] rounded-full bg-primary"
          key={index}
          style={{
            animationDelay: `${index * 140}ms`,
            height: `${height * 100}%`,
          }}
        />
      ))}
    </span>
  );
}
