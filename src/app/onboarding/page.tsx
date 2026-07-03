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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isMockMode, mockUser } from "@/lib/app-config";
import { APP_NAME } from "@/lib/app-public-config";
import { cn } from "@/lib/utils";
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

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ suno_error?: string | string[] }>;
}) {
  const data = await loadOnboardingData();
  const { suno_error: sunoErrorParam } = await searchParams;
  const sunoError = Array.isArray(sunoErrorParam)
    ? sunoErrorParam[0]
    : sunoErrorParam;
  const suno = data.sunoConnections[0];
  const sunoConnected = data.sunoConnections.some(isConnected);
  const youtubeConnected = data.youtubeConnections.some(isConnected);
  const defaultChannel = data.youtubeChannels.find(
    (channel) => channel.id === data.workspaceDefaults.defaultChannelId,
  );
  const currentStep = getCurrentStep(data);

  return (
    <main
      className="min-h-[100dvh] bg-background px-4 py-7 text-foreground sm:px-7 lg:px-10"
      data-testid="screen-onboarding"
    >
      <div className="mx-auto max-w-[1180px]">
        <header className="flex items-center justify-between gap-4">
          <Link
            className="font-display flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground"
            href="/"
          >
            <span className="grid size-8 place-items-center text-primary">
              <AudioWaveform className="size-8" />
            </span>
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              Need help?
            </span>
            <Button asChild className="h-9" variant="ghost">
              <a href="mailto:support@bussin.app">
                <Headphones className="size-4" />
                Contact support
              </a>
            </Button>
          </div>
        </header>

        <OnboardingStepper currentStep={currentStep} />

        <section className="mt-12 text-center">
          <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight text-foreground md:text-5xl">
            Let&apos;s get you set up
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Connect your accounts and you&apos;re ready to create.
          </p>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-4">
          <SunoCard connection={suno} errorMessage={sunoError} />
          <YoutubeCard connected={youtubeConnected} />
          <DefaultsCard
            data={data}
            defaultChannelTitle={defaultChannel?.title}
            formId="onboarding-complete-form"
          />
          <FirstGenerationCard ready={sunoConnected && youtubeConnected} />
        </section>

        <section className="mt-5 rounded-xl border border-line bg-card/80 p-6 md:flex md:items-center md:justify-between md:gap-8">
          <div className="flex max-w-2xl items-center gap-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-secondary text-primary">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">
                Your data is secure
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                We use industry-standard encryption and secure OAuth
                connections. Your data is never shared or sold.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 md:mt-0 md:min-w-[420px]">
            <div className="flex gap-4">
              <Button asChild className="h-12 flex-1" variant="outline">
                <Link href="/dashboard">Skip for now</Link>
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
            <p className="text-center text-xs text-muted-foreground">
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
                    ? complete
                      ? "grid size-6 place-items-center rounded-full border border-primary bg-primary/15 text-xs font-semibold text-primary"
                      : "grid size-6 place-items-center rounded-full border border-primary bg-primary text-xs font-semibold text-primary-foreground"
                    : "grid size-6 place-items-center rounded-full border border-line text-xs font-semibold text-muted-foreground"
                }
              >
                {complete ? <Check className="size-4" /> : number}
              </span>
              <span
                className={
                  active
                    ? "hidden whitespace-nowrap text-sm font-semibold text-foreground md:inline"
                    : "hidden whitespace-nowrap text-sm text-muted-foreground md:inline"
                }
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span
                className={
                  complete
                    ? "h-px min-w-10 bg-primary/50"
                    : "h-px min-w-10 bg-line"
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
    <Card
      className={cn(
        "rounded-xl border-line bg-card/80 p-6 py-6",
        active ? "border-primary/50" : undefined,
      )}
    >
      <CardHeader>
        <StepBadge>{step}</StepBadge>
        <CardTitle className="font-display mt-3 text-2xl tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="min-h-12">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SunoCard({
  connection,
  errorMessage,
}: {
  connection: OnboardingData["sunoConnections"][number] | undefined;
  errorMessage: string | undefined;
}) {
  const connected = connection?.status === "connected";
  const storedError =
    connection?.status === "error"
      ? "The last connection test failed. Save the key again to retry."
      : undefined;
  const visibleError = errorMessage ?? storedError;

  return (
    <SetupCard
      active
      description="Bring your own Suno API key so tracks generate on your account and credits."
      step="Step 1 of 4"
      title="Connect Suno"
    >
      <div
        className="rounded-lg border border-line bg-panel p-5 text-center"
        data-testid="suno-connection-card"
      >
        <div className="mx-auto grid size-14 place-items-center rounded-lg border border-line bg-secondary text-primary">
          <Music2 className="size-7" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-foreground">Suno</h3>
        <div className="mt-4">
          <StatusBadge connected={connected} />
        </div>
        {!connected && visibleError ? (
          <p
            className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-left text-sm text-danger"
            data-testid="suno-connection-error"
          >
            {visibleError}
          </p>
        ) : null}
        {connected ? (
          <div className="mt-6 rounded-md border border-line bg-secondary p-3 text-sm text-muted-foreground">
            <span>{connection.label ?? "Suno connection"}</span>
          </div>
        ) : (
          <form action={saveSunoConnectionAction} className="mt-6 space-y-3">
            <Input name="label" placeholder="Connection label (optional)" />
            <Input
              defaultValue="https://api.sunoapi.org"
              name="api_url"
              placeholder="https://api.sunoapi.org"
              required
              type="url"
            />
            <Input
              name="cookie"
              placeholder="Suno API key"
              required
              type="password"
            />
            <Button className="w-full" type="submit">
              Test & save Suno
            </Button>
            <p className="text-left text-xs text-muted-foreground">
              Create a key at sunoapi.org under API Key Management. We test it
              before saving.
            </p>
          </form>
        )}
      </div>

      <div className="mt-6 space-y-5">
        {[
          [
            "Encrypted at rest",
            "Your API key is stored encrypted and never shown again.",
          ],
          [
            "Your own credits",
            "Generations run on your Suno account and plan.",
          ],
          [
            "Replace it anytime",
            "Save a new key whenever you rotate or upgrade.",
          ],
        ].map(([title, copy]) => (
          <div className="flex gap-4" key={title}>
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
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
        className="rounded-lg border border-line bg-panel p-5 text-center"
        data-testid="youtube-connection-card"
      >
        <div className="mx-auto grid size-14 place-items-center rounded-lg border border-line bg-secondary text-primary">
          <Play className="size-7" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-foreground">YouTube</h3>
        <div className="mt-4">
          <StatusBadge connected={connected} />
        </div>
        <form action={startYoutubeOAuthAction} className="mt-6">
          <Button className="h-12 w-full" type="submit">
            {connected ? "Reconnect YouTube" : "Connect YouTube"}
          </Button>
        </form>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-panel p-5">
        <h3 className="font-semibold text-foreground">Why connect YouTube?</h3>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          {[
            "Publish directly to your channel",
            "Track performance & engagement",
            "Save time with one-click publishing",
          ].map((item) => (
            <li className="flex gap-3" key={item}>
              <Check className="mt-0.5 size-4 text-primary" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
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

        <div className="rounded-lg border border-line bg-panel p-4">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 size-5 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
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
      <div className="relative h-48 overflow-hidden rounded-lg border border-line bg-panel">
        <div className="absolute right-8 bottom-9 left-8 h-16 rounded-lg border border-line bg-secondary" />
        <div className="absolute right-12 bottom-14 left-12 flex h-28 items-end gap-1.5">
          {[28, 54, 38, 82, 112, 65, 138, 92, 52, 75, 105, 62, 36].map(
            (height, index) => (
              <span
                className="flex-1 rounded-t bg-primary"
                key={`${height}-${index}`}
                style={{ height }}
              />
            ),
          )}
        </div>
        <Music2 className="absolute top-10 right-24 size-9 text-primary" />
      </div>

      <div className="mt-7 space-y-5">
        {[
          ["Generate with Suno", "Create your first track with AI."],
          ["Preview & refine", "Fine-tune your sound and vibe."],
          ["Publish to YouTube", "Share with the world in one click."],
        ].map(([title, copy]) => (
          <div className="flex gap-4" key={title}>
            <CheckCircle2 className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
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
      <Badge variant="success">
        <CheckCircle2 className="size-3" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="warning">
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
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="relative mt-2 block">
        <select
          className="h-10 w-full appearance-none rounded-md border border-border bg-input px-3 pr-9 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/35"
          defaultValue={value}
          form={formId}
          name={name}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
      <span className="mt-2 block text-xs text-muted-foreground">{help}</span>
    </label>
  );
}
