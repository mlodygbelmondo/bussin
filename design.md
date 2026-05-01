# Bussin Design Reference

This file is the source of truth for Bussin UI work. Every agent must first inspect the current user-provided context and the files in `/design-reference`, then implement screens to match the closest reference screenshot as precisely as possible.

## Reference Set

- `/design-reference/PROMPT 1.png`: auth split screen with value proposition, dark orbital music visual and dual sign-in/sign-up cards.
- `/design-reference/PROMPT 2.png`: onboarding connection flow with top progress, four setup cards and bottom CTA rail.
- `/design-reference/PROMPT 3.png`: dashboard cockpit with persistent left sidebar, dense metric grid, charts, activity rails and quick actions.
- `/design-reference/PROMPT 5.png`: generation queue with grouped in-progress/review/completed rows and compact controls.
- `/design-reference/PROMPT 6.png`: track preview with large cover art, waveform, tabbed content and approval side panel.
- `/design-reference/PROMPT 7.png`: library grid with music/video cards, filters and empty upload tile.
- `/design-reference/PROMPT 8.png`: scheduled uploads calendar with right-side upcoming schedule.
- `/design-reference/PROMPT 9.png`: channel management with connection cards and YouTube visual hero.
- `/design-reference/PROMPT 10.png`: billing/settings with plan, usage, invoices, account and notification panels.

## Non-Negotiable Rule

If the user provides a screenshot, mockup, Figma export or other visual context, the implementation must follow it 1:1. Do not reinterpret the layout, palette, density or component styling unless the user explicitly asks for a redesign.

If a visual detail depends on an asset that is not present in the repository, stop and tell the user exactly what is missing. Examples:

- specific album/cover art
- brand logo mark beyond the existing Bussin text/logo approximation
- artist/channel avatar photos
- product screenshots or YouTube thumbnails
- waveform/audio-derived image data
- custom illustration or 3D render visible in a reference

Use temporary CSS-generated placeholders only when they preserve layout and when the missing asset is clearly documented in the final response.

## Visual DNA

Bussin is a premium, dark, creator-SaaS cockpit for AI music publishing. It should feel operational, dense and serious, with music/video energy coming from controlled neon accents and media panels.

- Background: off-black midnight navy, never pure black.
- Surfaces: layered navy panels with subtle radial lighting and fine borders.
- Accent: one primary violet/purple accent, supported sparingly by cyan/blue status colors.
- Typography: Geist Sans and Geist Mono. No serif fonts. Numbers, durations and quotas use mono.
- Density: desktop-first, practical cockpit spacing. Avoid airy marketing layouts inside the app.
- Corners: compact radii, generally `8px` or below for app controls and panels.
- Borders: 1px low-contrast blue/violet borders are preferred over heavy shadows.
- Shadows: subtle tinted depth only. No generic glow effects.
- Icons: use the installed icon system consistently. Keep icon stroke/weight visually even.
- Motion: use transform and opacity only. Prefer small tactile hover/active states.

## Layout System

App screens should use the same architecture as the references:

- Persistent left sidebar on desktop.
- Compact top utility bar inside the content region.
- Main content in asymmetric dense grids.
- Right-side rails for quick actions, status, schedules or summaries.
- Mobile collapses to one column with no horizontal scroll.
- Use `min-h-[100dvh]` for full-height screens, not `h-screen`.
- Avoid nested cards. A panel may contain rows, charts or controls; do not place decorative cards inside decorative cards.

Recommended dashboard grid:

- Desktop: 12 columns with `grid-flow-dense`.
- Common spans: `lg:col-span-8 + lg:col-span-4`, `lg:col-span-7 + lg:col-span-5`, `lg:col-span-4 * 3`.
- Rows must fill without dead cells.

## Components

### Buttons

- Primary buttons: violet gradient or solid violet with white text.
- Secondary/outline buttons: translucent navy surface, blue-violet border, light text.
- Ghost buttons: quiet hover using violet/navy fill.
- All buttons need visible focus states and tactile `active` transform.

### Cards and Panels

- Panels use dark navy translucent surfaces, subtle inner highlight and 1px borders.
- Use elevation only to separate important overlays or primary panels.
- KPI cards are compact and scannable, with mono numbers and small trend text.

### Forms

- Labels sit above inputs.
- Inputs use dark filled surfaces, violet focus ring and clear placeholder contrast.
- Error text appears below fields.
- Loading, empty and error states must exist for production screens.

### Tables and Lists

- Prefer dense rows with dividers.
- Header text is small, uppercase or muted, and scannable.
- Row hover should be subtle and not resize layout.

### Media

- Track covers, waveform bars, spectrum charts and YouTube/video thumbnails are first-class design elements.
- If actual media is not available, use stable CSS gradients only as placeholders and document that real media assets are required for final 1:1 parity.

## Current Asset Gaps

The repository currently contains reference screenshots but no extracted production assets from those screenshots. For perfect 1:1 reproduction, request these from the user when implementing final screens:

- Bussin symbol/logo source file.
- Auth hero/music visual render from `PROMPT 1.png`.
- Onboarding and channel YouTube/Suno integration illustrations.
- Album/track cover images used in library, queue and preview screens.
- Exact waveform/spectrum chart assets or real audio data for rendering them.
- Channel avatars and YouTube thumbnails.

Until those are supplied, preserve the exact layout proportions and use CSS-generated placeholders that match the mood, color and density.

## Agent Checklist

Before completing any UI task:

- Compare the target screen against the closest `/design-reference/PROMPT *.png`.
- Confirm the layout, density, palette, controls and spacing match the screenshot.
- Confirm no required asset is silently replaced without telling the user.
- Run the repository formatter before reporting completion.
- For authenticated flows, use only test credentials from `.env` or `.env.local`; never production credentials.
