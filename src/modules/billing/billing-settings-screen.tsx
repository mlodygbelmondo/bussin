import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  FileAudio,
  Globe2,
  ImageIcon,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { ReactNode } from "react";
import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { Reveal } from "@/components/common/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  openCustomerPortalAction,
  startCheckoutAction,
} from "@/modules/billing/billing.actions";
import { BillingSettingsForm } from "@/modules/billing/billing-settings-form";
import type { BillingPageData, BillingUsageMetric } from "./billing.types";

type BillingSettingsScreenProps = {
  activeRoute: "billing" | "settings";
  data: BillingPageData;
};

const planOrder = ["trial", "creator", "pro", "studio"] as const;

const workspaceNav = [
  {
    description: "Plan, usage, invoices",
    href: "/dashboard/billing",
    icon: CreditCard,
    label: "Billing",
    route: "billing",
  },
  {
    description: "Publishing defaults",
    href: "/dashboard/settings",
    icon: SlidersHorizontal,
    label: "Settings",
    route: "settings",
  },
] as const;

export function BillingSettingsScreen({
  activeRoute,
  data,
}: BillingSettingsScreenProps) {
  const screenTestId =
    activeRoute === "billing"
      ? "screen-dashboard-billing"
      : "screen-dashboard-settings";

  return (
    <main
      className="min-h-[100dvh] bg-background text-foreground"
      data-testid={screenTestId}
    >
      <TopBar />
      <div className="mx-auto grid max-w-[1120px] gap-5 px-4 py-6 lg:px-9">
        <Reveal>
          <PageHeader activeRoute={activeRoute} data={data} />
        </Reveal>
        <Reveal delay={0.06}>
          <WorkspaceNav activeRoute={activeRoute} />
        </Reveal>
        <Reveal delay={0.12}>
          {activeRoute === "billing" ? (
            <BillingOverview data={data} />
          ) : (
            <SettingsOverview data={data} />
          )}
        </Reveal>
      </div>
    </main>
  );
}

function TopBar() {
  return <DashboardTopBar />;
}

function PageHeader({
  activeRoute,
  data,
}: {
  activeRoute: "billing" | "settings";
  data: BillingPageData;
}) {
  const status = getSubscriptionStatus(data);
  const title = activeRoute === "billing" ? "Billing" : "Workspace settings";
  const description =
    activeRoute === "billing"
      ? "Your plan, usage, and billing controls in one quiet place."
      : "Simple defaults that save time whenever you create or publish.";

  return (
    <header className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {title}
          </h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="grid gap-1 rounded-xl border border-line bg-card/80 px-4 py-3 text-sm sm:min-w-[260px]">
        <span className="text-muted-foreground">Workspace plan</span>
        <span className="font-medium text-foreground">
          {data.planDisplayName} workspace
          {data.currentPeriodEnd ? (
            <span className="text-muted-foreground">
              {" "}
              renews {formatDate(data.currentPeriodEnd)}
            </span>
          ) : null}
        </span>
      </div>
    </header>
  );
}

