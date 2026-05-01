"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ImagePlus,
  Loader2,
  Music2,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createGenerationAction } from "@/modules/generation/generation.actions";
import type {
  CreateGenerationActionState,
  GenerateScreenData,
} from "@/modules/generation/generation.types";

const durationOptions = [90, 120, 150, 180, 240];
const durationLabels: Record<number, string> = {
  90: "1:30",
  120: "2:00",
  150: "2:30",
  180: "3:00",
  240: "4:00",
};
const previewBars = [
  28, 44, 36, 58, 72, 42, 50, 64, 40, 52, 48, 78, 66, 46, 58, 88, 62, 50, 72,
  44, 56, 82, 68, 48, 60, 40, 54, 76, 92, 66, 46, 58, 84, 52, 36, 72, 48, 40,
];

type Props = {
  data: GenerateScreenData;
  prefill?: GenerationPrefill;
};

export type GenerationPrefill = {
  durationSeconds?: number;
  imageAssetId?: string;
  mood?: string;
  style?: string;
};

export function CreateGenerationForm({ data, prefill }: Props) {
  const defaultChannelId =
    data.channels.find((channel) => channel.isDefault)?.id ??
    data.channels[0]?.id ??
    "";
  const [style, setStyle] = useState(prefill?.style ?? data.defaults.style);
  const [mood, setMood] = useState(prefill?.mood ?? data.defaults.mood);
  const [duration, setDuration] = useState(
    prefill?.durationSeconds ?? data.defaults.durationSeconds,
  );
  const [trackCount, setTrackCount] = useState(data.defaults.trackCount);
  const [channelId, setChannelId] = useState(defaultChannelId);
  const [imageAssetId, setImageAssetId] = useState(
    prefill?.imageAssetId &&
      data.images.some((image) => image.id === prefill.imageAssetId)
      ? prefill.imageAssetId
      : "",
  );
  const [publishMode, setPublishMode] = useState<
    "draft" | "publish_now" | "schedule_later"
  >("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [actionState, setActionState] =
    useState<CreateGenerationActionState | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedChannel = data.channels.find(
    (channel) => channel.id === channelId,
  );
  const selectedImage = data.images.find((image) => image.id === imageAssetId);
  const estimatedCredits = trackCount * generationCreditCost(duration);
  const disabledReason = getDisabledReason(data);
  const brief = useMemo(
    () =>
      `${style || "Instrumental"} track with a ${mood || "focused"} mood. Style: ${style || "TBD"}. Mood: ${
        mood || "TBD"
      }. Duration: ${formatDuration(duration)}.`,
    [duration, mood, style],
  );

  function submit(formData: FormData) {
    setActionState(null);
    startTransition(async () => {
      const result = await createGenerationAction(formData);

      setActionState(result);

      if (result.errors?.form) {
        toast.error(result.errors.form);
      } else if (result.errors) {
        toast.error("Check the highlighted fields before creating.");
      }
    });
  }

  return (
    <form
      action={submit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]"
      data-testid="screen-dashboard-generate"
    >
      <input name="duration_seconds" type="hidden" value={duration} />
      <input name="track_count" type="hidden" value={trackCount} />
      <input name="target_youtube_channel_id" type="hidden" value={channelId} />
      <input name="image_asset_id" type="hidden" value={imageAssetId} />
      <input name="publish_mode" type="hidden" value={publishMode} />

      <section className="min-w-0 space-y-4">
        {disabledReason ? <BlockingState reason={disabledReason} /> : null}
        {actionState?.errors?.form ? (
          <ErrorState message={actionState.errors.form} />
        ) : null}
        <StepRail />

        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d1729]/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_70px_rgba(0,0,0,0.24)]">
          <section className="p-5">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Describe your track
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Tell us what you want to hear. The more details, the better.
                </p>
              </div>
              <button
                className="flex items-center gap-1.5 text-sm text-violet-300"
                type="button"
              >
                <Sparkles className="size-4" />
                Tips
              </button>
            </div>
            <textarea
              className="h-[140px] w-full resize-none rounded-lg border border-white/10 bg-[#0b1324]/78 px-4 py-4 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-300/40 focus:ring-4 focus:ring-violet-500/15"
              data-testid="style-input"
              maxLength={5000}
              name="style"
              onChange={(event) => setStyle(event.target.value)}
              placeholder="Example: A nostalgic synthwave track with driving bass, cinematic pads, and a sense of late-night city energy. Inspired by 80s soundtracks and modern retrowave."
              value={style}
            />
            <FieldError message={actionState?.errors?.style} />
            <div className="mt-2 text-right text-xs text-slate-500">
              {style.length} / 5000
            </div>
          </section>

          <section className="grid border-t border-white/10 md:grid-cols-2">
            <div className="border-b border-white/10 p-5 md:border-r md:border-b-0">
              <FormLabel
                description="What style or genre should we create?"
                title="Music style"
              />
              <TokenInput
                icon={<Music2 className="size-4" />}
                name="style"
                onChange={setStyle}
                placeholder="Add style or genre..."
                value={style}
              />
            </div>
            <div className="p-5">
              <FormLabel
                description="How should it feel?"
                title="Mood / vibe"
              />
              <TokenInput
                icon={<Radio className="size-4" />}
                name="mood"
                onChange={setMood}
                placeholder="Add mood..."
                value={mood}
              />
              <FieldError message={actionState?.errors?.mood} />
            </div>
          </section>

          <section className="grid border-t border-white/10 md:grid-cols-[1fr_0.95fr]">
            <div className="border-b border-white/10 p-5 md:border-r md:border-b-0">
              <FormLabel
                description="How long should your track be?"
                title="Track duration"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="h-10 rounded-md border border-white/10 bg-[#0a1324] px-4 text-sm font-medium text-white"
                  type="button"
                >
                  {formatDuration(duration)}
                </button>
                {durationOptions.map((option) => (
                  <button
                    className={
                      option === duration
                        ? "h-10 rounded-md border border-violet-300/40 bg-violet-600 px-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.34)]"
                        : "h-10 rounded-md border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 hover:bg-white/[0.06]"
                    }
                    key={option}
                    onClick={() => setDuration(option)}
                    type="button"
                  >
                    {durationLabels[option]}
                  </button>
                ))}
              </div>
              <FieldError message={actionState?.errors?.duration_seconds} />
            </div>
            <div className="p-5">
              <FormLabel
                description="How many variations do you want?"
                title="Number of tracks"
              />
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-10 grid-cols-[42px_56px_42px] overflow-hidden rounded-md border border-white/10 bg-[#0a1324]">
                  <button
                    className="grid place-items-center text-slate-300 hover:bg-white/5"
                    onClick={() =>
                      setTrackCount((count) => Math.max(1, count - 1))
                    }
                    type="button"
                  >
                    -
                  </button>
                  <div className="grid place-items-center border-x border-white/10 text-white">
                    {trackCount}
                  </div>
                  <button
                    className="grid place-items-center text-slate-300 hover:bg-white/5"
                    onClick={() =>
                      setTrackCount((count) => Math.min(20, count + 1))
                    }
                    type="button"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  More tracks use more credits.
                </p>
              </div>
              <FieldError message={actionState?.errors?.track_count} />
            </div>
          </section>

          <section className="border-t border-white/10 p-5">
            <FormLabel
              description="Where should we publish this?"
              title="Target YouTube channel"
            />
            <label className="mt-3 flex h-10 items-center gap-3 rounded-md border border-white/10 bg-[#0a1324] px-4 text-sm text-slate-500">
              <Search className="size-4" />
              Search your connected channels...
            </label>
            <div className="mt-3 grid gap-2">
              {data.channels.map((channel) => (
                <button
                  className={
                    channel.id === channelId
                      ? "flex items-center justify-between gap-4 rounded-lg border border-violet-300/35 bg-violet-500/10 p-3 text-left"
                      : "flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.05]"
                  }
                  key={channel.id}
                  onClick={() => setChannelId(channel.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-700 to-violet-950 text-violet-100 shadow-[0_0_20px_rgba(124,58,237,0.28)]">
                      <Music2 className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">
                        {channel.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {channel.handle ?? "Connected channel"}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                      Connected
                    </span>
                    <ChevronDown className="size-4 text-slate-500" />
                  </span>
                </button>
              ))}
            </div>
            <FieldError
              message={actionState?.errors?.target_youtube_channel_id}
            />
          </section>

          <section className="border-t border-white/10 p-5">
            <FormLabel
              description="Use an existing cover image or upload one."
              title="Assets (optional)"
            />
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-2">
                <button
                  className={
                    imageAssetId === ""
                      ? "flex items-center justify-between rounded-lg border border-violet-300/35 bg-violet-500/10 px-4 py-3 text-left"
                      : "flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
                  }
                  onClick={() => setImageAssetId("")}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      Generate without image
                    </span>
                    <span className="text-xs text-slate-500">
                      Use saved asset defaults.
                    </span>
                  </span>
                  <ImagePlus className="size-5 text-violet-300" />
                </button>
                {data.images.slice(0, 3).map((image) => (
                  <button
                    className={
                      image.id === imageAssetId
                        ? "flex items-center justify-between rounded-lg border border-violet-300/35 bg-violet-500/10 px-4 py-3 text-left"
                        : "flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.05]"
                    }
                    key={image.id}
                    onClick={() => setImageAssetId(image.id)}
                    type="button"
                  >
                    <span>
                      <span className="block truncate text-sm font-semibold text-white">
                        {image.fileName ?? image.storagePath.split("/").pop()}
                      </span>
                      <span className="text-xs capitalize text-slate-500">
                        {image.source.replace("_", " ")}
                      </span>
                    </span>
                    <CheckCircle2
                      className={
                        image.id === imageAssetId
                          ? "size-5 text-emerald-300"
                          : "size-5 text-slate-600"
                      }
                    />
                  </button>
                ))}
              </div>
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-violet-300/25 bg-[#0a1324]/70 px-4 text-center hover:bg-violet-500/10">
                <UploadCloud className="size-6 text-violet-300" />
                <span className="mt-3 text-sm font-semibold text-white">
                  Upload image
                </span>
                <span className="mt-1 text-xs leading-5 text-slate-500">
                  PNG or JPG up to 6 MB
                </span>
                <input
                  accept="image/*"
                  className="sr-only"
                  name="image_file"
                  type="file"
                />
              </label>
            </div>
            <FieldError message={actionState?.errors?.image_asset_id} />
          </section>

          <section className="border-t border-white/10 p-5">
            <FormLabel
              description="Choose how and when to publish."
              title="Publish mode"
            />
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <PublishModeCard
                active={publishMode === "draft"}
                description="Save to library and review before publishing."
                icon={<Radio className="size-5" />}
                label="Draft (save only)"
                onClick={() => setPublishMode("draft")}
              />
              <PublishModeCard
                active={publishMode === "publish_now"}
                description="Generate and publish to YouTube immediately."
                icon={<UploadCloud className="size-5" />}
                label="Publish now"
                onClick={() => setPublishMode("publish_now")}
              />
              <PublishModeCard
                active={publishMode === "schedule_later"}
                description="Pick a date and time to publish automatically."
                icon={<CalendarDays className="size-5" />}
                label="Schedule later"
                onClick={() => setPublishMode("schedule_later")}
              />
            </div>
            {publishMode === "schedule_later" ? (
              <label className="mt-4 block max-w-sm">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Schedule datetime
                </span>
                <input
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0a1324] px-3 text-sm text-white outline-none focus:border-violet-300/40 focus:ring-4 focus:ring-violet-500/15"
                  name="scheduled_at"
                  onChange={(event) => setScheduledAt(event.target.value)}
                  type="datetime-local"
                  value={scheduledAt}
                />
              </label>
            ) : null}
            <FieldError message={actionState?.errors?.scheduled_at} />
          </section>

          <section className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Auto-apply defaults
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Use my saved defaults for this generation.
              </p>
            </div>
            <button
              aria-label="Auto-apply defaults"
              className="flex h-7 w-13 items-center justify-end rounded-full bg-violet-600 p-1 shadow-[0_0_18px_rgba(124,58,237,0.32)]"
              type="button"
            >
              <span className="size-5 rounded-full bg-white" />
            </button>
          </section>
        </div>
      </section>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d1729]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_28px_90px_rgba(0,0,0,0.34)]">
          <section className="p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Smart prompt preview
              </h2>
              <span className="rounded-md bg-violet-500/20 px-2 py-1 text-[11px] font-semibold text-violet-200">
                BETA
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              This is what our AI will use to create your music.
            </p>
            <div className="mt-6 flex h-16 items-center gap-1">
              {previewBars.map((height, index) => (
                <span
                  className="w-full rounded-full bg-gradient-to-t from-violet-600 via-violet-400 to-cyan-300"
                  key={`${height}-${index}`}
                  style={{ height }}
                />
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">{brief}</p>
            <Button
              className="mt-4 h-10 w-full border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
              type="button"
              variant="outline"
            >
              <RefreshCw className="size-4" />
              Regenerate preview
            </Button>
          </section>

          <SummarySection title="Selected defaults">
            <SummaryRow label="Model" value="Bussin v2" />
            <SummaryRow label="Audio quality" value="High (320 kbps)" />
            <SummaryRow label="License" value="All rights reserved" />
            <SummaryRow label="Visibility" value="Unlisted" />
            <SummaryRow
              label="Target channel"
              value={selectedChannel?.title ?? "No channel"}
            />
            <SummaryRow
              label="Asset"
              value={
                selectedImage?.fileName ??
                (imageAssetId ? "Selected image" : "Defaults on")
              }
            />
          </SummarySection>

          <SummarySection title="Est. jobs & credits">
            <SummaryRow label="Number of tracks" value={String(trackCount)} />
            <SummaryRow
              label="Estimated credits"
              value={estimatedCredits.toLocaleString()}
            />
            <SummaryRow
              label="Available credits"
              value={data.plan.availableCredits.toLocaleString()}
            />
            <div className="mt-5 rounded-lg border border-white/10 bg-[#0a1324]/80 p-4">
              <div className="flex items-start gap-3">
                <WandSparkles className="mt-0.5 size-5 text-violet-300" />
                <div>
                  <p className="text-sm text-slate-300">
                    1 generation = {generationCreditCost(duration)} credits (
                    {formatDuration(duration)} min)
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Credits will be deducted when the job starts.
                  </p>
                </div>
              </div>
            </div>
          </SummarySection>

          <section className="p-5">
            <Button
              className="h-14 w-full rounded-md text-base"
              data-testid="primary-action"
              disabled={Boolean(disabledReason) || isPending}
              type="submit"
            >
              {isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
              {isPending ? "Creating..." : "Create generation"}
            </Button>
            <p className="mt-4 text-center text-xs text-slate-500">
              You can review and publish after generation.
            </p>
          </section>
        </div>
      </aside>
    </form>
  );
}

function StepRail() {
  const steps = ["Your idea", "Customize", "Assets (optional)", "Publish"];

  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1729]/86 px-4 py-3">
      <ol className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <li className="flex items-center gap-3" key={step}>
            <span
              className={
                index === 0
                  ? "grid size-8 place-items-center rounded-full bg-violet-600 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]"
                  : "grid size-8 place-items-center rounded-full border border-white/12 bg-white/[0.03] text-sm text-slate-400"
              }
            >
              {index + 1}
            </span>
            <span
              className={
                index === 0
                  ? "text-sm font-semibold text-white"
                  : "text-sm text-slate-400"
              }
            >
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TokenInput({
  icon,
  name,
  onChange,
  placeholder,
  value,
}: {
  icon: React.ReactNode;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  return (
    <div className="mt-3 flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#0a1324] p-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tokens.slice(0, 2).map((token) => (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-violet-300/20 bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-100"
            key={token}
          >
            {token}
            <X className="size-3 text-violet-200/80" />
          </span>
        ))}
      </div>
      <input
        className="min-w-28 flex-1 bg-transparent px-1 text-sm text-slate-100 outline-none placeholder:text-slate-500"
        name={name === "mood" ? "mood" : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 text-slate-400">
        {icon}
      </span>
    </div>
  );
}

function PublishModeCard({
  active,
  description,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "min-h-[116px] rounded-lg border border-violet-400/60 bg-violet-600/14 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "min-h-[116px] rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.05]"
      }
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            active
              ? "grid size-8 place-items-center rounded-md bg-violet-500 text-white"
              : "grid size-8 place-items-center rounded-md bg-white/[0.05] text-slate-300"
          }
        >
          {icon}
        </span>
        <span className="size-5 rounded-full border border-slate-500">
          {active ? (
            <span className="m-1 block size-3 rounded-full bg-violet-300" />
          ) : null}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </button>
  );
}

function BlockingState({ reason }: { reason: string }) {
  return (
    <section
      className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-5 py-4"
      data-testid="empty-state"
    >
      <div className="flex gap-3">
        <CircleAlert className="mt-0.5 size-5 text-amber-200" />
        <div>
          <p className="font-semibold text-amber-100">Setup needed</p>
          <p className="mt-1 text-sm text-amber-100/75">{reason}</p>
        </div>
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section
      className="rounded-lg border border-red-300/20 bg-red-500/10 px-5 py-4 text-sm text-red-100"
      data-testid="error-state"
    >
      {message}
    </section>
  );
}

function SummarySection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-white/10 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[220px] truncate text-right text-white">
        {value}
      </span>
    </div>
  );
}

function FormLabel({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-2 text-sm text-red-200">{message}</p>
  ) : null;
}

function getDisabledReason(data: GenerateScreenData) {
  if (!data.hasSunoConnection) {
    return "Connect Suno before creating tracks.";
  }

  if (data.channels.length === 0) {
    return "Connect a YouTube channel before creating a generation.";
  }

  if (data.plan.planLimitReached) {
    return "Your plan limit has been reached for this billing period.";
  }

  return "";
}

function generationCreditCost(durationSeconds: number) {
  return Math.max(100, Math.round(durationSeconds / 30) * 80);
}

function formatDuration(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = String(durationSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}
