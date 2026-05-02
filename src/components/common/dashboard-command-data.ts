export type DashboardCommandSection =
  | "Pages"
  | "Create"
  | "Views"
  | "Connections";

export type DashboardCommandIcon =
  | "billing"
  | "calendar"
  | "channels"
  | "filter"
  | "generate"
  | "library"
  | "overview"
  | "queue"
  | "settings"
  | "suno"
  | "template"
  | "youtube";

export type DashboardCommandItem = {
  href: string;
  icon: DashboardCommandIcon;
  id: string;
  keywords: string[];
  section: DashboardCommandSection;
  subtitle: string;
  title: string;
};

export const dashboardCommandSections: DashboardCommandSection[] = [
  "Pages",
  "Create",
  "Views",
  "Connections",
];

export const dashboardCommandItems: DashboardCommandItem[] = [
  {
    href: "/dashboard",
    icon: "overview",
    id: "page-overview",
    keywords: ["home", "metrics", "activity", "overview", "workspace"],
    section: "Pages",
    subtitle: "Workspace metrics, activity, and quick actions",
    title: "Overview",
  },
  {
    href: "/dashboard/generate",
    icon: "generate",
    id: "page-generate",
    keywords: ["create", "generation", "suno", "prompt", "music", "track"],
    section: "Pages",
    subtitle: "Create a new instrumental track",
    title: "Create Generation",
  },
  {
    href: "/dashboard/library",
    icon: "library",
    id: "page-library",
    keywords: ["tracks", "assets", "approved", "published", "songs"],
    section: "Pages",
    subtitle: "Browse generated tracks and publishing assets",
    title: "Library",
  },
  {
    href: "/dashboard/scheduled",
    icon: "calendar",
    id: "page-scheduled",
    keywords: ["calendar", "scheduled", "uploads", "publishing", "planner"],
    section: "Pages",
    subtitle: "Review upcoming YouTube uploads",
    title: "Scheduled Uploads",
  },
  {
    href: "/dashboard/queue",
    icon: "queue",
    id: "page-queue",
    keywords: ["jobs", "queue", "status", "render", "upload", "worker"],
    section: "Pages",
    subtitle: "Track generation, render, and upload jobs",
    title: "Generation Queue",
  },
  {
    href: "/dashboard/channels",
    icon: "channels",
    id: "page-channels",
    keywords: ["youtube", "connections", "channels", "suno", "integrations"],
    section: "Pages",
    subtitle: "Manage YouTube channels and Suno connection",
    title: "Connections",
  },
  {
    href: "/dashboard/billing",
    icon: "billing",
    id: "page-billing",
    keywords: ["plan", "usage", "credits", "stripe", "invoices", "upgrade"],
    section: "Pages",
    subtitle: "Plan, usage, and customer portal",
    title: "Billing",
  },
  {
    href: "/dashboard/settings",
    icon: "settings",
    id: "page-settings",
    keywords: ["workspace", "defaults", "settings", "preferences"],
    section: "Pages",
    subtitle: "Workspace defaults and publishing preferences",
    title: "Workspace Settings",
  },
  {
    href: "/dashboard/generate?style=lo-fi&mood=chill&duration_seconds=180",
    icon: "template",
    id: "create-lofi",
    keywords: ["template", "lofi", "lo-fi", "chill", "study", "beat"],
    section: "Create",
    subtitle: "Open the generator prefilled for a chill lo-fi track",
    title: "Create lo-fi study beat",
  },
  {
    href: "/dashboard/generate?style=ambient&mood=focus&duration_seconds=240",
    icon: "template",
    id: "create-ambient",
    keywords: ["template", "ambient", "focus", "loop", "calm"],
    section: "Create",
    subtitle: "Start an ambient focus prompt with a longer duration",
    title: "Create ambient focus loop",
  },
  {
    href: "/dashboard/generate?style=synthwave&mood=retro&duration_seconds=180",
    icon: "template",
    id: "create-synthwave",
    keywords: ["template", "synthwave", "retro", "neon", "80s"],
    section: "Create",
    subtitle: "Jump into a retro synthwave generation",
    title: "Create retro synthwave track",
  },
  {
    href: "/dashboard/queue?status=preview_ready",
    icon: "filter",
    id: "view-preview-ready",
    keywords: ["approval", "preview", "ready", "review", "queue"],
    section: "Views",
    subtitle: "Open tracks waiting for approval or publishing",
    title: "Review preview-ready tracks",
  },
  {
    href: "/dashboard/queue?status=failed",
    icon: "filter",
    id: "view-failed",
    keywords: ["failed", "errors", "retry", "queue", "worker"],
    section: "Views",
    subtitle: "Inspect jobs that need attention",
    title: "Open failed jobs",
  },
  {
    href: "/dashboard/library?status=approved",
    icon: "filter",
    id: "view-approved",
    keywords: ["approved", "library", "tracks", "publish"],
    section: "Views",
    subtitle: "Filter the library to tracks ready for publishing",
    title: "Find approved tracks",
  },
  {
    href: "/dashboard/library?status=uploaded",
    icon: "filter",
    id: "view-uploaded",
    keywords: ["uploaded", "published", "youtube", "library"],
    section: "Views",
    subtitle: "Show tracks already uploaded to YouTube",
    title: "Open uploaded tracks",
  },
  {
    href: "/dashboard/library",
    icon: "calendar",
    id: "view-schedule-next",
    keywords: ["schedule", "upload", "calendar", "publish", "library"],
    section: "Views",
    subtitle: "Pick a library track and schedule it",
    title: "Schedule next upload",
  },
  {
    href: "/dashboard/channels",
    icon: "youtube",
    id: "connect-youtube",
    keywords: ["connect", "youtube", "oauth", "channel", "integration"],
    section: "Connections",
    subtitle: "Add or reconnect a YouTube destination",
    title: "Connect YouTube channel",
  },
  {
    href: "/dashboard/channels",
    icon: "suno",
    id: "connect-suno",
    keywords: ["connect", "suno", "credits", "account", "integration"],
    section: "Connections",
    subtitle: "Check Suno status, limits, and connection health",
    title: "Manage Suno connection",
  },
  {
    href: "/dashboard/billing",
    icon: "billing",
    id: "manage-plan",
    keywords: ["upgrade", "plan", "billing", "limits", "credits"],
    section: "Connections",
    subtitle: "Open plan limits, usage, and Stripe billing",
    title: "Manage plan",
  },
];

