"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CloudUpload,
  CreditCard,
  Grid2X2,
  LayoutTemplate,
  Library,
  Link2,
  Settings,
  Sparkles,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  icon:
    | "overview"
    | "generate"
    | "library"
    | "uploads"
    | "calendar"
    | "analytics"
    | "templates"
    | "connections"
    | "billing"
    | "settings";
  label: string;
};

const iconMap = {
  analytics: BarChart3,
  billing: CreditCard,
  calendar: CalendarDays,
  connections: Link2,
  generate: Sparkles,
  library: Library,
  overview: Grid2X2,
  settings: Settings,
  templates: LayoutTemplate,
  uploads: CloudUpload,
} satisfies Record<DashboardNavItem["icon"], typeof Grid2X2>;

export function DashboardNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-4 py-5">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "flex h-12 items-center gap-3 rounded-lg border border-violet-400/40 bg-violet-600/20 px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_26px_rgba(124,58,237,0.18)]"
                : "flex h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            }
            href={item.href}
            key={item.label}
          >
            <Icon className="size-5" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <DashboardNavPendingIndicator />
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardNavPendingIndicator({
  className,
}: {
  className?: string;
}) {
  const { pending } = useLinkStatus();
  const classes = [
    "size-1.5 shrink-0 rounded-full bg-violet-200 opacity-0 transition-opacity duration-150",
    pending ? "animate-pulse opacity-100" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span aria-hidden className={classes} data-pending={pending} />;
}
