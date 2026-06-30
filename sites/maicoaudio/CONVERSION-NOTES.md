# Maico Audiological Services - Emdash First Pass

This folder is the first-pass Emdash/Astro conversion of the static HTML site in `../local-copy`.

## Source of Truth

- Visual/static source: `../local-copy`
- Do not edit `../local-copy` for Emdash work.
- Rebuild the bridge from the static source with:

```bash
python ../scripts/build_emdash_bridge.py
```

## Current Approach

- Public routes are served through Emdash/Astro as server-rendered pages.
- Each route returns a generated raw HTML shell from `src/shells/pages/`.
- Local static assets were copied into `public/assets/`.
- `seed/seed.json` contains the first-pass `content_pages` collection.
- `public/assets/media-manifest.json` lists copied public assets for later media-library/R2 reconciliation.
- All image-like assets in `public/` were uploaded into the built-in Emdash Media Library for local development.

## Local Development

From the project root:

```bash
start-maicoaudio-server.bat
```

Or from this folder:

```bash
npm run dev -- --host 127.0.0.1 --port 4323
```

## Verification Completed

- `npm run build` passed.
- 42 generated public routes were checked with Playwright against the local Emdash server.
- Each checked route returned `200` and included a page title, global header, and global footer.

## Known First-Pass Limitations

- The pages are currently raw static shells, not fully decomposed into reusable Astro components.
- Static page shells still reference `public/assets/` paths for visual parity.
- A later pass can replace direct public asset references with media-library-backed URLs now that the local Media Library has been populated.