export function filterDashboardCommandItems(
  query: string,
  items: DashboardCommandItem[] = dashboardCommandItems,
) {
  const terms = tokenize(query);

  if (terms.length === 0) {
    return items;
  }

  return items
    .map((item, index) => ({
      index,
      item,
      score: scoreCommandItem(item, terms),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => result.item);
}

function scoreCommandItem(item: DashboardCommandItem, terms: string[]) {
  const title = item.title.toLowerCase();
  const subtitle = item.subtitle.toLowerCase();
  const href = item.href.toLowerCase();
  const keywords = item.keywords.map((keyword) => keyword.toLowerCase());
  const haystack = [title, subtitle, href, item.section.toLowerCase(), keywords]
    .flat()
    .join(" ");

  if (!terms.every((term) => haystack.includes(term))) {
    return 0;
  }

  return terms.reduce((score, term) => {
    if (title === term) {
      return score + 120;
    }

    if (title.startsWith(term)) {
      return score + 80;
    }

    if (title.includes(term)) {
      return score + 48;
    }

    if (keywords.some((keyword) => keyword.startsWith(term))) {
      return score + 32;
    }

    if (subtitle.includes(term)) {
      return score + 18;
    }

    if (href.includes(term)) {
      return score + 10;
    }

    return score + 1;
  }, 0);
}

function tokenize(value: string) {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}
