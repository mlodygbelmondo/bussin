export type DashboardKpiTone = "violet" | "amber" | "cyan" | "emerald";

export type DashboardKpi = {
  icon: "tracks" | "approval" | "calendar" | "upload" | "limit" | "queue";
  label: string;
  tone: DashboardKpiTone;
  trendLabel: string;
  trendTone: "positive" | "warning" | "neutral";
  value: string;
};

export type DashboardAction = {
  description: string;
  href: string;
  icon: "rocket" | "upload" | "youtube";
  label: string;
};

export type DashboardActivity = {
  icon: "youtube" | "calendar" | "warning" | "wave";
  label: string;
  time: string;
};

export type DashboardQueueItem = {
  actionLabel: string;
  progress: number | null;
  scheduledLabel: string;
  status: "Generating" | "Processing" | "Scheduled" | "Failed";
  title: string;
  tone: "violet" | "blue" | "cyan" | "red";
};

export type DashboardTopTrack = {
  duration: string;
  plays: string;
  progress: number;
  title: string;
};

export type DashboardHomeData = {
  activity: DashboardActivity[];
  generatedTotal: number;
  hasFailures: boolean;
  isEmpty: boolean;
  kpis: DashboardKpi[];
  planName: string;
  queue: DashboardQueueItem[];
  queueActive: number;
  queueCapacity: number;
  quickActions: DashboardAction[];
  sunoCredits: number;
  sunoLimit: number;
  sunoResetLabel: string;
  topTracks: DashboardTopTrack[];
  uploadPerformance: {
    comments: string;
    likes: string;
    listeners: string;
    totalPlays: string;
  };
  userDisplayName: string;
  workspaceId: string;
};
