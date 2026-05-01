import Link from "next/link";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FileAudio,
  Globe2,
  ImageIcon,
  LockKeyhole,
  Megaphone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid={screenTestId}
    >
      <TopBar />
      <div className="dashboard-grid mx-auto grid max-w-[1536px] gap-5 px-4 py-4 lg:px-9">
        <PageHeader activeRoute={activeRoute} data={data} />
        <WorkspaceNav activeRoute={activeRoute} />
        {activeRoute === "billing" ? (
          <BillingOverview data={data} />
        ) : (
          <SettingsOverview data={data} />
        )}
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="flex h-[73px] items-center justify-end gap-4 border-b border-white/10 bg-[#0b1022]/80 px-4 backdrop-blur lg:px-9">
      <Link
        className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex"
        href="/dashboard/channels"
      >
        <Megaphone className="size-4 text-slate-300" />
        What&apos;s new
        <span className="size-1.5 rounded-full bg-violet-400" />
      </Link>
      <label className="hidden h-9 w-full max-w-[335px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:flex">
        <Search className="size-4 text-slate-500" />
        <span className="flex-1">Search anything...</span>
        <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
          Ctrl K
        </kbd>
      </label>
      <Button
        aria-label="Notifications"
        className="text-slate-300"
        size="icon"
        type="button"
        variant="ghost"
      >
        <Bell className="size-5" />
      </Button>
      <button className="flex items-center gap-2 text-sm text-slate-300">
        <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 font-semibold text-white">
          AM
        </span>
        <ChevronDown className="size-4" />
      </button>
    </header>
  );
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
      ? "Your subscription, usage limits, invoices, and upgrade path in one place."
      : "Defaults that carry into generation, rendering, scheduling, and YouTube publishing.";

  return (
    <header className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl border-l border-white/20 pl-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            {title}
          </h1>
          <Badge className={status.badgeClass}>{status.label}</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
      <div className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:min-w-[260px]">
        <span className="text-slate-500">Workspace plan</span>
        <span className="font-medium text-white">
          {data.planDisplayName} workspace
          {data.currentPeriodEnd ? (
            <span className="text-slate-500">
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
                ? "border-violet-300/35 bg-violet-500/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_46px_rgba(91,33,182,0.2)]"
                : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]",
            )}
            href={item.href}
            key={item.route}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg border",
                isActive
                  ? "border-violet-200/25 bg-violet-400/15 text-violet-100"
                  : "border-white/10 bg-slate-950/30 text-slate-400 group-hover:text-slate-200",
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
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
      <section className="bussin-panel rounded-lg p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="text-sm font-medium text-violet-200">
              Current publishing defaults
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              New work starts from these choices.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              These values prefill generation and upload flows. Change them here
              once, then let every new release inherit the setup.
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
      </section>
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
    <section className="bussin-panel relative min-h-[360px] overflow-hidden rounded-lg p-6 lg:p-7">
      <div className="absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block">
        <div className="absolute top-10 right-12 size-44 rotate-[-8deg] rounded-[2rem] border border-violet-200/20 bg-gradient-to-br from-violet-500/35 via-slate-900 to-cyan-500/20 shadow-[0_28px_90px_rgba(88,28,255,0.38)]" />
        <div className="absolute top-28 right-28 grid size-20 rotate-[-8deg] place-items-center rounded-2xl bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_46px_rgba(88,28,255,0.24)]">
          <WandSparkles className="size-9 text-violet-200" />
        </div>
        <div className="absolute right-2 bottom-10 h-24 w-72 rounded-[50%] border border-cyan-300/20 bg-cyan-500/10 blur-sm" />
      </div>

      <div className="relative max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-violet-300/25 bg-violet-500/18 text-violet-100">
            Current plan
          </Badge>
          {data.cancelAtPeriodEnd ? (
            <Badge className="border-amber-300/20 bg-amber-500/15 text-amber-100">
              Cancels at period end
            </Badge>
          ) : null}
        </div>

        <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
          {data.planDisplayName} Plan
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {isPaid
            ? `Billed monthly for $${data.monthlyPriceUsd}. Manage invoices and payment method through Stripe.`
            : "Trial includes enough quota to connect your first channel and test the publishing flow."}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)]">
          <div className="rounded-lg border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">Primary usage</span>
              <span className={cn("text-xs font-medium", usageTone(percent))}>
                {percent}% used
              </span>
            </div>
            <p className="mt-3 font-mono text-3xl font-semibold text-white">
              {formatNumber(usage?.used ?? 0)}
              <span className="text-sm font-normal text-slate-500">
                {" "}
                / {formatNumber(usage?.limit ?? 0)} {usage?.label ?? "credits"}
              </span>
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/80">
              <div
                className={cn("h-full rounded-full", usageBarClass(percent))}
                data-testid="usage-bar"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <span className="text-sm text-slate-400">Billing period</span>
            <p className="mt-3 text-sm font-medium leading-6 text-white">
              {periodLabel}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
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
      </div>
    </section>
  );
}

