# Grant C. Meyer Homes — emdash/Astro Rebuild Plan
_Planned 2026-08-07. Decision: rebuild the front-end in emdash/Astro so the client can edit **ALL page copy**,
while listings stay on the Trestle → D1 replication we already built._

## Goal
Give the client a **CMS to edit ALL text across the site** — homepage, every content page, neighborhood copy,
contact details (and a blog) — **without** letting them touch listings (MLS data, auto-synced). Confirmed
2026-08-07: **all content is emdash-managed.** Two content systems, one site.

## Architecture — hybrid (CMS content + auto listings), one Cloudflare/Astro app
```
                 ┌─────────────────── emdash CMS (client edits) ──────────────────┐
                 │  collections in D1: site_settings, homepage, page_content,      │
                 │  neighborhood_copy(optional), blog_posts(later)                 │
   Client ─edits─┤     ▲ admin UI /_emdash/admin  + inline on-page editing         │
                 └─────┼──────────────────────────────────────────────────────────┘
                       │
   emdash + Astro app on Cloudflare Workers  ──renders──▶  visitor
                       │
                 ┌─────┴────────────── Listings (auto, read-only) ────────────────┐
                 │  D1 tables: listings, listing_photos, sync_meta                 │
                 │     ▲ populated by the EXTERNAL sync (Vercel/GitHub Action)     │
                 │     └── Trestle MLS  (CF can't call Trestle → sync runs off-CF)  │
                 └────────────────────────────────────────────────────────────────┘
```
- **One Astro app on Cloudflare Workers, one D1 database.** emdash collections hold editable content;
  the listings tables (same D1) are fed by the external sync. Astro pages read both.
- **The Trestle → D1 sync stays exactly as built today** (Vercel `/api/sync`, daily; or GitHub Action for 15-min).
  Trestle still blocks Cloudflare, so the sync must stay off-CF. Nothing about listings changes.
- **Contact form** finally wired to Resend (like the onePHG sites).

## What's editable vs. auto
**Confirmed 2026-08-07: ALL text content is client-editable in emdash.** Only the live MLS data + map geometry
stay auto/read-only.
| Editable in emdash (client) — ALL of this            | Auto / read-only (never hand-edited)              |
|------------------------------------------------------|---------------------------------------------------|
| Homepage (hero, sections, stats, testimonials, FAQ)  | Listings: address/price/beds/baths/photos/etc.    |
| Buyers, Sellers, Community, Concierge, About pages   | Homes-for-sale-in-<neighborhood> (polygon-matched)|
| Neighborhood copy (overview / Grant's Take / at-a-glance / stats, all 15) | Community map polygons (Liz's GeoJSON)|
| Contact details (phone/email/address/hours)          | Neighborhood ↔ listing matching (point-in-polygon)|
| Blog posts (scope TBD)                               |                                                   |
| Site settings (nav labels, social, footer)           |                                                   |

## Content model (emdash collections)
- `site_settings` — phone, email, address, hours, social links, footer text, nav labels.
- `homepage` — hero eyebrow/headline/subhead + CTAs, stats, about/practice-lead copy, testimonials[], FAQ[],
  section headings. (Each visual block = a field; seed with the current hardcoded copy.)
- `page_content` (or one collection per page) — Buyers, Sellers, Community guide copy, Concierge, About:
  eyebrow, title, lead, body sections[].
- `neighborhood_copy` (**IN SCOPE** — all content is CMS) — per-area overview / "Grant's Take" / at-a-glance /
  stats for the 15 sub-pages. Seed with the current copy (incl. the [PLACEHOLDER] Grant items) so Grant can fill
  them in via the admin. Listings on these pages stay auto-matched.
- `blog_posts` (scope TBD — full `/blog` vs homepage-feature) — title, slug, excerpt, rich-text body, hero image
  (R2), author, date, status. Powers `/blog/` + `/blog/:slug/` + the homepage blog-preview (currently fake).

## Listings (unchanged from today's build)
- Tables `listings`, `listing_photos` in the same D1, fed by the external sync.
- Astro renders `/listings/` (search + Leaflet map + filters), `/homes/:city/:address/` (detail + gallery),
  and the community neighborhood pages (point-in-polygon match, `window.NB_GEO`).
- Photos hot-linked from Trestle signed URLs (verified working); R2 mirror only if they ever expire.

## Phased build (each a focused session)
1. **Scaffold** the emdash/Astro project on Cloudflare (D1 + R2 + `@astrojs/react`, admin UI, `live.config.ts`).
   Reuse Cameron acct `239e9d…`; can reuse the existing `gcm-homes-db` or a fresh one.
2. **Port content pages → Astro** with `createEditable()` inline fields (homepage first, then the 5 content pages).
   Seed collections with the current prototype copy.
3. **Port listings** into Astro (listings hub, detail, community map + neighborhood matching) reading the D1 tables.
4. **Blog** (once scoped): collection + index + post pages + homepage feature.
5. **Contact form → Resend**, final QA, seed content, cut over custom domain.

## What carries over from the prototype (design is done)
All finished HTML/CSS/behavior in `trestle-test/demo/` is the design reference — hero dusk overlay, listings
search/map, community Leaflet map (`/map/`), neighborhood point-in-polygon, all copy. The rebuild re-implements
these as Astro components; it is NOT a redesign.

## Open decisions
1. ~~Homepage editable?~~ **RESOLVED 2026-08-07 — YES. ALL content is emdash-managed.**
2. ~~Neighborhood copy in CMS?~~ **RESOLVED — YES (all content).**
3. **Blog scope** — full `/blog` vs homepage-feature-only (deferred: "decide later").
4. **Sync cadence** — keep Vercel daily, or move to GitHub Action (15-min) during the rebuild.
5. **Reuse `gcm-homes-db`** or start a clean D1 for the emdash app.
6. **[PLACEHOLDER] content still needs Grant** before publish (Grant's picks, school data, neighborhood
   price/trend, IVGID fee, real photography) — now Grant can fill these via the CMS admin.
