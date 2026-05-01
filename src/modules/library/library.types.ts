export type LibraryFilters = {
  channel: string;
  date: string;
  mood: string;
  query: string;
  status: string;
  view: "card" | "list";
};

export type LibraryStatusTone =
  | "amber"
  | "blue"
  | "emerald"
  | "red"
  | "slate"
  | "violet";

export type LibraryChannel = {
  handle: string | null;
  id: string;
  thumbnailUrl: string | null;
  title: string;
};

export type LibraryTrack = {
  canPublish: boolean;
  channel: LibraryChannel | null;
  coverUrl: string | null;
  createdAt: string;
  durationLabel: string;
  durationSeconds: number | null;
  failureReason: string | null;
  generationId: string | null;
  imageAssetId: string | null;
  mood: string | null;
  prompt: string | null;
  status: string;
  statusLabel: string;
  statusTone: LibraryStatusTone;
  style: string | null;
  tags: string[];
  title: string;
  trackId: string;
  uploadStatus: string | null;
};

export type LibraryFilterOption = {
  label: string;
  value: string;
};

export type LibraryScreenData = {
  channels: LibraryChannel[];
  counts: {
    all: number;
    filtered: number;
  };
  filters: {
    channels: LibraryFilterOption[];
    moods: LibraryFilterOption[];
    statuses: LibraryFilterOption[];
  };
  isEmpty: boolean;
  page: {
    current: number;
    end: number;
    hasNext: boolean;
    hasPrevious: boolean;
    pageSize: number;
    start: number;
    totalPages: number;
  };
  tracks: LibraryTrack[];
  workspaceId: string;
};
