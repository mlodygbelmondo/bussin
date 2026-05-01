export type PromptComposerInput = {
  style: string;
  mood: string;
  duration_seconds: number;
  track_count: number;
};

export type ComposedPrompt = {
  final_prompt: string;
  prompt_summary: string;
  title_seed: string;
  suggested_tags: string[];
};

const BLOCKED_ARTIST_PATTERNS = [
  /\blike\s+Taylor\s+Swift\b/gi,
  /\bin\s+the\s+style\s+of\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?/g,
  /\bsounds?\s+like\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?/g,
];

export function composePrompt(input: PromptComposerInput): ComposedPrompt {
  const style = normalizeText(stripArtistReferences(input.style));
  const mood = normalizeText(stripArtistReferences(input.mood));
  const title_seed = titleCase(`${mood} ${primaryStyleToken(style)}`.trim());
  const suggested_tags = createTags(`${style} ${mood}`);
  const prompt_summary = `${style} instrumental for ${mood}`;
  const final_prompt = [
    "Instrumental only, no vocals.",
    `Style: ${style}.`,
    `Mood: ${mood}.`,
    `Duration: about ${input.duration_seconds} seconds.`,
    `Create ${input.track_count} distinct ${pluralize("track", input.track_count)}.`,
    "Keep the arrangement original, concise, and ready for YouTube background listening.",
  ].join(" ");

  return {
    final_prompt: final_prompt.slice(0, 600),
    prompt_summary,
    title_seed,
    suggested_tags,
  };
}

function stripArtistReferences(value: string) {
  return BLOCKED_ARTIST_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ""),
    value,
  );
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function primaryStyleToken(style: string) {
  return style.split(/\s+/).find((token) => token.length > 3) ?? style;
}

function createTags(value: string) {
  const stopWords = new Set(["like", "with", "from", "only", "track"]);

  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2 && !stopWords.has(token)),
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

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}
