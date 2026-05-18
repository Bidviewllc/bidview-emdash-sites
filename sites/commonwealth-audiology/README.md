# Commonwealth Audiology

emdash (Astro 6 + Cloudflare) site for Commonwealth Audiology — Georgetown, KY.

## Stack

- **emdash** `0.8.0` — serverless CMS
- **Astro 6** — `output: "server"`
- **Cloudflare Workers** — D1 (database), R2 (media), KV (sessions)

## Local development

```bash
npm install
npm run dev          # local dev with SQLite (astro.config.local.mjs) → http://localhost:4321
```

`npm run bootstrap` runs `emdash init && emdash seed` to create and seed a
local `data.db`.

Admin UI: `/_emdash/admin` · API: `/_emdash/api/*`

## Deploy

```bash
npm run deploy:staging     # → commonwealth-audiology-staging.<account>.workers.dev
npm run deploy             # → production (requires review/approval first)
```

Hosting is on Cloudflare (Cameron's account). Staging Workers send
`X-Robots-Tag: noindex` on `*.workers.dev` hosts.

## Structure

- `src/pages/` — routes (homepage, internal pages, `news/`, contact, sitemap)
- `src/layouts/` — `Base`, `InternalPage`
- `src/components/` — Header, Footer, PageHero, Sidebar, Accordion, etc.
- `seed/seed.json` — emdash seed data
- `wrangler.jsonc` — Cloudflare bindings (top-level = production, `env.staging` = staging)
