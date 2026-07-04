# Bussin Design System — "Ember on Ink"

The visual language for the single-window app, inspired by the confidence of
Lovable's studio UI: near-black neutral surfaces, one huge friendly hero
moment over an aurora gradient, quiet 1px-bordered panels everywhere else.
Tokens live in `src/app/globals.css`; primitives in `src/components/ui`.
Everything visible must be expressible with these — if a screen needs a
color, spacing, or radius that is not here, the system changes first, not
the screen.

The living reference is the dev-only playground at `/design` — every
primitive, variant, and state rendered on the real tokens.

## Principles

1. **Ink, not tint.** Surfaces are neutral near-black (`--background` and
   friends carry almost no chroma). No violet-gray washes — color belongs to
   the accent and the aurora, never to surfaces.
2. **One accent: ember.** Hot magenta-coral (`--primary`) is the only brand
   color on any view. It marks the primary action, active nav, focus, and
   selection — and nothing else. Cyan/blue (`--info`) appears only in
   informational state chips and links.
3. **State colors mean state.** `--success`, `--warning`, `--danger`,
   `--info` mark job/track status and feedback. Never use them decoratively.
4. **Borders before shadows.** Surfaces are flat: `--panel`/`--card` fill
   with a 1px `--line`/`--border` border. Elevation exists only for floating
   surfaces (dialogs, popovers, dropdowns) via `--shadow-elevated`, plus the
   hero prompt focus glow (`.prompt-card`).
5. **Sound made visible, everywhere the product performs.** Every
   expressive visual derives from one concept: audio made visual —
   waveforms, frequency bars, pulses that follow what the product is
   actually doing. The ambient trio (`<Aurora />`, `<Starfield />`,
   `.grain`) is the house atmosphere and runs on the home page, auth
   screens, and `/dashboard` alike — the dashboard is a stage too, never a
   flat black box. The home page may go further: waveform-driven hero
   motion and choreographed set-piece animations are welcome as long as
   they derive from the sound concept and stay performant. On the
   dashboard, everything **beyond** the ambient trio stays reactive —
   triggered by real audio or status events (preview playback, generation
   progress, track ready, publish), not idle decoration. Utility pages
   reached from the avatar menu (settings, billing, channels) stay plain.

   Everywhere: ambient effects never sit on buttons, cards, borders, or
   text; the only gradients are the aurora (via `<Aurora />`) and the logo
   mark; decoration that derives from neither sound nor state stays banned.

6. **Typography does the hierarchy.** Bricolage Grotesque (`--font-display`)
   is only for h1/h2-level headlines and the wordmark — big, confident,
   Lovable-style. Geist Sans is for all body/UI text; Geist Mono is for
   numeric, duration, counter, and timestamp values.
7. **Snappy is a design token.** No full-page loaders for pages that can
   stream; skeletons (`Skeleton`, `.bussin-shimmer`) only where data is
   genuinely async; optimistic UI for mutations the user just performed.

## Tokens

### Surfaces (darkest → lightest)

| Token                       | Use                                  |
| --------------------------- | ------------------------------------ |
| `--background`              | page background                      |
| `--panel` / `--card`        | cards, feed items, sidebars          |
| `--panel-strong`            | raised elements inside a card (rare) |
| `--panel-soft` / `--accent` | hover fills, selected states         |
| `--popover`                 | dialogs, dropdowns, floating panels  |
| `--input`                   | form control fills                   |

### Text

`--foreground` for primary text, `--muted-foreground` for secondary. No
other text colors except state colors on state text.

### Borders & focus

`--line` for surface borders, `--border` for control borders, `--ring` for
focus rings (3px, 35% alpha — already built into primitives).

### Brand & state

`--primary` (ember, oklch hue 356) for the primary action and active nav;
`--secondary`/`--muted` for neutral fills; `--destructive`/`--danger`,
`--success`, `--warning`, `--info` for state only.

Aurora colors (`--aurora-1` indigo, `--aurora-2` magenta, `--aurora-3`
ember-orange) are backdrop-only and must be used through `<Aurora />`.

### Radius

`--radius` = 0.75rem. Use `rounded-md`/`rounded-lg` from the theme scale.
The hero prompt card may use `rounded-xl`. Avatars and dots may be
`rounded-full`. Nothing else.

