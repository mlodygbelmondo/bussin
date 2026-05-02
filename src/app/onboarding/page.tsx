import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  Check,
  CheckCircle2,
  ChevronDown,
  Headphones,
  Music2,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME, isMockMode, mockUser } from "@/lib/app-config";
import {
  completeOnboardingAction,
  saveDefaultsAction,
  saveSunoConnectionAction,
  startYoutubeOAuthAction,
} from "@/modules/onboarding/onboarding.actions";
import {
  createEmptyOnboardingData,
  getOnboardingData,
} from "@/modules/onboarding/onboarding.queries";
import type { OnboardingData } from "@/modules/onboarding/onboarding.types";
import { createClient } from "@/lib/supabase/server";

const steps = [
  "Connect Suno",
  "Connect YouTube",
  "Choose defaults",
  "Create first generation",
];

export default async function OnboardingPage() {
  const data = await loadOnboardingData();
  const suno = data.sunoConnections[0];
  const sunoConnected = data.sunoConnections.some(isConnected);
  const youtubeConnected = data.youtubeConnections.some(isConnected);
  const defaultChannel = data.youtubeChannels.find(
    (channel) => channel.id === data.workspaceDefaults.defaultChannelId,
  );
  const currentStep = getCurrentStep(data);

  return (
    <main
      className="min-h-[100dvh] overflow-hidden bg-[#070d20] px-4 py-7 text-slate-100 sm:px-7 lg:px-10"
      data-testid="screen-onboarding"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_21%_8%,rgba(129,86,255,0.2),transparent_24rem),radial-gradient(circle_at_76%_8%,rgba(46,118,255,0.16),transparent_28rem),linear-gradient(180deg,rgba(6,10,26,0.35),rgba(6,12,28,0.96))]" />
      <div className="relative mx-auto max-w-[1448px]">
        <header className="flex items-center justify-between gap-4">
          <Link
            className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-white"
            href="/"
          >
            <span className="grid size-8 place-items-center text-violet-300">
              <AudioWaveform className="size-8" />
            </span>
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-400 sm:inline">Need help?</span>
            <Button className="h-9" variant="outline">
              <Headphones className="size-4" />
              Contact support
            </Button>
          </div>
        </header>

        <OnboardingStepper currentStep={currentStep} />

        <section className="mt-12 text-center">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-white md:text-5xl">
            Let&apos;s get you set up
          </h1>
          <p className="mt-3 text-base text-slate-400">
            Connect your accounts and set your preferences to start creating.
          </p>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-4">
          <SunoCard connection={suno} />
          <YoutubeCard connected={youtubeConnected} />
          <DefaultsCard
            data={data}
            defaultChannelTitle={defaultChannel?.title}
            formId="onboarding-complete-form"
          />
          <FirstGenerationCard ready={sunoConnected && youtubeConnected} />
        </section>

        <section className="mt-5 rounded-lg border border-slate-300/12 bg-slate-900/42 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_60px_rgba(0,0,0,0.28)] md:flex md:items-center md:justify-between md:gap-8">
          <div className="flex max-w-2xl items-center gap-5">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-violet-500/15 shadow-[0_0_42px_rgba(139,92,246,0.42)]">
              <ShieldCheck className="size-9 text-violet-200" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Your data is secure</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                We use industry-standard encryption and secure OAuth
                connections. Your data is never shared or sold.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 md:mt-0 md:min-w-[420px]">
            <div className="flex gap-4">
              <Button className="h-12 flex-1" variant="outline">
                Skip for now
              </Button>
              <form
                action={completeOnboardingAction}
                className="flex-1"
                id="onboarding-complete-form"
              >
                <Button
                  className="h-12 w-full"
                  data-testid="primary-action"
                  type="submit"
                >
                  Save & continue
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            </div>
            <p className="text-center text-xs text-slate-500">
              You can always change these settings later.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

