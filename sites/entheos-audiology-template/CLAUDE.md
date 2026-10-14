# Entheos audiology template · design 1 (demo build)

A reusable website template for independent audiology practices (Entheos Digital
Growth Advantage members and Bidview clients). Design 1 is "nested panels",
handed off from Claude Design in `design/`.

## Read first
1. `design/HANDOFF.md`: pages, rules, tweaks, build order. **It says Next.js on
   Vercel; that was overruled.** We build in Astro, server-rendered on Cloudflare
   Workers, so phase 2 can move straight onto EmDash 1.2.0. Everything else in the
   handoff stands.
2. `design/BOARDS.md` + `design/source/*.dc.html`: reference markup per page and
   state. Not code to run.
3. `design/styles/d1.css`: the designer's stylesheet, the single source for styles.

## How this site is put together
- `scripts/build-css.mjs` turns `design/styles/d1.css` into `src/styles/d1.css`
  (generated; never edit it). The boards write phone rules as `.m .x{}`; the script
  moves them into `@media (max-width: 1023px)`.
- `src/styles/site.css`: what the boards did inline, the header breakpoint
  (desktop header from 1280px), the tablet step (640 to 1023px) and the Review
  controls extras.
- `src/data/practice.ts`: the one practice data file. No practice details in
  components.
- `src/lib/settings.ts`: Review controls settings read from the query string.
  Global settings ride along on internal links via `s.href()`; page settings don't.
  Defaults are left out of URLs.
- `src/lib/color.ts`: the colour logic, ported exactly. The same maths is
  duplicated in `ReviewControls.astro` for live colour previews; keep them in step.
- `src/pages/[...slug].astro`: a stand-in for pages not built yet.

## Decisions (Liz, 2026-10-14)
- Service detail: recent posts card is ON by default, in the sidebar (Vince: no
  post links in page body; sidebars are fine).
- Defaults: Teal / Amber, photo hero, two offices (the spec's, not the HomeFull
  board's saved state).
- Demo logos: the code-drawn Lakeview mark, wide and stacked (`Logo.astro`).
- Tablet: no separate design; built from patterns already in the design.
- Demo is public, on the learning account's workers.dev.

## Working style
Build in the handoff's order and stop after each step for Liz's review. When the
design and the handoff disagree, ask before guessing.

## Commands
- `npm run dev` (local), `npm run build`
- Demo deploy: `npm run deploy` (learning account, design sandbox, not a live site).
  Preview of a change without replacing the demo: `npx wrangler versions upload --tag <tag> --message "<what>"`.
