# AudiologistDirectory.com

US-wide directory of ~4,400 audiology practices built on [emdash CMS](https://emdashcms.com) (Astro 6 + Cloudflare Workers + D1).

## Stack

| Layer | Technology |
|---|---|
| CMS | emdash v0.1.x |
| Frontend | Astro 6.1 (server-rendered) |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Media | Cloudflare R2 |
| Sessions | Cloudflare KV |

## Getting started

### Prerequisites
- Node.js 20+
- npm
- Wrangler CLI (`npm i -g wrangler`)
- Access to Cameron's Cloudflare account

### Install

```bash
git clone https://github.com/vince112385/audiologist-directory.git
cd audiologist-directory
npm install --ignore-scripts   # --ignore-scripts required on Windows (skips better-sqlite3)
```

### Local development

```bash
npm run dev                    # http://localhost:4321
```

Admin UI at `http://localhost:4321/_emdash/admin` — you'll need to complete the setup wizard on first run (creates local D1 database).

### Seed editorial content

After emdash setup, import the editorial content (pages, stats, FAQs, brands, etc.):

```bash
npm run db:schema              # Create custom tables (practices_search, reviews, providers)
npx wrangler d1 execute audiologist-directory-db --local --file=./seed/seed-entries.sql
```

### Import practice data

```bash
node scripts/import-practices.mjs          # Local import (~4,400 practices, ~22K reviews)
node scripts/import-remote.mjs             # Remote import (smaller batches, retries)
```

## Environments

| Environment | Worker name | URL | D1 Database |
|---|---|---|---|
| **Local** | — | http://localhost:4321 | `.wrangler/state/v3/d1/` (auto-created) |
| **Staging** | audiologist-directory-staging | `*.workers.dev` | `audiologist-directory-staging-db` |
| **Production** | audiologist-directory | `*.workers.dev` (custom domain TBD) | `audiologist-directory-db` |

### Deploy to staging

```bash
npx astro build
npx wrangler deploy --env staging
```

### Deploy to production

```bash
npx astro build
npx wrangler deploy
```

## Project structure

```
src/
├── components/          # Shared components (SiteNav, SiteFooter, Pagination)
├── layouts/             # Base.astro (Tailwind CDN, fonts, design tokens)
├── lib/                 # db.ts — D1 query helpers for practices/reviews/providers
├── pages/
│   ├── index.astro                    # Homepage
│   ├── search.astro                   # Search with filters
│   ├── audiologists/
│   │   ├── index.astro                # Browse by state
│   │   ├── [state].astro              # State landing (dynamic)
│   │   └── [state]/[city].astro       # City landing (dynamic)
│   ├── practice/[slug].astro          # Practice profile (dynamic)
│   ├── brands/
│   │   ├── index.astro                # All brands
│   │   └── [slug].astro               # Brand-specific listings (dynamic)
│   ├── resources/
│   │   ├── index.astro                # All resources/blog posts
│   │   └── [slug].astro               # Individual post (dynamic)
│   ├── list-your-practice.astro       # Practice submission form
│   ├── about.astro                    # About page
│   ├── methodology.astro             # How we rank
│   ├── contact.astro                 # Contact form
│   ├── privacy.astro                 # Privacy policy
│   ├── terms.astro                   # Terms of service
│   └── accessibility.astro           # Accessibility statement
├── live.config.ts       # emdash loader config
└── worker.ts            # Cloudflare Worker with edge caching
seed/
├── seed.json            # emdash collection schema + seed entries
├── seed-entries.sql     # SQL to insert editorial content into D1
└── schema-custom.sql    # Custom D1 tables (practices_search, reviews, providers)
scripts/
├── import-practices.mjs # Full import (local or remote with --remote flag)
└── import-remote.mjs    # Lightweight remote-only import with retries
```

## Data architecture

**emdash collections (editable in admin):**
- Pages (7) — hero headlines, CTAs, body text per page
- Stats (4) — trust strip numbers
- How It Works (3) — step cards
- Specializations (4) — Tinnitus, Pediatric, Cochlear, Vestibular
- Brands (8) — hearing aid brands with taglines
- Resources (3) — blog/article posts
- FAQs (5) — global FAQ entries
- Landing Intros (2) — state/city intro prose
- Practices (~4,400) — practice listings (also in D1 search index)

**D1 custom tables (queried by Astro pages):**
- `practices_search` (4,415 rows) — denormalized practice data for fast queries
- `providers` (6,476 rows) — parsed from pipe-delimited provider field
- `reviews` (22,049 rows) — Google reviews (up to 5 per practice)

## Design system

- **Primary:** Forest Green `#2D5F4E`
- **Fonts:** Newsreader (headlines) + Inter (body, 17px base)
- **Audience:** Adults 55+ — large fonts, high contrast, big touch targets
- **Details:** See `DESIGN_SYSTEM.md` in the handoff folder

## Known issues / patches

emdash v0.1.x has a bug where `IN(...)` clauses with 100+ IDs hit SQLite's compound SELECT limit. We patched 3 files in `node_modules/emdash/src/database/repositories/`:
- `byline.ts` — `getContentBylinesMany()` and `findByUserIds()` batched to chunks of 30
- `seo.ts` — `getMany()` batched to chunks of 30

These patches are lost on `npm install`. Re-apply them or check if emdash has fixed this in a newer version.

## Cloudflare resources (Cameron's account)

| Resource | ID |
|---|---|
| Account | `239e9d015c7a3a39cdc2e9400312f553` |
| D1 (production) | `56ae1329-dd81-49a7-a570-b3c49ae03c90` |
| R2 bucket | `audiologist-directory-media` |
| KV namespace | `028dfa4da881449cb1fcfb8ae46b6e2e` |
| Worker URL | https://audiologist-directory.cameron-239.workers.dev |
