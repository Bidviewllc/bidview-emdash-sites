# Ontario Hearing — emdash CMS wiring runbook

## What's in this folder

- **`generate-seed.mjs`** — Reads `src/data/pages.json` and emits `seed-entries.sql` with 131 rows across 14 collections. Re-run any time the source content changes.
- **`seed-entries.sql`** — Generated SQL. Applied to D1 to populate the CMS.

## Collections (14 total — see `emdash-env.d.ts`)

| Collection         | Rows | Type      | Notes |
|--------------------|-----:|-----------|-------|
| `site_settings`    |    1 | singleton | phone, email, address, hours |
| `homepage`         |    1 | singleton | every editable home section |
| `about_page`       |    1 | singleton | about-us copy |
| `contact_page`     |    1 | singleton | contact intro |
| `team_members`     |    3 | collection| Drs. McNamara / Orlando / Segmond |
| `testimonials`     |    3 | collection| real Google reviews |
| `faqs`             |    8 | collection| homepage FAQ accordion |
| `blog_posts`       |   48 | collection| every post at root URL |
| `service_pages`    |   19 | collection| `/hearing-test/`, `/cochlear-implant/`, nested pittsford pages, etc. |
| `brand_pages`      |   11 | collection| `/oticon-hearing-aids/` etc. |
| `location_pages`   |   22 | collection| `/audiologists-in-brighton/` etc. |
| `resource_pages`   |    4 | collection| `/audiology/`, `/hearing-loss/`, etc. |
| `condition_pages`  |    3 | collection| `/menieres-disease/`, `/vertigo/`, `/sensorineural-hearing-loss/` |
| `legal_pages`      |    6 | collection| `/privacy-policy/`, `/disclaimer/`, etc. |

## How to apply (production)

```bash
# 1. Confirm emdash-env.d.ts changes are deployed.
cd emdash
npm run deploy

# 2. Visit https://ontario-hearing.cameron-239.workers.dev/_emdash/admin/setup
#    Complete the setup wizard:
#    - Choose passkey or password auth
#    - Create admin user (Vince's email)
#    - Wizard creates D1 schema based on collections declared in emdash-env.d.ts
#      (this creates the ec_homepage, ec_about_page, ec_team_members, ... tables)

# 3. Apply the seed (creates 131 entries):
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN \
CLOUDFLARE_ACCOUNT_ID=239e9d015c7a3a39cdc2e9400312f553 \
npx wrangler d1 execute ontario-hearing-db --file=seed/seed-entries.sql --remote

# 4. Verify
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN \
CLOUDFLARE_ACCOUNT_ID=239e9d015c7a3a39cdc2e9400312f553 \
npx wrangler d1 execute ontario-hearing-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ec_%' ORDER BY name;" --remote

# 5. Confirm row counts
npx wrangler d1 execute ontario-hearing-db --command="
  SELECT 'site_settings' c, COUNT(*) n FROM ec_site_settings UNION ALL
  SELECT 'homepage', COUNT(*) FROM ec_homepage UNION ALL
  SELECT 'team_members', COUNT(*) FROM ec_team_members UNION ALL
  SELECT 'blog_posts', COUNT(*) FROM ec_blog_posts UNION ALL
  SELECT 'service_pages', COUNT(*) FROM ec_service_pages UNION ALL
  SELECT 'brand_pages', COUNT(*) FROM ec_brand_pages UNION ALL
  SELECT 'location_pages', COUNT(*) FROM ec_location_pages;
" --remote
```

## Astro page wiring pattern

Every `.astro` page uses this pattern to fetch from emdash with a fallback to the static `pages.json` data:

```astro
---
import { getEmDashEntry, getEmDashCollection } from "emdash";

// 1. Try CMS
let entry: any = null;
try {
  const r = await getEmDashEntry("homepage", "homepage");
  entry = r?.entry ?? null;
} catch {}

const d = entry?.data ?? {};   // data
const e = entry?.edit ?? {};   // edit bindings (data-emdash-ref spans)
---
<!-- Each editable field: -->
<h1 {...e.hero_heading}>{d.hero_heading ?? "Your guide to better hearing."}</h1>
<p {...e.hero_lead}>{d.hero_lead ?? "Static fallback text..."}</p>
```

- If D1 has the entry → CMS content renders + the `{...e.field}` spread makes the element inline-editable when logged into `/_emdash/admin`.
- If D1 is empty → falls back to the static string, page still works.

## Regenerating the seed

Edit `src/data/pages.json` (or the source `scraped/pages/*.json` + run `_process.mjs`), then:

```bash
node emdash/seed/generate-seed.mjs
# Then re-apply:
npx wrangler d1 execute ontario-hearing-db --file=seed/seed-entries.sql --remote
```

`INSERT OR REPLACE` makes re-running safe — existing rows are updated by primary key (slug-based id).

## After wiring

Once setup wizard + seed are applied AND all .astro files are wired:
1. Visit `/_emdash/admin` and log in.
2. Every page should render real content from D1.
3. Hovering an editable element shows the emdash inline editor toolbar.
4. Edits save to D1 and reflect on next page load (or instantly via the visual toolbar).