### Elevation & fonts

`--shadow-elevated` is the only shadow, reserved for floating surfaces
(dialogs, popovers, dropdowns). Fonts are exposed as `--font-sans` (Geist
Sans), `--font-mono` (Geist Mono), and `--font-display` (Bricolage
Grotesque) — see the Typography principle for when each applies.

### Spacing & type

Tailwind defaults (4px base). Type scale in practice: `text-xs` meta,
`text-sm` body, `text-base` inputs, `text-lg`–`text-2xl` headings, with
`font-display` hero headlines allowed up to `text-5xl`. Use `font-mono`
only for durations, counters, and timestamps.

## Components

Use the primitives in `src/components/ui` (Button, Card, Badge, Input,
Textarea, Dialog, DropdownMenu, Skeleton, Table, Toaster). They consume
tokens only — raw palette classes (`violet-200`, `slate-950`, hex values)
are banned in product code. Status display uses `Badge` variants; the
legacy `.status-pill` classes exist only for unrouted legacy modules.

Buttons: `default` (solid ember) is the one primary action per view;
`outline`/`secondary` for everything else; `ghost` for icon buttons;
`destructive` only for irreversible actions.

### Authoring a primitive

One convention, follow it exactly:

- A primitive with **variants** (visual alternatives a caller picks —
  Button, Badge) declares them with **CVA** (`class-variance-authority`)
  and exports the `cva` result so variants are typed.
- A primitive **without variants** (Input, Dialog, Table, Skeleton…) is a
  plain component with a single token-based class string merged via
  `cn(...)` — no CVA boilerplate for a single look.
- Either way: token utilities only (`bg-card`, `border-line`,
  `text-muted-foreground`…) — raw palette classes and hex/oklch literals
  are banned in components; new colors are added as tokens in
  `globals.css` first.
- Every new primitive or variant gets a section in the `/design`
  playground (`src/app/design/design-showcase.tsx`) in the same change.

## Motion

Motion is part of the identity, not garnish. The library is `motion`
(`motion/react`); shared primitives live in `src/components/common/motion.tsx`
(`MotionProvider`, `Reveal`, `staggerDelay`, `EASE_OUT`).

1. **Enter-only stagger reveals.** Page content cascades in — fade +
   8px rise, ~40–60ms apart, capped at ~320ms total — while the top bar
   stays put. No exit animations, no route-transition libraries, no
   `template.tsx` remounts.
2. **Ambient everywhere, reactive on top.** The ambient trio runs
   continuously on home, auth, and `/dashboard`. The home page may add
   choreographed, waveform-derived set pieces; on the dashboard everything
   beyond the ambient trio moves only in response to user action or job
   progress — never idly. See principle 5.
3. **Signature moments are budgeted.** The Studio gets at most four
   celebration/signature effects, each tied to a meaningful event: track
   flips to ready (`.track-ready-pop`), generation in progress, publish
   succeeds, schedule armed. Each is one-shot (or runs only while its
   event is live), and adding a fifth means retiring one.
4. **Optimistic first.** Feed mutations (approve, publish, retry, cancel)
   update the card the moment the user acts; the server confirms in the
   background and failures roll back with a toast. Motion sells the
   response — the click itself must feel acknowledged in under 100ms.
5. **Transform and opacity only.** Never animate layout properties.
   `MotionProvider` sets `reducedMotion="user"`, and every CSS animation
   (`.aurora-blob`, `.star`, `.track-ready-pop`) is disabled under
   `prefers-reduced-motion` — new animations must follow both rules.
6. **Nothing fights the feed.** The feed re-renders on a 4s poll; entrance
   animations run only when an element mounts, never on data refresh.

## States

Every async surface ships loading (Skeleton), empty (EmptyState component),
and error (plain text in `--danger` with a retry affordance) states.
Mutations confirm via toast (sonner). Add `data-testid` selectors for
Playwright on interactive elements.

## Responsive

Desktop-first, optimized for 1280px+. Every screen must remain fully
usable with no horizontal scroll, clipping, or overlap down to 375px.
Audit widths: 375 / 768 / 1440.
