import { ArrowLeft, AudioWaveform } from "lucide-react";
import Link from "next/link";
import { APP_NAME } from "@/lib/app-config";
import { cn } from "@/lib/utils";

type DashboardTopBarProps = {
  className?: string;
  initials?: string;
};

export function DashboardTopBar({ className }: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-line px-4 sm:px-6",
        className,
      )}
    >
      <Link
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        href="/dashboard"
      >
        <AudioWaveform className="size-6 text-primary" strokeWidth={2.4} />
        {APP_NAME}
      </Link>
      <Link
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        data-testid="back-to-studio"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" />
        Back to studio
      </Link>
    </header>
  );
}
