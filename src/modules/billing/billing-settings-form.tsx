"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import {
  Bell,
  CheckCircle2,
  FileAudio,
  ImageIcon,
  Loader2,
  Save,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  updateWorkspaceSettingsAction,
  type WorkspaceSettingsActionState,
} from "@/modules/billing/billing.actions";
import type { BillingPageData } from "@/modules/billing/billing.types";

type BillingSettingsFormProps = {
  data: BillingPageData;
};

const initialState: WorkspaceSettingsActionState = {
  message: null,
  status: "idle",
};

export function BillingSettingsForm({ data }: BillingSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateWorkspaceSettingsAction,
    initialState,
  );
  const settings = data.settings;

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (state.status === "success") {
      toast.success(state.message);
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <input name="workspace_id" type="hidden" value={data.workspaceId} />

      <div className="grid gap-5">
        <SettingsPanel
          description="These values prefill YouTube publishing and scheduling flows."
          icon={<UploadCloud className="size-5" />}
          title="Publishing defaults"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              description="Used when creating uploads from generated tracks."
              label="Default channel"
            >
              <Select
                data-testid="settings-default-channel"
                defaultValue={settings.defaultYoutubeChannelId ?? ""}
                name="default_youtube_channel_id"
              >
                <option value="">No default channel</option>
                {data.channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              description="Applied to new YouTube uploads unless changed."
              label="Default privacy"
            >
              <Select
                data-testid="settings-default-privacy"
                defaultValue={settings.defaultPrivacyStatus}
                name="default_privacy_status"
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </Select>
            </Field>

            <Field
              description="Keeps publishing rights consistent across releases."
              label="Default license"
            >
              <Select
                defaultValue={settings.defaultLicense}
                name="default_license"
              >
                <option>Standard License</option>
                <option>Commercial License</option>
                <option>Creative Commons</option>
              </Select>
            </Field>

            <Field
              description="Controls scheduled upload times and reporting labels."
              label="Timezone"
            >
              <Select defaultValue={settings.timezone} name="timezone">
                <option value="America/Los_Angeles">
                  (GMT-07:00) Pacific Time (US & Canada)
                </option>
                <option value="America/New_York">
                  (GMT-04:00) Eastern Time (US & Canada)
                </option>
                <option value="Europe/Warsaw">(GMT+02:00) Warsaw</option>
                <option value="UTC">(GMT+00:00) UTC</option>
              </Select>
            </Field>
          </div>

          {data.channels.length === 0 ? (
            <p
              className="rounded-lg border border-violet-200/10 bg-slate-950/30 p-3 text-sm text-slate-400"
              data-testid="empty-state"
            >
              Connect a YouTube channel before choosing a default destination.
            </p>
          ) : null}
        </SettingsPanel>

        <SettingsPanel
          description="Generation values used when starting a new instrumental."
          icon={<FileAudio className="size-5" />}
          title="Generation defaults"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Default genre">
              <Select defaultValue={settings.defaultGenre} name="default_genre">
                <option>Synthwave</option>
                <option>Ambient</option>
                <option>Lo-fi</option>
                <option>Cinematic</option>
                <option>House</option>
              </Select>
            </Field>

            <Field label="Default mood">
              <Select defaultValue={settings.defaultMood} name="default_mood">
                <option>Night Drive</option>
                <option>Focused</option>
                <option>Uplifting</option>
                <option>Calm</option>
                <option>Dramatic</option>
              </Select>
            </Field>

            <Field label="Default key">
              <Select defaultValue={settings.defaultKey} name="default_key">
                <option value="auto">Auto</option>
                <option>A</option>
                <option>C</option>
                <option>D</option>
                <option>E</option>
              </Select>
            </Field>

            <Field label="Default BPM">
              <Select
                defaultValue={String(settings.defaultBpm)}
                name="default_bpm"
              >
                <option value="90">90</option>
                <option value="100">100</option>
                <option value="110">110</option>
                <option value="120">120</option>
                <option value="128">128</option>
                <option value="140">140</option>
              </Select>
            </Field>

            <Field label="Default format">
              <Select
                defaultValue={settings.defaultFormat}
                name="default_format"
              >
                <option>MP3 320kbps</option>
                <option>WAV 24-bit</option>
                <option>AAC 256kbps</option>
              </Select>
            </Field>
          </div>
        </SettingsPanel>

        <SettingsPanel
          description="Default artwork and processing choices for new videos."
          icon={<ImageIcon className="size-5" />}
          title="Assets and processing"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
            <Field
              description="Used as the static image when a track has no custom art."
              label="Default image"
            >
              <Select
                data-testid="settings-default-image"
                defaultValue={settings.defaultImageAssetId ?? ""}
                name="default_image_asset_id"
              >
                <option value="">No default image</option>
                {data.imageAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.fileName ?? asset.storagePath}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Storage location">
              <Select
                defaultValue={settings.defaultStorageLocation}
                name="default_storage_location"
              >
                <option value="library">My Library</option>
                <option value="workspace">Workspace Library</option>
                <option value="archive">Archive</option>
              </Select>
            </Field>
          </div>

          {data.imageAssets.length === 0 ? (
            <p className="rounded-lg border border-violet-200/10 bg-slate-950/30 p-3 text-sm text-slate-400">
              Add image assets before selecting a default video image.
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <ToggleRow
              defaultChecked={settings.autoNormalizeAudio}
              description="Match loudness before rendering upload videos."
              label="Auto-normalize audio"
              name="auto_normalize_audio"
            />
            <ToggleRow
              defaultChecked={settings.extractStemsOnUpload}
              description="Prepare stems when compatible source audio exists."
              label="Extract stems on upload"
              name="extract_stems_on_upload"
            />
          </div>
        </SettingsPanel>
      </div>

      <aside className="grid gap-5 self-start xl:sticky xl:top-5">
        <SettingsPanel
          description="Choose the email signals this workspace should receive."
          icon={<Bell className="size-5" />}
          title="Notification preferences"
        >
          <div className="grid gap-3">
            <ToggleRow
              defaultChecked={settings.notifyProductUpdates}
              description="New features and workflow improvements."
              label="Product updates"
              name="notify_product_updates"
            />
            <ToggleRow
              defaultChecked={settings.notifyGenerationCompletions}
              description="When generated tracks are ready."
              label="Generation completions"
              name="notify_generation_completions"
            />
            <ToggleRow
              defaultChecked={settings.notifyBillingPayments}
              description="Invoices, receipts, and payment issues."
              label="Billing and payments"
              name="notify_billing_payments"
            />
            <ToggleRow
              defaultChecked={settings.notifyMarketingEmails}
              description="Tips, tutorials, and occasional offers."
              label="Marketing emails"
              name="notify_marketing_emails"
            />
          </div>
        </SettingsPanel>

        <section className="bussin-panel rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-emerald-200/20 bg-emerald-400/10 text-emerald-100">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Workspace controls</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Save once to update every default on this page.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <ReadOnlyPreference label="Analytics" value="Enabled" />
            <ReadOnlyPreference label="Usage data" value="Standard" />
          </div>

          {state.message ? (
            <p
              className={cn(
                "mt-5 rounded-lg border px-3 py-2 text-sm",
                state.status === "success"
                  ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
                  : "border-red-300/20 bg-red-500/10 text-red-100",
              )}
            >
              {state.message}
            </p>
          ) : null}

          <SaveButton pending={pending}>Save settings</SaveButton>
        </section>
      </aside>
    </form>
  );
}

function SettingsPanel({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="mb-5 flex gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-violet-200/15 bg-violet-500/10 text-violet-200">
          {icon}
        </span>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Field({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-slate-200">{label}</span>
      {children}
      {description ? (
        <span className="text-xs leading-5 text-slate-500">{description}</span>
      ) : null}
    </label>
  );
}

function Select(props: React.ComponentProps<"select">) {
  return (
    <select
      className="h-10 min-w-0 rounded-lg border border-violet-200/15 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none transition focus:border-violet-300/45 focus:ring-2 focus:ring-violet-500/20"
      {...props}
    />
  );
}

function ToggleRow({
  defaultChecked,
  description,
  label,
  name,
}: {
  defaultChecked: boolean;
  description?: string;
  label: string;
  name?: string;
}) {
  return (
    <label className="grid min-h-[72px] grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-white/10 bg-slate-950/25 p-3 text-sm">
      <span>
        <span className="block font-medium text-slate-200">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        ) : null}
      </span>
      <input
        className="toggle toggle-sm border-slate-600 bg-slate-700 checked:border-violet-500 checked:bg-violet-500"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
    </label>
  );
}

function ReadOnlyPreference({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300">
        {value}
      </span>
    </div>
  );
}

function SaveButton({
  children,
  pending,
}: {
  children: ReactNode;
  pending: boolean;
}) {
  return (
    <Button
      className="mt-5 h-10 w-full"
      data-testid="settings-save"
      disabled={pending}
      type="submit"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save />}
      {children}
    </Button>
  );
}