async function loadOnboardingData() {
  if (isMockMode) {
    return getOnboardingData({
      supabase: null as never,
      userId: mockUser.id,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createEmptyOnboardingData();
  }

  return getOnboardingData({ supabase, userId: user.id });
}

function getCurrentStep(data: OnboardingData) {
  const sunoConnected = data.sunoConnections.some(isConnected);
  const youtubeConnected = data.youtubeConnections.some(isConnected);

  if (!sunoConnected) {
    return 1;
  }

  if (!youtubeConnected) {
    return 2;
  }

  if (!data.workspaceDefaults.defaultChannelId) {
    return 3;
  }

  return 4;
}

function isConnected(connection: { status: string }) {
  return connection.status === "connected";
}

function OnboardingStepper({ currentStep }: { currentStep: number }) {
  return (
    <nav
      aria-label="Onboarding progress"
      className="mx-auto mt-14 grid max-w-5xl grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto] items-center gap-3"
      data-testid="onboarding-stepper"
    >
      {steps.map((step, index) => {
        const number = index + 1;
        const active = number === currentStep;
        const complete = number < currentStep;

        return (
          <div className="contents" key={step}>
            <div className="flex items-center gap-3">
              <span
                className={
                  active || complete
                    ? "grid size-8 place-items-center rounded-full border border-violet-200/40 bg-gradient-to-br from-violet-400 to-violet-700 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.36)]"
                    : "grid size-8 place-items-center rounded-full border border-slate-500/35 bg-slate-800/80 text-sm font-semibold text-slate-300"
                }
              >
                {complete ? <Check className="size-4" /> : number}
              </span>
              <span
                className={
                  active
                    ? "hidden whitespace-nowrap text-sm font-semibold text-white md:inline"
                    : "hidden whitespace-nowrap text-sm text-slate-300 md:inline"
                }
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span
                className={
                  complete
                    ? "h-px min-w-10 bg-violet-400/75"
                    : "h-px min-w-10 bg-slate-500/35"
                }
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function StepBadge({ children }: { children: React.ReactNode }) {
  return <Badge variant="secondary">{children}</Badge>;
}

function SetupCard({
  active,
  children,
  description,
  step,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  description: string;
  step: string;
  title: string;
}) {
  return (
    <article
      className={`rounded-lg border bg-slate-900/46 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_60px_rgba(0,0,0,0.28)] ${
        active
          ? "border-violet-400/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_0_0_1px_rgba(139,92,246,0.12),0_0_42px_rgba(139,92,246,0.18)]"
          : "border-slate-300/12"
      }`}
    >
      <StepBadge>{step}</StepBadge>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-violet-300">
        {title}
      </h2>
      <p className="mt-2 min-h-12 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
      <div className="mt-7">{children}</div>
    </article>
  );
}

function SunoCard({
  connection,
}: {
  connection: OnboardingData["sunoConnections"][number] | undefined;
}) {
  const connected = connection?.status === "connected";

  return (
    <SetupCard
      active
      description="Securely connect your Suno account to generate music."
      step="Step 1 of 4"
      title="Connect Suno"
    >
      <div
        className="rounded-lg border border-slate-300/12 bg-slate-950/35 p-5 text-center"
        data-testid="suno-connection-card"
      >
        <div className="mx-auto grid size-16 place-items-center rounded-xl border border-slate-200/15 bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <Music2 className="size-9 fill-white text-white" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-white">Suno</h3>
        <div className="mt-4">
          <StatusBadge connected={connected} />
        </div>
        {connected ? (
          <div className="mt-6 flex items-center justify-between rounded-md border border-slate-300/12 bg-slate-950/35 p-3 text-sm text-slate-400">
            <span>{connection.label ?? "alexm@suno.com"}</span>
            <Button size="sm" variant="outline">
              Disconnect
            </Button>
          </div>
        ) : (
          <form action={saveSunoConnectionAction} className="mt-6 space-y-3">
            <Input name="label" placeholder="Suno account label" />
            <Input
              name="api_url"
              placeholder="https://api.sunoapi.org"
              required
              type="url"
            />
            <Input
              name="cookie"
              placeholder="Suno session cookie"
              required
              type="password"
            />
            <Button className="w-full" type="submit">
              Test & save Suno
            </Button>
          </form>
        )}
      </div>

      <div className="mt-6 space-y-5">
        {[
          ["Secure OAuth connections", "We never store your password."],
          [
            "Read & generate access only",
            "We can't change your account settings.",
          ],
          ["You can disconnect anytime", "Revoke access at any time."],
        ].map(([title, copy]) => (
          <div className="flex gap-4" key={title}>
            <ShieldCheck className="mt-0.5 size-5 text-slate-300" />
            <div>
              <p className="text-sm font-medium text-slate-100">{title}</p>
              <p className="mt-1 text-xs text-slate-500">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </SetupCard>
  );
}

function YoutubeCard({ connected }: { connected: boolean }) {
  return (
    <SetupCard
      description="Connect your YouTube channel to publish your tracks."
      step="Step 2 of 4"
      title="Connect YouTube"
    >
      <div
        className="rounded-lg border border-slate-300/12 bg-slate-950/35 p-5 text-center"
        data-testid="youtube-connection-card"
      >
        <div className="mx-auto grid size-16 place-items-center rounded-xl border border-slate-200/15 bg-gradient-to-br from-zinc-600 to-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <Play className="size-10 fill-red-500 text-red-500" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-white">YouTube</h3>
        <div className="mt-4">
          <StatusBadge connected={connected} />
        </div>
        <form action={startYoutubeOAuthAction} className="mt-6">
          <Button className="h-12 w-full" type="submit">
            {connected ? "Reconnect YouTube" : "Connect YouTube"}
          </Button>
        </form>
      </div>

      <div className="mt-5 rounded-lg border border-slate-300/12 bg-slate-950/35 p-5">
        <h3 className="font-semibold text-white">Why connect YouTube?</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-400">
          {[
            "Publish directly to your channel",
            "Track performance & engagement",
            "Save time with one-click publishing",
          ].map((item) => (
            <li className="flex gap-3" key={item}>
              <Check className="mt-0.5 size-4 text-slate-300" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-slate-400">
          You&apos;ll be redirected to Google to authorize access.
        </p>
      </div>
    </SetupCard>
  );
}

function DefaultsCard({
  data,
  defaultChannelTitle,
  formId,
}: {
  data: OnboardingData;
  defaultChannelTitle: string | undefined;
  formId: string;
}) {
  return (
    <SetupCard
      description="Set your default preferences. You can change these anytime."
      step="Step 3 of 4"
      title="Choose defaults"
    >
      <div className="space-y-5">
        <SelectField
          help="Where your music will be published by default."
          label="Default channel"
          formId={formId}
          name="defaultChannelId"
          value={data.workspaceDefaults.defaultChannelId}
        >
          {data.youtubeChannels.length ? (
            data.youtubeChannels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.title ?? channel.youtube_channel_id}
              </option>
            ))
          ) : (
            <option value="">Select a channel</option>
          )}
        </SelectField>
        <SelectField
          help="You can change the privacy for each upload."
          label="Privacy setting"
          formId={formId}
          name="privacyStatus"
          value={data.workspaceDefaults.privacyStatus}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
        </SelectField>
        <SelectField
          help="Used for scheduling and publishing."
          label="Timezone"
          formId={formId}
          name="timezone"
          value={data.workspaceDefaults.timezone}
        >
          <option value="America/Los_Angeles">
            (GMT-7) Pacific Time (US & Canada)
          </option>
          <option value="America/New_York">
            (GMT-4) Eastern Time (US & Canada)
          </option>
          <option value="Europe/Warsaw">(GMT+2) Warsaw</option>
        </SelectField>
        <SelectField
          help="We'll generate images for your uploads."
          label="Default image behavior"
          formId={formId}
          name="imageBehavior"
          value={data.workspaceDefaults.imageBehavior}
        >
          <option value="auto">Auto-generate with AI</option>
          <option value="manual">I&apos;ll upload images manually</option>
        </SelectField>

        <div className="rounded-lg border border-violet-300/12 bg-slate-950/35 p-4">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 size-5 text-violet-300" />
            <p className="text-sm leading-relaxed text-slate-400">
              Tip: These defaults save time.
              <br />
              {defaultChannelTitle
                ? `${defaultChannelTitle} is ready for uploads.`
                : "You can override them for each upload."}
            </p>
          </div>
        </div>

        <Button
          className="h-11 w-full"
          form={formId}
          formAction={saveDefaultsAction}
          type="submit"
          variant="outline"
        >
          Save defaults
        </Button>
      </div>
    </SetupCard>
  );
}

function FirstGenerationCard({ ready }: { ready: boolean }) {
  return (
    <SetupCard
      description="You're all set! Let's create your first track and publish it."
      step="Step 4 of 4"
      title="Create first generation"
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-slate-300/12 bg-[#071127]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,rgba(111,63,255,0.46),transparent_34%),radial-gradient(circle_at_72%_46%,rgba(26,199,255,0.2),transparent_22%)]" />
        <div className="absolute right-8 bottom-9 left-8 h-16 rounded-[18px] border border-cyan-300/25 bg-slate-950/50 shadow-[0_18px_55px_rgba(0,0,0,0.55)]" />
        <div className="absolute right-12 bottom-14 left-12 flex h-28 items-end gap-1.5">
          {[28, 54, 38, 82, 112, 65, 138, 92, 52, 75, 105, 62, 36].map(
            (height, index) => (
              <span
                className="flex-1 rounded-t bg-gradient-to-t from-violet-600 via-fuchsia-400 to-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.34)]"
                key={`${height}-${index}`}
                style={{ height }}
              />
            ),
          )}
        </div>
        <Music2 className="absolute top-10 right-24 size-9 text-indigo-300" />
      </div>

      <div className="mt-7 space-y-5">
        {[
          ["Generate with Suno", "Create your first track with AI."],
          ["Preview & refine", "Fine-tune your sound and vibe."],
          ["Publish to YouTube", "Share with the world in one click."],
        ].map(([title, copy]) => (
          <div className="flex gap-4" key={title}>
            <CheckCircle2 className="mt-0.5 size-5 text-slate-300" />
            <div>
              <p className="text-sm font-medium text-slate-100">{title}</p>
              <p className="mt-1 text-xs text-slate-500">{copy}</p>
            </div>
          </div>
        ))}
      </div>

      <form action={completeOnboardingAction} className="mt-8">
        <Button className="h-12 w-full" disabled={!ready} type="submit">
          <Rocket className="size-4" />
          Create first generation
        </Button>
      </form>
    </SetupCard>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <Badge className="border-emerald-300/20 bg-emerald-500/18 text-emerald-200">
        <CheckCircle2 className="size-3" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge className="border-amber-300/20 bg-amber-500/10 text-amber-200">
      <TriangleAlert className="size-3" />
      Not connected
    </Badge>
  );
}

function SelectField({
  children,
  formId,
  help,
  label,
  name,
  value,
}: {
  children: React.ReactNode;
  formId?: string;
  help: string;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <span className="relative mt-2 block">
        <select
          className="h-10 w-full appearance-none rounded-md border border-slate-300/14 bg-slate-950/35 px-3 pr-9 text-sm text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none focus:border-violet-300/60 focus:ring-3 focus:ring-violet-400/20"
          defaultValue={value}
          form={formId}
          name={name}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" />
      </span>
      <span className="mt-2 block text-xs text-slate-500">{help}</span>
    </label>
  );
}
