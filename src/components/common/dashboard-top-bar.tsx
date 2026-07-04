import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PulseMark } from "@/components/common/logo";
import { APP_NAME } from "@/lib/app-public-config";
import { cn } from "@/lib/utils";

type DashboardTopBarProps = {
  className?: string;
  initials?: string;
};

export function DashboardTopBar({ className }: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        "border-b border-line/60 bg-background/70 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          className="flex items-center gap-2.5 text-lg tracking-tight"
          href="/dashboard"
        >
          <PulseMark className="size-5.5" />
          <span className="font-display font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <Link
          className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          data-testid="back-to-studio"
          href="/dashboard"
        >
          <ArrowLeft className="size-4" />
          Back to studio
        </Link>
      </div>
    </header>
  );
}
