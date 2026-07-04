/*
 * Pure waveform math for the track-card playback waveform — kept free of DOM
 * and Web Audio so it stays unit-testable. The components live in
 * track-waveform.tsx.
 */

export const WAVEFORM_BAR_COUNT = 40;

/** Bars never collapse below this so the strip reads as a waveform, not dust. */
const MIN_PEAK = 0.16;

/**
 * Reduces decoded PCM samples to per-bar RMS peaks, normalized so the loudest
 * bar hits 1. Returns null when the audio is empty or silent.
 */
export function computeWaveformPeaks(
  samples: Float32Array,
  barCount = WAVEFORM_BAR_COUNT,
): number[] | null {
  if (samples.length === 0 || barCount <= 0) {
    return null;
  }

  const bucketSize = Math.max(1, Math.floor(samples.length / barCount));
  const peaks: number[] = [];

  for (let bar = 0; bar < barCount; bar += 1) {
    const start = bar * bucketSize;
    const end = Math.min(start + bucketSize, samples.length);

    if (start >= samples.length) {
      peaks.push(0);
      continue;
    }

    let sumOfSquares = 0;

    for (let index = start; index < end; index += 1) {
      sumOfSquares += samples[index] * samples[index];
    }

    peaks.push(Math.sqrt(sumOfSquares / (end - start)));
  }

  const loudest = Math.max(...peaks);

  if (loudest === 0) {
    return null;
  }

  return peaks.map((peak) => Math.max(peak / loudest, MIN_PEAK));
}

/**
 * Placeholder bar heights while peaks are loading or undecodable: a gentle
 * deterministic swell so the strip still reads as sound.
 */
export function fallbackWaveformPeaks(barCount = WAVEFORM_BAR_COUNT): number[] {
  return Array.from({ length: barCount }, (_, index) => {
    const swell = Math.sin((index / barCount) * Math.PI);
    const ripple = 0.18 * Math.sin(index * 2.7);

    return Math.min(1, Math.max(MIN_PEAK, 0.35 + 0.45 * swell + ripple));
  });
}
