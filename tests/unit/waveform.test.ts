import { describe, expect, it } from "vitest";
import {
  computeWaveformPeaks,
  fallbackWaveformPeaks,
  WAVEFORM_BAR_COUNT,
} from "@/modules/feed/waveform";

describe("computeWaveformPeaks", () => {
  it("returns one normalized peak per bar with the loudest at 1", () => {
    const samples = new Float32Array(4000);

    // Quiet first half, loud second half.
    samples.fill(0.1, 0, 2000);
    samples.fill(0.8, 2000);

    const peaks = computeWaveformPeaks(samples, 4);

    expect(peaks).toHaveLength(4);
    expect(peaks?.[3]).toBe(1);
    expect(peaks?.[0]).toBeLessThan(peaks?.[3] ?? 0);
  });

  it("clamps quiet buckets to a visible floor", () => {
    const samples = new Float32Array(4000);

    samples.fill(0.001, 0, 2000);
    samples.fill(1, 2000);

    const peaks = computeWaveformPeaks(samples, 4);

    for (const peak of peaks ?? []) {
      expect(peak).toBeGreaterThanOrEqual(0.16);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  it("returns null for empty or silent audio", () => {
    expect(computeWaveformPeaks(new Float32Array(0))).toBeNull();
    expect(computeWaveformPeaks(new Float32Array(1000))).toBeNull();
  });

  it("defaults to the shared bar count", () => {
    const samples = new Float32Array(44100).fill(0.5);

    expect(computeWaveformPeaks(samples)).toHaveLength(WAVEFORM_BAR_COUNT);
  });
});

describe("fallbackWaveformPeaks", () => {
  it("is deterministic and stays within the visible range", () => {
    const peaks = fallbackWaveformPeaks();

    expect(peaks).toHaveLength(WAVEFORM_BAR_COUNT);
    expect(peaks).toEqual(fallbackWaveformPeaks());

    for (const peak of peaks) {
      expect(peak).toBeGreaterThanOrEqual(0.16);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });
});
