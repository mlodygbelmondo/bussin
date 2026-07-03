# Bussin Design System

The visual language for the single-window app. Tokens live in
`src/app/globals.css`; primitives in `src/components/ui`. Everything visible
must be expressible with these — if a screen needs a color, spacing, or
radius that is not here, the system changes first, not the screen.

## Principles

1. **One accent.** Violet (`--primary`) is the only brand color on any view.
   Cyan/blue (`--info`) appears only in informational state chips and links.
2. **State colors mean state.** `--success`, `--warning`, `--danger`,
   `--info` mark job/track status and feedback. Never use them decoratively.
3. **Borders before shadows.** Surfaces are flat: `--panel`/`--card` fill with
   a 1px `--line`/`--border` border. Elevation is reserved for floating
   surfaces via `--shadow-elevated` and the hero prompt focus glow.
4. **One ambient signature.** Aurora ambient gradients are permitted only via
   the shared `<Aurora />` component as hero or empty-state backdrops — never
   on buttons, cards, borders, or text. No background grids or textures.
5. **Typography does the hierarchy.** Bricolage Grotesque (`--font-display`)
   is only for h1/h2-level headlines and the wordmark. Geist Sans is for all
   body/UI text; Geist Mono is for numeric, duration, counter, and timestamp
   values.

## Tokens

### Surfaces (darkest → lightest)

| Token                       | Use                                  |
| --------------------------- | ------------------------------------ |
| `--background`              | page background                      |
| `--panel` / `--card`        | cards, feed items, modals            |
| `--panel-strong`            | raised elements inside a card (rare) |
| `--panel-soft` / `--accent` | hover fills, selected states         |
| `--input`                   | form control fills                   |

### Text

`--foreground` for primary text, `--muted-foreground` for secondary. No
other text colors except state colors on state text.

### Borders & focus

`--line` for surface borders, `--border` for control borders, `--ring` for
focus rings (3px, 35% alpha — already built into primitives).

### Brand & state

`--primary` (violet) for the primary action and active nav;
`--secondary`/`--muted` for neutral fills; `--destructive`/`--danger`,
`--success`, `--warning`, `--info` for state only.

Aurora colors (`--aurora-1`, `--aurora-2`, `--aurora-3`) are backdrop-only and
must be used through `<Aurora />`.

### Radius

`--radius` = 0.75rem. Use `rounded-md`/`rounded-lg` from the theme scale.
Avatars and dots may be `rounded-full`. Nothing else.

### Spacing & type

Tailwind defaults (4px base). Type scale in practice: `text-xs` meta,
`text-sm` body, `text-base` inputs, `text-lg`–`text-2xl` headings. Use
`font-display` only for h1/h2-level headlines and the brand wordmark; use
`font-mono` only for durations, counters, and timestamps.

## Components

Use the primitives in `src/components/ui` (Button, Card, Badge, Input,
Textarea, Dialog, DropdownMenu, Skeleton, Table, Toaster). They consume
tokens only. Status display uses `Badge` variants; the legacy `.status-pill`
classes exist only for unrouted legacy modules.

Buttons: `default` (solid violet) is the one primary action per view;
`outline`/`secondary` for everything else; `ghost` for icon buttons;
`destructive` only for irreversible actions.

## States

Every async surface ships loading (Skeleton), empty (EmptyState component),
and error (plain text in `--danger` with a retry affordance) states.
Mutations confirm via toast (sonner). Add `data-testid` selectors for
Playwright on interactive elements.
