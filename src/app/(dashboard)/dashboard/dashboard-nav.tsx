"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function DashboardNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-4 py-5">
      {items.map((item) => {
        const Icon = item.icon;
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
