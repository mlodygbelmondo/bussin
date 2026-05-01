import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const tabs = [
  { href: "/dashboard/billing", label: "Overview", route: "billing" },
  { href: "/dashboard/billing", label: "Plan & Usage", route: "billing" },
  { href: "/dashboard/billing", label: "Billing", route: "billing" },
  { href: "/dashboard/settings", label: "Settings", route: "settings" },
  { href: "/dashboard/settings", label: "Team", route: "settings" },
  {
    href: "/dashboard/settings",
    label: "API & Integrations",
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
  const primaryUsage = data.usageMetrics[0];
  const usagePercent = primaryUsage
    ? toPercent(primaryUsage.used, primaryUsage.limit)
    : 0;

  return (
    <main
      className="min-h-full bg-[#050b18] text-foreground"
      data-testid={screenTestId}
    >
      <TopBar />
      <div className="dashboard-grid mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-7">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Billing & Settings
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage your plan, usage, payments, and application preferences.
          </p>
        </header>

        <nav
          aria-label="Settings sections"
          className="flex max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-slate-950/35 p-0.5"
        >
          {tabs.map((tab) => {
            const isActive =
              tab.label === "Overview"
                ? activeRoute === "billing"
                : activeRoute === tab.route && tab.label === "Settings";

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "min-w-fit rounded-md border border-violet-400/35 bg-violet-600/20 px-5 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(124,58,237,0.25)]"
                    : "min-w-fit border-r border-white/5 px-5 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                }
                href={tab.href}
                key={tab.label}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <section className="grid gap-4 xl:grid-cols-[1.06fr_1fr_.92fr_.94fr]">
          <PlanCard data={data} />
          <UsageCycleCard
            percent={usagePercent}
            primaryUsage={primaryUsage}
            usageMetrics={data.usageMetrics}
          />
          <PlanLimitsCard data={data} />
          <BillingPortalCard data={data} />
        </section>

        <BillingSettingsForm data={data} />

        <footer className="pb-2 text-center text-sm text-slate-500">
          Need help? Visit our{" "}
          <Link className="text-violet-300 hover:text-violet-200" href="#">
            Help Center
          </Link>{" "}
          or{" "}
          <Link className="text-violet-300 hover:text-violet-200" href="#">
            contact support
          </Link>
          .
        </footer>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <div className="hidden h-[73px] items-center justify-end gap-4 border-b border-white/10 bg-[#071021]/70 px-7 lg:flex">
      <Button size="sm" variant="outline">
        <Megaphone className="size-4" />
        What&apos;s new
      </Button>
      <div className="flex h-9 w-[340px] items-center gap-3 rounded-lg border border-white/10 bg-slate-950/35 px-3 text-sm text-slate-500">
        <Search className="size-4" />
        Search anything...
        <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-slate-400">
          ⌘ /
        </span>
      </div>
      <span className="grid size-9 place-items-center rounded-full bg-violet-600 text-sm font-semibold text-white">
        AM
      </span>
    </div>
  );
}

function PlanCard({ data }: { data: BillingPageData }) {
  const isPaid = data.plan !== "trial";
  const upgrade = getNextUpgradeOption(data);
  const billingLabel = data.currentPeriodEnd
    ? `Billed monthly · Next billing on ${formatDate(data.currentPeriodEnd)}`
    : "Trial workspace · Upgrade whenever you are ready";

  return (
    <section className="bussin-panel relative overflow-hidden rounded-lg border-violet-400/55 p-5 shadow-[0_0_38px_rgba(124,58,237,0.18)]">
      <div className="absolute right-10 top-44 size-28 rounded-[28px] border border-violet-300/25 bg-violet-500/10 shadow-[0_0_40px_rgba(124,58,237,0.38)] max-sm:hidden">
        <div className="absolute inset-6 rounded-2xl border border-violet-300/20 bg-slate-950/55" />
        <WandSparkles className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-violet-300" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-3">
          <p className="text-sm text-violet-200">Your Plan</p>
          <Badge className="border-violet-300/25 bg-violet-500/20 text-violet-100">
            Current
          </Badge>
        </div>
        <h2 className="mt-7 text-2xl font-semibold text-white">
          {data.planDisplayName} Plan
        </h2>
        <p className="mt-2 text-xl text-white">
          ${data.monthlyPriceUsd}
          <span className="text-sm text-slate-400"> / month</span>
        </p>
        <p className="mt-2 text-sm text-slate-400">{billingLabel}</p>
        <ul className="mt-7 grid gap-3 text-sm text-slate-300">
          {[
            `${formatNumber(data.limits.monthlyGenerationRequests)} generations / month`,
            isPaid ? "Priority generation" : "Standard generation queue",
            "Static-image video rendering",
            isPaid ? "Commercial use" : "Personal publishing",
            "Early access to new features",
          ].map((feature) => (
            <li className="flex items-center gap-2" key={feature}>
              <CheckCircle2 className="size-4 text-violet-300" />
              {feature}
            </li>
          ))}
        </ul>
        <form
          action={isPaid ? openCustomerPortalAction : startCheckoutAction}
          className="mt-9"
        >
          <input name="workspace_id" type="hidden" value={data.workspaceId} />
          {!isPaid && upgrade ? (
            <input name="plan" type="hidden" value={upgrade.plan} />
          ) : null}
          <Button data-testid="primary-action" type="submit">
            {isPaid ? "Manage plan" : "Upgrade plan"}
            <ExternalLink className="size-4" />
          </Button>
        </form>
      </div>
    </section>
  );
}

function UsageCycleCard({
  percent,
  primaryUsage,
  usageMetrics,
}: {
  percent: number;
  primaryUsage: BillingUsageMetric | undefined;
  usageMetrics: BillingUsageMetric[];
}) {
  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold text-white">Usage this cycle</h2>
        <span className="text-xs text-slate-500">Current period</span>
      </div>
      <div className="mt-7">
        <p className="text-3xl font-semibold text-white">
          {formatNumber(primaryUsage?.used ?? 0)}
          <span className="text-sm font-normal text-slate-400">
            {" "}
            / {formatNumber(primaryUsage?.limit ?? 0)} credits used
          </span>
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/75">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
            data-testid="usage-bar"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="mt-7 divide-y divide-white/10">
        {usageMetrics.slice(0, 3).map((metric) => (
          <div
            className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm"
            key={metric.key}
          >
            <span className="flex items-center gap-3 text-slate-300">
              <MetricIcon metricKey={metric.key} />
              {metric.label}
            </span>
            <span className="font-mono text-slate-200">
              {formatNumber(metric.used)}
            </span>
          </div>
        ))}
      </div>
      <Button className="mt-8 w-full" type="button" variant="outline">
        <BarChart3 className="size-4" />
        View full usage
      </Button>
    </section>
  );
}

function PlanLimitsCard({ data }: { data: BillingPageData }) {
  const rows = [
    [
      "Generations / month",
      formatNumber(data.limits.monthlyGenerationRequests),
    ],
    ["Uploads / month", formatNumber(data.limits.monthlyUploads)],
    ["Connected channels", String(data.limits.youtubeChannels)],
    ["Scheduled uploads", formatNumber(data.limits.scheduledUploads)],
    ["Team members", data.plan === "studio" ? "15 seats" : "3 seats"],
  ];

  return (
    <section className="bussin-panel rounded-lg p-5">
      <h2 className="font-semibold text-white">Plan limits</h2>
      <div className="mt-8 divide-y divide-white/10">
        {rows.map(([label, value]) => (
          <div
            className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm"
            key={label}
          >
            <span className="text-slate-400">{label}</span>
            <span className="font-medium text-slate-100">{value}</span>
          </div>
        ))}
      </div>
      <Link
        className="mt-8 flex items-center justify-center gap-2 text-sm text-violet-300 hover:text-violet-200"
        href="/dashboard/billing"
      >
        View all limits & quotas
        <ExternalLink className="size-4" />
      </Link>
    </section>
  );
}

function BillingPortalCard({ data }: { data: BillingPageData }) {
  const upgrade = getNextUpgradeOption(data);
  const hasPaidPlan = data.plan !== "trial";

  return (
    <section className="bussin-panel rounded-lg p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-white">Billing portal</h2>
        <span className="text-xl font-bold text-violet-400">stripe</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Manage your payments, invoices, and subscription in our secure billing
        portal.
      </p>
      {hasPaidPlan ? (
        <form action={openCustomerPortalAction} className="mt-4">
          <input name="workspace_id" type="hidden" value={data.workspaceId} />
          <Button className="w-full" type="submit" variant="outline">
            Open billing portal
            <ExternalLink className="size-4" />
          </Button>
        </form>
      ) : (
        <Button
          className="mt-4 w-full"
          disabled
          type="button"
          variant="outline"
        >
          Open billing portal
          <ExternalLink className="size-4" />
        </Button>
      )}
      {upgrade ? (
        <form action={startCheckoutAction} className="mt-3">
          <input name="workspace_id" type="hidden" value={data.workspaceId} />
          <input name="plan" type="hidden" value={upgrade.plan} />
          <Button className="w-full" type="submit">
            Upgrade to {upgrade.displayName}
          </Button>
        </form>
      ) : null}
      <div className="mt-7 border-t border-white/10 pt-5">
        <p className="text-sm font-medium text-white">Payment details</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Payment methods, invoices, receipts, and subscription changes are
          available in Stripe once billing is active.
        </p>
      </div>
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <LockKeyhole className="mt-0.5 size-4 text-slate-400" />
        Secure payments powered by Stripe. Your payment details are encrypted.
      </p>
    </section>
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

  return <Sparkles className={className} />;
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

function getNextUpgradeOption(data: BillingPageData) {
  const currentIndex = planOrder.indexOf(data.plan);

  return data.upgradeOptions.find(
    (option) => planOrder.indexOf(option.plan) > currentIndex,
  );
}
