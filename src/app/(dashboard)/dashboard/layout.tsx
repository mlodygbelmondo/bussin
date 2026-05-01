import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  AudioWaveform,
  BarChart3,
  CloudUpload,
  CreditCard,
  Grid2X2,
  LayoutTemplate,
  Library,
  Link2,
  PlusCircle,
  Settings,
  Sparkles,
} from "lucide-react";
import { DashboardNav } from "@/app/(dashboard)/dashboard/dashboard-nav";
import { APP_NAME, isMockMode } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { mockDashboardShell } from "@/modules/dev/mock-data";
import type { DashboardNavItem } from "@/app/(dashboard)/dashboard/dashboard-nav";

type DashboardShellData = {
  creditsLabel: string;
  displayName: string;
  email: string;
  initials: string;
  planName: string;
  resetLabel: string;
  usagePercent: number;
};

const dashboardLinks = [
  { href: "/dashboard", icon: "overview", label: "Overview" },
  { href: "/dashboard/generate", icon: "generate", label: "Generate" },
  { href: "/dashboard/library", icon: "library", label: "Library" },
  { href: "/dashboard/scheduled", icon: "uploads", label: "Uploads" },
  { href: "/dashboard/scheduled", icon: "calendar", label: "Calendar" },
  { href: "/dashboard/queue", icon: "analytics", label: "Analytics" },
  { href: "/dashboard/generate", icon: "templates", label: "Templates" },
  { href: "/dashboard/channels", icon: "connections", label: "Connections" },
  { href: "/dashboard/billing", icon: "billing", label: "Billing" },
  { href: "/dashboard/settings", icon: "settings", label: "Settings" },
] satisfies DashboardNavItem[];

const mobileLinks = [
  { href: "/dashboard", icon: "overview", label: "Overview" },
  { href: "/dashboard/generate", icon: "generate", label: "Generate" },
  { href: "/dashboard/library", icon: "library", label: "Library" },
  { href: "/dashboard/settings", icon: "settings", label: "More" },
] satisfies DashboardNavItem[];

const mobileIconMap = {
  analytics: BarChart3,
  billing: CreditCard,
  calendar: CloudUpload,
  connections: Link2,
  generate: Sparkles,
  library: Library,
  overview: Grid2X2,
  settings: Settings,
  templates: LayoutTemplate,
  uploads: CloudUpload,
} satisfies Record<DashboardNavItem["icon"], typeof Grid2X2>;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const shell = await getDashboardShellData();

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#060b18] text-foreground md:grid md:grid-cols-[244px_1fr]">
      <aside className="hidden border-r border-white/10 bg-[#071021]/92 shadow-[inset_-1px_0_0_rgba(112,86,255,0.1)] md:flex md:min-h-[100dvh] md:flex-col">
        <Link
          className="flex h-[73px] items-center gap-3 border-b border-white/10 px-7 text-xl font-semibold tracking-tight text-white"
          href="/dashboard"
        >
          <span className="grid size-8 place-items-center text-violet-300">
            <AudioWaveform className="size-8" strokeWidth={2.4} />
          </span>
          {APP_NAME}
        </Link>
        <DashboardNav items={dashboardLinks} />
        <div className="mt-auto space-y-3 px-4 pb-4">
          <section className="bussin-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="font-semibold text-white">{shell.planName}</p>
              <Link
                className="text-slate-400 hover:text-white"
                href="/dashboard/billing"
              >
                Manage plan
              </Link>
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Credits</span>
                <span className="font-mono text-white">
                  {shell.creditsLabel}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                  style={{ width: `${shell.usagePercent}%` }}
                />
              </div>
              <p className="pt-2 text-xs text-slate-400">{shell.resetLabel}</p>
            </div>
          </section>
          <section className="bussin-panel rounded-lg p-4">
            <p className="font-semibold text-white">Upgrade for more</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Unlock higher limits, priority processing, and advanced
              publishing.
            </p>
            <Link
              className="mt-4 flex h-10 items-center justify-center gap-2 rounded-md bg-gradient-to-b from-violet-500 to-violet-700 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(109,40,217,0.28)]"
              href="/dashboard/billing"
            >
              <PlusCircle className="size-4" />
              Upgrade plan
            </Link>
          </section>
          <div className="flex items-center gap-3 border-t border-white/10 px-2 pt-4">
            <span className="grid size-10 place-items-center rounded-full bg-violet-600 text-sm font-semibold text-white">
              {shell.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {shell.displayName}
              </p>
              <p className="truncate text-xs text-slate-500">{shell.email}</p>
            </div>
          </div>
        </div>
      </aside>
      <nav className="grid grid-cols-4 border-b border-white/10 bg-[#071021] p-2 md:hidden">
        {mobileLinks.map((item) => {
          const Icon = mobileIconMap[item.icon];

          return (
            <Link
              className="flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs text-slate-300"
              href={item.href}
              key={item.label}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

async function getDashboardShellData(): Promise<DashboardShellData> {
  if (isMockMode) {
    return mockDashboardShell;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const [profileResult, subscriptionResult, sunoResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan")
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle(),
    supabase
      .from("suno_connections")
      .select("monthly_limit, monthly_usage")
      .eq("workspace_id", membership.workspace_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const email = profileResult.data?.email ?? user.email ?? "Unknown email";
  const displayName =
    profileResult.data?.full_name?.trim() || email.split("@")[0] || "User";
  const monthlyUsage = sunoResult.data?.monthly_usage ?? 0;
  const monthlyLimit = sunoResult.data?.monthly_limit ?? 0;

  return {
    creditsLabel:
      monthlyLimit > 0
        ? `${formatNumber(monthlyUsage)} / ${formatNumber(monthlyLimit)}`
        : "No Suno connection",
    displayName,
    email,
    initials: toInitials(displayName),
    planName: `${toTitleCase(subscriptionResult.data?.plan ?? "trial")} Plan`,
    resetLabel: monthlyLimit > 0 ? "Current billing period" : "Connect Suno",
    usagePercent:
      monthlyLimit > 0 ? Math.min((monthlyUsage / monthlyLimit) * 100, 100) : 0,
  };
}

function formatNumber(value: number): string {
  return Intl.NumberFormat("en").format(value);
}

function toInitials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function toTitleCase(value: string): string {
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}
