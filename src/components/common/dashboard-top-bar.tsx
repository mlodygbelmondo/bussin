import { Bell, ChevronDown, Megaphone } from "lucide-react";
import Link from "next/link";
import { DashboardCommandPalette } from "@/components/common/dashboard-command-palette";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardTopBarProps = {
  className?: string;
  initials?: string;
};

export function DashboardTopBar({
  className,
  initials = "AM",
}: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        "flex h-[73px] items-center justify-end gap-3 border-b border-white/10 bg-[#0b1022]/80 px-4 backdrop-blur lg:gap-4 lg:px-9",
        className,
      )}
    >
      <Link
        className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-violet-300/30 hover:bg-violet-500/10 md:flex"
        href="/dashboard/channels"
      >
        <Megaphone className="size-4 text-slate-300" />
        What&apos;s new
        <span className="size-1.5 rounded-full bg-violet-400" />
      </Link>
      <DashboardCommandPalette />
      <Button
        aria-label="Notifications"
        className="text-slate-300"
        size="icon"
        type="button"
        variant="ghost"
      >
        <Bell className="size-5" />
      </Button>
      <button
        aria-label="Open account menu"
        className="flex items-center gap-2 text-sm text-slate-300"
        type="button"
      >
        <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 font-semibold text-white">
          {initials}
        </span>
        <ChevronDown className="size-4" />
      </button>
    </header>
  );
}
