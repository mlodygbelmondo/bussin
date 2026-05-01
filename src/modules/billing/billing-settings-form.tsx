"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import {
  Bell,
  FileAudio,
  Globe2,
  ImageIcon,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
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
    <form action={formAction} className="grid gap-4 xl:grid-cols-4">
      <input name="workspace_id" type="hidden" value={data.workspaceId} />

      <SettingsPanel
        description="Set defaults for new uploads and project imports."
        icon={<FileAudio className="size-5" />}
        title="Upload defaults"
      >
        <Field label="Default channel">
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
        {data.channels.length === 0 ? (
          <p
            className="rounded-md border border-violet-200/10 bg-slate-950/30 p-3 text-xs text-slate-400"
            data-testid="empty-state"
          >
            Connect a YouTube channel to use it as an upload default.
          </p>
        ) : null}
        <Field label="Default license">
          <Select defaultValue={settings.defaultLicense} name="default_license">
            <option>Standard License</option>
            <option>Commercial License</option>
            <option>Creative Commons</option>
          </Select>
        </Field>
        <ToggleRow
          defaultChecked={settings.autoNormalizeAudio}
          label="Auto-normalize audio"
          name="auto_normalize_audio"
        />
        <ToggleRow
          defaultChecked={settings.extractStemsOnUpload}
          label="Extract stems on upload"
          name="extract_stems_on_upload"
        />
        <Field label="Default storage location">
          <Select
            defaultValue={settings.defaultStorageLocation}
            name="default_storage_location"
          >
            <option value="library">My Library</option>
            <option value="workspace">Workspace Library</option>
            <option value="archive">Archive</option>
          </Select>
        </Field>
        <SaveButton pending={pending}>Save changes</SaveButton>
      </SettingsPanel>

      <SettingsPanel
        description="Control your locale and privacy preferences."
        icon={<Globe2 className="size-5" />}
        title="Timezone & privacy"
      >
        <Field label="Timezone">
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
        <Field label="Default privacy">
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
        <ReadOnlyPreference label="Analytics" value="Enabled" />
        <ReadOnlyPreference label="Usage data" value="Standard" />
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 pt-2 text-sm">
          <span className="text-slate-300">Download my data</span>
          <Button size="sm" type="button" variant="outline">
            Request data
          </Button>
        </div>
        <SaveButton pending={pending}>Save changes</SaveButton>
      </SettingsPanel>

      <SettingsPanel
        description="Set defaults for generation outputs and assets."
        icon={<ImageIcon className="size-5" />}
        title="Asset defaults"
      >
        <Field label="Default image">
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
        {data.imageAssets.length === 0 ? (
          <p className="rounded-md border border-violet-200/10 bg-slate-950/30 p-3 text-xs text-slate-400">
            Add image assets to make one the default for new videos.
          </p>
        ) : null}
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
          <Select defaultValue={String(settings.defaultBpm)} name="default_bpm">
            <option value="90">90</option>
            <option value="100">100</option>
            <option value="110">110</option>
            <option value="120">120</option>
            <option value="128">128</option>
            <option value="140">140</option>
          </Select>
        </Field>
        <Field label="Default format">
          <Select defaultValue={settings.defaultFormat} name="default_format">
            <option>MP3 320kbps</option>
            <option>WAV 24-bit</option>
            <option>AAC 256kbps</option>
          </Select>
        </Field>
        <SaveButton pending={pending}>Save changes</SaveButton>
      </SettingsPanel>

      <SettingsPanel
        description="Choose how and when we notify you."
        icon={<Bell className="size-5" />}
        title="Notification preferences"
      >
        <ToggleRow
          defaultChecked={settings.notifyProductUpdates}
          description="New features and improvements"
          label="Product updates"
          name="notify_product_updates"
        />
        <ToggleRow
          defaultChecked={settings.notifyGenerationCompletions}
          description="When your tracks are ready"
          label="Generation completions"
          name="notify_generation_completions"
        />
        <ToggleRow
          defaultChecked={settings.notifyBillingPayments}
          description="Invoices and payment issues"
          label="Billing & payments"
          name="notify_billing_payments"
        />
        <ToggleRow
          defaultChecked={settings.notifyMarketingEmails}
          description="Tips, tutorials, and offers"
          label="Marketing emails"
          name="notify_marketing_emails"
        />
        <SaveButton pending={pending}>Save preferences</SaveButton>
      </SettingsPanel>
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
    <section className="bussin-panel flex min-h-[420px] flex-col rounded-lg p-5">
      <div className="mb-5 flex gap-3">
        <span className="grid size-8 place-items-center rounded-md bg-violet-500/10 text-violet-200">
          {icon}
        </span>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm md:grid-cols-[128px_1fr] md:items-center">
      <span className="text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Select(props: React.ComponentProps<"select">) {
  return (
    <select
      className="h-9 min-w-0 rounded-md border border-violet-200/15 bg-slate-950/35 px-3 text-sm text-slate-100 outline-none transition focus:border-violet-300/45 focus:ring-2 focus:ring-violet-500/20"
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
    <label className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
      <span>
        <span className="block text-slate-300">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-slate-500">
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
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="rounded-md border border-white/10 bg-slate-950/35 px-2.5 py-1 text-xs font-medium text-slate-400">
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
      className="mt-auto h-10 w-full"
      data-testid="settings-save"
      disabled={pending}
      type="submit"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save />}
      {children}
    </Button>
  );
}