function WorkspaceNav({
  activeRoute,
}: {
  activeRoute: "billing" | "settings";
}) {
  return (
    <nav aria-label="Workspace controls" className="grid gap-3 sm:grid-cols-2">
      {workspaceNav.map((item) => {
        const Icon = item.icon;
        const isActive = activeRoute === item.route;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-4 rounded-lg border p-4 transition duration-200",
              isActive
                ? "border-primary bg-accent text-foreground"
                : "border-line bg-card text-foreground hover:bg-accent/50",
            )}
            href={item.href}
            key={item.route}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg border",
                isActive
                  ? "border-primary bg-secondary text-primary"
                  : "border-line bg-secondary text-muted-foreground group-hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function BillingOverview({ data }: { data: BillingPageData }) {
  const primaryUsage = data.usageMetrics[0];
  const usagePercent = primaryUsage
    ? toPercent(primaryUsage.used, primaryUsage.limit)
    : 0;
  const upgrade = getNextUpgradeOption(data);

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <PlanHero data={data} percent={usagePercent} usage={primaryUsage} />
        <BillingPortalCard data={data} upgrade={upgrade} />
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <UsageCycleCard usageMetrics={data.usageMetrics} />
        <div className="grid gap-5">
          <PlanLimitsCard data={data} />
          {upgrade ? <UpgradeCard data={data} upgrade={upgrade} /> : null}
        </div>
      </section>
    </div>
  );
}

function SettingsOverview({ data }: { data: BillingPageData }) {
  const defaultChannel =
    data.channels.find(
      (channel) => channel.id === data.settings.defaultYoutubeChannelId,
    ) ?? data.channels.find((channel) => channel.isDefault);
  const defaultImage = data.imageAssets.find(
    (asset) => asset.id === data.settings.defaultImageAssetId,
  );

  return (
    <div className="grid gap-5">
      <Card className="rounded-xl border-line bg-card/80">
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div>
              <p className="text-sm font-medium text-primary">
                Current publishing defaults
              </p>
              <h2 className="font-display mt-2 text-xl font-semibold text-foreground">
                New work starts from these choices.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                These values prefill generation and upload flows. Change them
                here once, then let every new release inherit the setup.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsSummaryTile
                icon={<UploadCloud className="size-4" />}
                label="Default channel"
                value={defaultChannel?.title ?? "No channel selected"}
              />
              <SettingsSummaryTile
                icon={<ShieldCheck className="size-4" />}
                label="Privacy"
                value={capitalize(data.settings.defaultPrivacyStatus)}
              />
              <SettingsSummaryTile
                icon={<Globe2 className="size-4" />}
                label="Timezone"
                value={formatTimezone(data.settings.timezone)}
              />
              <SettingsSummaryTile
                icon={<ImageIcon className="size-4" />}
                label="Default image"
                value={
                  defaultImage?.fileName ??
                  defaultImage?.storagePath ??
                  "No image selected"
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <BillingSettingsForm data={data} />
    </div>
  );
}

function PlanHero({
  data,
  percent,
  usage,
}: {
  data: BillingPageData;
  percent: number;
  usage: BillingUsageMetric | undefined;
}) {
  const isPaid = data.plan !== "trial";
  const upgrade = getNextUpgradeOption(data);
  const periodLabel =
    data.currentPeriodStart && data.currentPeriodEnd
      ? `${formatDate(data.currentPeriodStart)} - ${formatDate(
          data.currentPeriodEnd,
        )}`
      : "Trial workspace";

  return (
    <Card className="rounded-xl border-primary/50 bg-card/80 p-6">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Current plan</Badge>
          {data.cancelAtPeriodEnd ? (
            <Badge variant="warning">Cancels at period end</Badge>
          ) : null}
        </div>

        <CardTitle className="font-display mt-3 text-3xl font-bold sm:text-4xl">
          {data.planDisplayName} Plan
        </CardTitle>
        <CardDescription>
          {isPaid
            ? `Billed monthly for $${data.monthlyPriceUsd}. Manage invoices and payment method through Stripe.`
            : "Trial includes enough quota to connect your first channel and test the publishing flow."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)]">
          <div className="rounded-lg border border-line bg-panel p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Primary usage
              </span>
              <span className={cn("text-xs font-medium", usageTone(percent))}>
                {percent}% used
              </span>
            </div>
            <p className="mt-3 font-mono text-3xl font-semibold text-foreground">
              {formatNumber(usage?.used ?? 0)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {formatNumber(usage?.limit ?? 0)} {usage?.label ?? "credits"}
              </span>
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full", usageBarClass(percent))}
                data-testid="usage-bar"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-line bg-panel p-4">
            <span className="text-sm text-muted-foreground">
              Billing period
            </span>
            <p className="mt-3 text-sm font-medium leading-6 text-foreground">
              {periodLabel}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Limits reset at the start of each billing period.
            </p>
          </div>
        </div>

        <form
          action={isPaid ? openCustomerPortalAction : startCheckoutAction}
          className="mt-7"
        >
          <input name="workspace_id" type="hidden" value={data.workspaceId} />
          {!isPaid && upgrade ? (
            <input name="plan" type="hidden" value={upgrade.plan} />
          ) : null}
          <Button data-testid="primary-action" type="submit">
            {isPaid ? "Manage billing" : "Upgrade plan"}
            <ExternalLink className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function UsageCycleCard({
  usageMetrics,
}: {
  usageMetrics: BillingUsageMetric[];
}) {
  return (
    <Card className="rounded-xl border-line bg-card/80">
      <CardHeader className="sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle className="font-display text-lg">
            Usage this cycle
          </CardTitle>
          <CardDescription>
            The quota that matters for generation, publishing, channels, and
            scheduling.
          </CardDescription>
        </div>
        <Badge variant="secondary">Current period</Badge>
      </CardHeader>

      <CardContent className="grid gap-3 sm:grid-cols-2">
        {usageMetrics.map((metric) => {
          const percent = toPercent(metric.used, metric.limit);

          return (
            <article
              className="rounded-lg border border-line bg-panel p-4"
              key={metric.key}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MetricIcon metricKey={metric.key} />
                  {metric.label}
                </span>
                <span className={cn("text-xs font-medium", usageTone(percent))}>
                  {percent}%
                </span>
              </div>
              <p className="mt-4 font-mono text-2xl font-semibold text-foreground">
                {formatNumber(metric.used)}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {formatNumber(metric.limit)}
                </span>
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", usageBarClass(percent))}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
      </CardContent>

      <CardContent>
        <Button type="button" variant="outline">
          <BarChart3 className="size-4" />
          View full usage
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanLimitsCard({ data }: { data: BillingPageData }) {
  const rows = [
    [
      "Generations per month",
      formatNumber(data.limits.monthlyGenerationRequests),
    ],
    ["Uploads per month", formatNumber(data.limits.monthlyUploads)],
    ["Connected channels", String(data.limits.youtubeChannels)],
    ["Scheduled uploads", formatNumber(data.limits.scheduledUploads)],
    ["Workspace seats", data.plan === "studio" ? "15 seats" : "3 seats"],
  ];

  return (
    <Card className="rounded-xl border-line bg-card/80">
      <CardHeader>
        <CardTitle className="font-display text-lg">Plan limits</CardTitle>
        <CardDescription>
          Your current workspace allowance for creating and publishing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 text-sm"
              key={label}
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function BillingPortalCard({
  data,
  upgrade,
}: {
  data: BillingPageData;
  upgrade: ReturnType<typeof getNextUpgradeOption>;
}) {
  const hasPaidPlan = data.plan !== "trial";

  return (
    <Card className="flex flex-col rounded-xl border-line bg-card/80">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="font-display text-lg">Stripe billing</CardTitle>
          <CardDescription>
            Payment method, invoices, receipts, and subscription changes.
          </CardDescription>
        </div>
        <span className="text-xl font-bold text-primary">stripe</span>
      </CardHeader>

      <CardContent className="grid gap-3">
        {hasPaidPlan ? (
          <form action={openCustomerPortalAction}>
            <input name="workspace_id" type="hidden" value={data.workspaceId} />
            <Button className="w-full" type="submit" variant="outline">
              Open billing portal
              <ExternalLink className="size-4" />
            </Button>
          </form>
        ) : (
          <Button className="w-full" disabled type="button" variant="outline">
            Open billing portal
            <ExternalLink className="size-4" />
          </Button>
        )}

        {upgrade ? (
          <form action={startCheckoutAction}>
            <input name="workspace_id" type="hidden" value={data.workspaceId} />
            <input name="plan" type="hidden" value={upgrade.plan} />
            <Button className="w-full" type="submit">
              Upgrade to {upgrade.displayName}
            </Button>
          </form>
        ) : null}
      </CardContent>

      <CardContent>
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-sm font-medium text-foreground">
            What stays in Bussin
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Plan state and quota are synced from Stripe webhooks. Card details
            stay inside Stripe.
          </p>
        </div>

        <p className="mt-auto flex items-start gap-2 pt-6 text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-4" />
          Secure payments powered by Stripe. Your payment details are encrypted.
        </p>
      </CardContent>
    </Card>
  );
}

function UpgradeCard({
  data,
  upgrade,
}: {
  data: BillingPageData;
  upgrade: NonNullable<ReturnType<typeof getNextUpgradeOption>>;
}) {
  const currentGenerations = data.limits.monthlyGenerationRequests;
  const nextGenerations = upgrade.features.find((feature) =>
    feature.toLowerCase().includes("generation"),
  );

  return (
    <Card className="rounded-xl border-line bg-card/80">
      <CardContent>
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-lg border border-line bg-secondary text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Next sensible upgrade
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {upgrade.displayName} adds room before you hit publishing or
              generation ceilings.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-line bg-panel p-4">
          <p className="text-sm text-muted-foreground">Monthly generations</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
            {formatNumber(currentGenerations)}
            <span className="px-2 text-sm text-muted-foreground">to</span>
            {nextGenerations?.match(/[\d,]+/)?.[0] ?? "more"}
          </p>
        </div>
        <form action={startCheckoutAction} className="mt-5">
          <input name="workspace_id" type="hidden" value={data.workspaceId} />
          <input name="plan" type="hidden" value={upgrade.plan} />
          <Button className="w-full" type="submit" variant="outline">
            Compare {upgrade.displayName}
            <ExternalLink className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingsSummaryTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-h-[86px] gap-2 rounded-lg border border-line bg-panel p-4">
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="truncate text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function MetricIcon({ metricKey }: { metricKey: BillingUsageMetric["key"] }) {
  const className = "size-4 text-primary";

  if (metricKey === "uploadedVideos") {
    return <UploadCloud className={className} />;
  }

  if (metricKey === "connectedChannels") {
    return <ShieldCheck className={className} />;
  }

  if (metricKey === "scheduledUploads") {
    return <CreditCard className={className} />;
  }

  return <FileAudio className={className} />;
}

function getSubscriptionStatus(data: BillingPageData) {
  if (data.cancelAtPeriodEnd) {
    return {
      variant: "warning" as const,
      label: "Canceling",
    };
  }

  if (data.status === "past_due") {
    return {
      variant: "destructive" as const,
      label: "Past due",
    };
  }

  if (data.status === "canceled") {
    return {
      variant: "outline" as const,
      label: "Canceled",
    };
  }

  if (data.plan === "trial") {
    return {
      variant: "info" as const,
      label: "Trial",
    };
  }

  return {
    variant: "success" as const,
    label: "Active",
  };
}

function usageTone(percent: number) {
  if (percent >= 100) {
    return "text-danger";
  }

  if (percent >= 80) {
    return "text-warning";
  }

  return "text-success";
}

function usageBarClass(percent: number) {
  if (percent >= 100) {
    return "bg-danger";
  }

  if (percent >= 80) {
    return "bg-warning";
  }

  return "bg-primary";
}

function toPercent(used: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }

  return Math.min(Math.round((used / limit) * 100), 100);
}

function formatNumber(value: number) {
  return Intl.NumberFormat("en").format(value);
}

function formatDate(value: string) {
  return Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTimezone(value: string) {
  return value.replaceAll("_", " ").replace("/", " / ");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getNextUpgradeOption(data: BillingPageData) {
  const currentIndex = planOrder.indexOf(data.plan);

  return data.upgradeOptions.find(
    (option) => planOrder.indexOf(option.plan) > currentIndex,
  );
}
