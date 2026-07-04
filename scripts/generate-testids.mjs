// Regenerates docs/testids.md from the data-testid attributes in src/.
// Run with: pnpm docs:testids
// The doc is generated — never edit it by hand; add data-testid attributes
// in components and rerun this script instead.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "docs", "testids.md");
const PATTERN = /data-testid=(?:"([^"]+)"|\{`([^`]+)`\}|\{"([^"]+)"\})/g;

const byTestid = new Map();

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(path);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = readFileSync(path, "utf8");

      for (const match of text.matchAll(PATTERN)) {
        const testid = match[1] ?? match[2] ?? match[3];
        const files = byTestid.get(testid) ?? new Set();

        files.add(relative(ROOT, path));
        byTestid.set(testid, files);
      }
    }
  }
}

walk(SRC);

const rows = [...byTestid.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([testid, files]) =>
      `| \`${testid}\` | ${[...files].sort().join("<br>")} |`,
  );

const doc = `# data-testid inventory

GENERATED FILE — do not edit. Regenerate with \`pnpm docs:testids\`.

This is the canonical list of Playwright selectors. Before inventing a new
\`data-testid\`, check here that the name is free; after adding one in code,
rerun the script so this list stays true.

${rows.length} test ids in src/.

| Test id | Defined in |
| --- | --- |
${rows.join("\n")}
`;

writeFileSync(OUT, doc);
console.log(`Wrote ${relative(ROOT, OUT)} (${rows.length} test ids).`);
