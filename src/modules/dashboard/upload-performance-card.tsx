"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardHomeData } from "@/modules/dashboard/dashboard.types";

type UploadPerformancePeriod = "week" | "month" | "quarter";

type UploadPerformanceSample = {
  label: string;
  likes: string;
  listeners: string;
  plays: string;
  value: number;
};

type UploadPerformanceDay = {
  date: string;
  label: string;
  likes: string;
  listeners: string;
  plays: string;
  samples: UploadPerformanceSample[];
  value: number;
};

type UploadPerformanceSummary = {
  changeLabel: string;
  compareLabel: string;
  days: UploadPerformanceDay[];
  scaleLabels: string[];
  likes: string;
  likesTrend: string;
  listeners: string;
  listenersTrend: string;
  totalPlays: string;
};

const periodLabels = {
  week: "This week",
  month: "This month",
  quarter: "This quarter",
} satisfies Record<UploadPerformancePeriod, string>;

function sample(label: string, value: number): UploadPerformanceSample {
  return {
    label,
    likes: String(Math.round(value * 8)),
    listeners: `${(value * 0.42).toFixed(1)}K`,
    plays: `${value.toFixed(1)}K`,
    value,
  };
}

const periodSummaries = {
  week: {
    changeLabel: "↑ 28.4%",
    compareLabel: "vs last week",
    days: [
      {
        date: "May 6, 2025",
        label: "May 6",
        likes: "120",
        listeners: "1.5K",
        plays: "18.4K",
        samples: [
          sample("00:00-06:00", 2.8),
          sample("06:00-12:00", 5.1),
          sample("12:00-18:00", 7.6),
          sample("18:00-24:00", 2.9),
        ],
        value: 82,
      },
      {
        date: "May 7, 2025",
        label: "May 7",
        likes: "180",
        listeners: "1.9K",
        plays: "24.2K",
        samples: [
          sample("00:00-06:00", 3.7),
          sample("06:00-12:00", 6.9),
          sample("12:00-18:00", 8.4),
          sample("18:00-24:00", 5.2),
        ],
        value: 110,
      },
      {
        date: "May 8, 2025",
        label: "May 8",
        likes: "290",
        listeners: "2.4K",
        plays: "31.8K",
        samples: [
          sample("00:00-06:00", 5.8),
          sample("06:00-12:00", 8.1),
          sample("12:00-18:00", 11.7),
          sample("18:00-24:00", 6.2),
        ],
        value: 145,
      },
      {
        date: "May 9, 2025",
        label: "May 9",
        likes: "420",
        listeners: "3.1K",
        plays: "44.9K",
        samples: [
          sample("00:00-06:00", 7.4),
          sample("06:00-12:00", 10.6),
          sample("12:00-18:00", 18.2),
          sample("18:00-24:00", 8.7),
        ],
        value: 224,
      },
      {
        date: "May 10, 2025",
        label: "May 10",
        likes: "550",
        listeners: "3.8K",
        plays: "52.1K",
        samples: [
          sample("00:00-06:00", 8.9),
          sample("06:00-12:00", 16.1),
          sample("12:00-18:00", 14.8),
          sample("18:00-24:00", 12.3),
        ],
        value: 190,
      },
      {
        date: "May 11, 2025",
        label: "May 11",
        likes: "490",
        listeners: "3.2K",
        plays: "39.7K",
        samples: [
          sample("00:00-06:00", 4.8),
          sample("06:00-12:00", 9.2),
          sample("12:00-18:00", 16.5),
          sample("18:00-24:00", 9.2),
        ],
        value: 168,
      },
      {
        date: "May 12, 2025",
        label: "May 12",
        likes: "350",
        listeners: "2.8K",
        plays: "34.5K",
        samples: [
          sample("00:00-06:00", 3.2),
          sample("06:00-12:00", 7.4),
          sample("12:00-18:00", 13.6),
          sample("18:00-24:00", 10.3),
        ],
        value: 132,
      },
    ],
    scaleLabels: ["20K", "15K", "10K", "5K"],
    likes: "2.4K",
    likesTrend: "↑ 21.3%",
    listeners: "18.7K",
    listenersTrend: "↑ 18.7%",
    totalPlays: "245.6K",
  },
  month: {
    changeLabel: "↑ 14.8%",
    compareLabel: "vs last month",
    days: [
      {
        date: "Apr 15-21, 2025",
        label: "Apr 21",
        likes: "820",
        listeners: "7.6K",
        plays: "82.4K",
        samples: [
          sample("Mon-Tue", 18.2),
          sample("Wed-Thu", 24.4),
          sample("Fri-Sat", 27.6),
          sample("Sun", 12.2),
        ],
        value: 118,
      },
      {
        date: "Apr 22-28, 2025",
        label: "Apr 28",
        likes: "1.1K",
        listeners: "9.4K",
        plays: "96.8K",
        samples: [
          sample("Mon-Tue", 21.6),
          sample("Wed-Thu", 31.4),
          sample("Fri-Sat", 29.8),
          sample("Sun", 14.0),
        ],
        value: 138,
      },
      {
        date: "Apr 29-May 5, 2025",
        label: "May 5",
        likes: "1.4K",
        listeners: "11.2K",
        plays: "116.2K",
        samples: [
          sample("Mon-Tue", 24.8),
          sample("Wed-Thu", 34.2),
          sample("Fri-Sat", 38.6),
          sample("Sun", 18.6),
        ],
        value: 166,
      },
      {
        date: "May 6-12, 2025",
        label: "May 12",
        likes: "2.4K",
        listeners: "18.7K",
        plays: "245.6K",
        samples: [
          sample("Mon-Tue", 52.1),
          sample("Wed-Thu", 64.8),
          sample("Fri-Sat", 92.4),
          sample("Sun", 36.3),
        ],
        value: 224,
      },
    ],
    scaleLabels: ["100K", "75K", "50K", "25K"],
    likes: "5.7K",
    likesTrend: "↑ 16.2%",
    listeners: "46.9K",
    listenersTrend: "↑ 12.5%",
    totalPlays: "541.0K",
  },
  quarter: {
    changeLabel: "↑ 9.6%",
    compareLabel: "vs last quarter",
    days: [
      {
        date: "February 2025",
        label: "Feb",
        likes: "3.9K",
        listeners: "33.2K",
        plays: "388.4K",
        samples: [
          sample("Week 1", 72.4),
          sample("Week 2", 96.6),
          sample("Week 3", 118.2),
          sample("Week 4", 101.2),
        ],
        value: 122,
      },
      {
        date: "March 2025",
        label: "Mar",
        likes: "4.8K",
        listeners: "41.6K",
        plays: "452.8K",
        samples: [
          sample("Week 1", 84.2),
          sample("Week 2", 112.6),
          sample("Week 3", 138.4),
          sample("Week 4", 117.6),
        ],
        value: 158,
      },
      {
        date: "April 2025",
        label: "Apr",
        likes: "5.2K",
        listeners: "44.1K",
        plays: "498.6K",
        samples: [
          sample("Week 1", 92.1),
          sample("Week 2", 124.8),
          sample("Week 3", 151.6),
          sample("Week 4", 130.1),
        ],
        value: 174,
      },
      {
        date: "May 2025 to date",
        label: "May",
        likes: "2.4K",
        listeners: "18.7K",
        plays: "245.6K",
        samples: [
          sample("Week 1", 51.8),
          sample("Week 2", 72.4),
          sample("Week 3", 81.6),
          sample("Week 4", 39.8),
        ],
        value: 214,
      },
    ],
    scaleLabels: ["160K", "120K", "80K", "40K"],
    likes: "16.3K",
    likesTrend: "↑ 11.4%",
    listeners: "137.6K",
    listenersTrend: "↑ 8.8%",
    totalPlays: "1.58M",
  },
} satisfies Record<UploadPerformancePeriod, UploadPerformanceSummary>;