function UsageCycleCard({
  usageMetrics,
}: {
  usageMetrics: BillingUsageMetric[];
}) {
  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Usage this cycle</h2>
          <p className="mt-1 text-sm text-slate-400">
            The quota that matters for generation, publishing, channels, and
            scheduling.
          </p>
        </div>
        <Badge variant="secondary">Current period</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {usageMetrics.map((metric) => {
          const percent = toPercent(metric.used, metric.limit);

          return (
            <article
              className="rounded-lg border border-white/10 bg-slate-950/25 p-4"
              key={metric.key}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-white">
                  <MetricIcon metricKey={metric.key} />
                  {metric.label}
                </span>
                <span className={cn("text-xs font-medium", usageTone(percent))}>
                  {percent}%
                </span>
              </div>
              <p className="mt-4 font-mono text-2xl font-semibold text-white">
                {formatNumber(metric.used)}
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  / {formatNumber(metric.limit)}
                </span>
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/75">
                <div
                  className={cn("h-full rounded-full", usageBarClass(percent))}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <Button className="mt-5" type="button" variant="outline">
        <BarChart3 className="size-4" />
        View full usage
      </Button>
    </section>
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
    <section className="bussin-panel rounded-lg p-5">
      <h2 className="text-lg font-semibold text-white">Plan limits</h2>
      <p className="mt-1 text-sm text-slate-400">
        Hard limits enforced before generation and publishing jobs are queued.
      </p>
      <dl className="mt-5 divide-y divide-white/10">
        {rows.map(([label, value]) => (
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 text-sm"
            key={label}
          >
            <dt className="text-slate-400">{label}</dt>
            <dd className="font-mono font-medium text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
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
    <section className="bussin-panel flex flex-col rounded-lg p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Stripe billing</h2>
          <p className="mt-1 text-sm text-slate-400">
            Payment method, invoices, receipts, and subscription changes.
          </p>
        </div>
        <span className="text-xl font-bold text-violet-300">stripe</span>
      </div>

      <div className="mt-5 grid gap-3">
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
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-slate-950/25 p-4">
        <p className="text-sm font-medium text-white">What stays in Bussin</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Plan state and quota are synced from Stripe webhooks. Card details
          stay inside Stripe.
        </p>
      </div>

      <p className="mt-auto flex items-start gap-2 pt-6 text-xs leading-5 text-slate-500">
        <LockKeyhole className="mt-0.5 size-4 text-slate-400" />
        Secure payments powered by Stripe. Your payment details are encrypted.
      </p>
    </section>
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
    <section className="bussin-panel rounded-lg p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-lg border border-cyan-200/20 bg-cyan-400/10 text-cyan-100">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Next sensible upgrade
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {upgrade.displayName} adds room before you hit publishing or
            generation ceilings.
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm text-slate-400">Monthly generations</p>
        <p className="mt-2 font-mono text-2xl font-semibold text-white">
          {formatNumber(currentGenerations)}
          <span className="px-2 text-sm text-slate-500">to</span>
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
    </section>
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
    <div className="grid min-h-[86px] gap-2 rounded-lg border border-white/10 bg-slate-950/25 p-4">
      <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="text-violet-200">{icon}</span>
        {label}
      </span>
      <span className="truncate text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function MetricIcon({ metricKey }: { metricKey: BillingUsageMetric["key"] }) {
  const className = "size-4 text-violet-300";

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
      badgeClass: "border-amber-300/20 bg-amber-500/15 text-amber-100",
      label: "Canceling",
    };
  }

  if (data.status === "past_due") {
    return {
      badgeClass: "border-red-300/20 bg-red-500/15 text-red-100",
      label: "Past due",
    };
  }

  if (data.status === "canceled") {
    return {
      badgeClass: "border-slate-300/15 bg-slate-500/15 text-slate-200",
      label: "Canceled",
    };
  }

  if (data.plan === "trial") {
    return {
      badgeClass: "border-cyan-300/20 bg-cyan-500/15 text-cyan-100",
      label: "Trial",
    };
  }

  return {
    badgeClass: "border-emerald-300/20 bg-emerald-500/15 text-emerald-100",
    label: "Active",
  };
}

function usageTone(percent: number) {
  if (percent >= 100) {
    return "text-red-300";
  }

  if (percent >= 80) {
    return "text-amber-300";
  }

  return "text-emerald-300";
}

function usageBarClass(percent: number) {
  if (percent >= 100) {
    return "bg-gradient-to-r from-red-500 to-rose-300";
  }

  if (percent >= 80) {
    return "bg-gradient-to-r from-amber-500 to-orange-300";
  }

  return "bg-gradient-to-r from-violet-500 to-cyan-300";
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
