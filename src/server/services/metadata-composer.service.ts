import type { Enums } from "@/lib/database.types";

export type MetadataComposerInput = {
  title_seed: string;
  style: string;
  mood: string;
  suggested_tags?: string[];
  target_youtube_channel_id?: string;
};

export type YouTubeMetadata = {
  title: string;
  description: string;
  tags: string[];
  privacy_status: Enums<"youtube_privacy_status">;
  target_youtube_channel_id?: string;
};

export function composeYouTubeMetadata(
  input: MetadataComposerInput,
): YouTubeMetadata {
  const title = `${titleCase(input.title_seed)} - ${titleCase(
    input.mood,
  )} ${titleCase(input.style)}`.slice(0, 100);
  const tags = normalizeTags([
    ...(input.suggested_tags ?? []),
    input.style,
    input.mood,
    "instrumental",
    "background music",
  ]);

  return {
    title,
    description: [
      `${titleCase(input.style)} instrumental music for ${input.mood}.`,
      "Built for focus, background listening, and creator-safe publishing workflows.",
    ].join("\n\n"),
    tags,
    privacy_status: "private",
    target_youtube_channel_id: input.target_youtube_channel_id,
  };
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .flatMap((tag) => tag.split(","))
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 60),
    ),
  ).slice(0, 10);
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}