export function UploadPerformanceCard({ data }: { data: DashboardHomeData }) {
  const [period, setPeriod] = useState<UploadPerformancePeriod>("week");
  const selected = useMemo(() => {
    const summary = periodSummaries[period];

    if (period !== "week") {
      return summary;
    }

    return {
      ...summary,
      likes: data.uploadPerformance.likes,
      listeners: data.uploadPerformance.listeners,
      totalPlays: data.uploadPerformance.totalPlays,
    };
  }, [data.uploadPerformance, period]);

  const maxValue = Math.max(
    ...selected.days.flatMap((day) => day.samples.map((item) => item.value)),
  );

  return (
    <section
      className="bussin-panel rounded-lg p-5"
      data-testid="upload-performance-card"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Upload performance</h2>
        <label className="relative">
          <span className="sr-only">Upload performance period</span>
          <select
            className="h-9 appearance-none rounded-md border border-white/10 bg-white/[0.04] pl-3 pr-9 text-xs font-medium text-slate-200 outline-none transition hover:border-violet-300/35 focus:border-violet-300/60 focus:ring-2 focus:ring-violet-400/20"
            data-testid="upload-performance-period"
            onChange={(event) =>
              setPeriod(event.target.value as UploadPerformancePeriod)
            }
            value={period}
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option
                className="bg-[#111a2c] text-slate-100"
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-300" />
        </label>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div>
          <p className="text-sm text-slate-400">Total plays</p>
          <p
            className="mt-1 text-4xl font-semibold leading-none tracking-tight text-white"
            data-testid="upload-performance-total"
          >
            {selected.totalPlays}
          </p>
          <p className="mt-1 text-sm">
            <span className="text-emerald-300">{selected.changeLabel}</span>{" "}
            <span className="text-slate-500">{selected.compareLabel}</span>
          </p>
          <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-slate-950/20">
            <MetricMiniCard
              label="Listeners"
              trend={selected.listenersTrend}
              value={selected.listeners}
            />
            <MetricMiniCard
              label="Likes"
              trend={selected.likesTrend}
              value={selected.likes}
            />
          </div>
        </div>
        <div className="relative min-h-[238px] overflow-visible rounded-lg border border-white/[0.04] bg-[#090f1f]/35 px-5 pb-8 pt-4">
          <div className="dashboard-waves absolute inset-x-0 top-0 z-0 h-24 opacity-25" />
          <div className="absolute inset-x-5 bottom-12 top-5 z-0 grid grid-rows-4 text-[11px] text-slate-500">
            {selected.scaleLabels.map((label) => (
              <div
                className="flex items-start border-b border-white/[0.06]"
                key={label}
              >
                <span className="-mt-2 w-8">{label}</span>
              </div>
            ))}
          </div>
          <div
            className="absolute inset-x-14 bottom-12 z-10 grid h-44 items-end gap-4"
            style={{
              gridTemplateColumns: `repeat(${selected.days.length}, minmax(0, 1fr))`,
            }}
          >
            {selected.days.map((day, index) => (
              <div
                className="relative flex h-full min-w-0 items-end justify-center rounded-sm"
                key={day.label}
              >
                <div className="flex h-full w-full max-w-16 items-end justify-center gap-1">
                  {day.samples.map((item, sampleIndex) => (
                    <button
                      aria-label={`${day.date}, ${item.label}: ${item.plays} plays, ${item.listeners} listeners, ${item.likes} likes`}
                      className="group relative flex h-full w-2 items-end justify-center rounded-sm outline-none"
                      data-testid="upload-performance-bar"
                      key={`${day.label}-${item.label}`}
                      type="button"
                    >
                      <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rounded-full bg-cyan-300/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
                      <span
                        className={`pointer-events-none absolute bottom-[calc(100%+10px)] z-30 w-44 translate-y-2 rounded-lg border border-white/15 bg-[#111a2c]/95 p-4 text-xs opacity-0 shadow-2xl transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${
                          index === 0 && sampleIndex < 2
                            ? "left-0"
                            : index === selected.days.length - 1 &&
                                sampleIndex > day.samples.length - 3
                              ? "right-0"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      >
                        <span className="mb-1 block text-left text-slate-300">
                          {day.date}
                        </span>
                        <span className="mb-3 block text-left font-medium text-white">
                          {item.label}
                        </span>
                        <ChartLegend
                          color="bg-violet-500"
                          label="Plays"
                          value={item.plays}
                        />
                        <ChartLegend
                          color="bg-blue-400"
                          label="Listeners"
                          value={item.listeners}
                        />
                        <ChartLegend
                          color="bg-fuchsia-400"
                          label="Likes"
                          value={item.likes}
                        />
                      </span>
                      <span
                        aria-hidden="true"
                        className="w-2 rounded-t-sm bg-gradient-to-t from-fuchsia-600 via-violet-500 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.16)] transition duration-150 group-hover:brightness-125 group-focus-visible:brightness-125"
                        style={{
                          height: `${Math.max(
                            14,
                            (item.value / maxValue) * 176,
                          )}px`,
                          opacity:
                            sampleIndex === day.samples.length - 1 ? 0.82 : 1,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            className="absolute inset-x-14 bottom-4 z-10 grid text-center text-xs text-slate-400"
            style={{
              gridTemplateColumns: `repeat(${selected.days.length}, minmax(0, 1fr))`,
            }}
          >
            {selected.days.map((day) => (
              <span key={day.label}>{day.label}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricMiniCard({
  label,
  trend,
  value,
}: {
  label: string;
  trend: string;
  value: string;
}) {
  return (
    <div className="border-b border-white/10 bg-white/[0.03] p-3 last:border-b-0">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">
        {value}{" "}
        <span className="text-xs font-medium text-emerald-300">{trend}</span>
      </p>
    </div>
  );
}

function ChartLegend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="mt-2 flex min-w-32 items-center justify-between gap-5">
      <span className="flex items-center gap-2 text-slate-400">
        <span className={`size-2 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-mono text-white">{value}</span>
    </div>
  );
}
