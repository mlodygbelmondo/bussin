import {
  AudioLines,
  CalendarDays,
  CheckSquare,
  Clock3,
  Headphones,
  UploadCloud,
} from "lucide-react";
import type { DashboardKpi } from "@/modules/dashboard/dashboard.types";

const iconMap = {
  approval: CheckSquare,
  calendar: CalendarDays,
  limit: Clock3,
  queue: AudioLines,
  tracks: Headphones,
  upload: UploadCloud,
};

const toneClasses = {
  amber: "from-orange-500/25 to-amber-400/10 text-amber-200",
  cyan: "from-cyan-500/25 to-blue-400/10 text-cyan-200",
  emerald: "from-emerald-500/25 to-green-400/10 text-emerald-200",
  violet: "from-violet-500/25 to-fuchsia-400/10 text-violet-200",
};

const trendClasses = {
  neutral: "text-slate-400",
  positive: "text-emerald-300",
  warning: "text-amber-300",
};

export function DashboardKpiCard({ kpi }: { kpi: DashboardKpi }) {
  const Icon = iconMap[kpi.icon];

  return (
    <article
      className="bussin-panel min-h-24 rounded-lg px-4 py-4"
      data-testid={`kpi-card-${kpi.icon}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${toneClasses[kpi.tone]}`}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-300">
            {kpi.label}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-white">
            {kpi.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <span className={trendClasses[kpi.trendTone]}>
              {kpi.trendLabel}
            </span>{" "}
            {kpi.trendTone === "positive" || kpi.trendTone === "warning"
              ? "vs last 7 days"
              : ""}
          </p>
        </div>
      </div>
    </article>
  );
}
