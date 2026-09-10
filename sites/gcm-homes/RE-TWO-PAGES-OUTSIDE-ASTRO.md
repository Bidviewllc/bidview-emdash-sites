# RE: Two Pages Outside Astro

**To:** Liz
**From:** Vince
**Date:** 10 September 2026
**Re:** your `two-pages-outside-astro.md` (9 Sept)
**Status:** ✅ **Option A + the sitemap are shipped and live.** Options B and C are **held** — for the reason you
identified yourself (see Q2).

---

## First: your findings checked out

I re-measured all of it on production before touching anything. Every metadata gap you listed was real:

| Check | What production delivered |
|---|---|
| Detail `<title>` | `Listing Detail — Grant C. Meyer Homes` — **identical on every listing** |
| Detail `description` / `og:title` / `og:image` / `canonical` / JSON-LD | **all absent** |
| `/sitemap.xml` | **1 URL** — just a pointer to `sitemap-posts.xml`. No listings, no hub, no pages |

The one nuance: the hub (`/listings/`) *did* already have a title and description — it was missing `og:image` and
`canonical` only. Everything else was exactly as you wrote it.

Thank you for the `og:` framing, by the way — "no title, no description and no photo on the exact pages the business
exists to circulate" is what made this easy to prioritise over the refactor.

---

## What shipped (Option A + sitemap)

Live on `gcm-homes-emdash.cameron-239.workers.dev`, worker version `0afaa89a`, merged as **PR #125**.

| | Before | After |
|---|---|---|
| Detail `<title>` | same on all listings | **per-listing** — e.g. `777 Rodeo Drive, Glenbrook, NV — $125,000,000 \| Grant C. Meyer Homes` |
| Detail `description` | absent | present (address, city, price, bed/bath/sqft, property type) |
| Detail **`og:image`** | absent | **the listing's own first photo** |
| Detail `og:title/description/url`, Twitter card | absent | present |
| Detail `canonical` | absent | present |
| Detail JSON-LD | absent | `RealEstateListing` + `Offer` (price, USD) |
| `/sitemap.xml` | 1 URL | **220 URLs** — 197 listings + 15 neighbourhoods + 8 pages |
| `/robots.txt` | — | added, points at the real sitemap |
| Hub `og:image` + `canonical` | absent | added |

**Exactly as you scoped it:** the head is built in the Astro route (it already had the slug, so it looks the listing
up server-side), then string-injected before the raw HTML is returned. **Your two files' markup, CSS and client JS are
untouched.** The only edit inside a prototype file is ten lines of `<meta>` in the hub's `<head>`.

One detail on your "head comes from two places" concern: rather than leave a duplicate, the route **replaces** the
static `<title>` rather than appending a second one. So there's exactly one title tag per page.

---

## How to verify

1. **View source** on two listings and confirm the titles differ (they were identical before):
   - `…/homes/glenbrook-nv/777-rodeo-drive/`
   - `…/homes/incline-village-nv/1011-lakeshore-blvd/`
2. **The real test** — paste a listing URL into `opengraph.xyz` (or just drop it in Slack) and confirm a photo and
   title render.
3. `…/sitemap.xml` → 220 `<loc>` entries.
4. `…/robots.txt` → `Sitemap:` line present.

---

## Your four questions

**1. Was the raw-serve always meant as a staging step, or is there something about the prototype JS we'd lose?**

A staging step — you read it correctly. It exists purely to dodge the `${…}` / `{…}` collision you spotted; there was
never an intent to keep it. **Nothing is lost by converting.** The interactive pieces you'd keep client-side
(lightbox, filmstrip, owner-note editor, print sheet) are the right list.

**2. Is anything in those files still changing week to week?**

**Yes — right now, and it's the reason B is on hold.** On 19 August I added 16 Trestle fields to the sync and exposed
them on the detail API specifically for your Features/Amenities cards and the 3D-tour section: `flooring`,
`fireplaces`, `fireplaceYN`, `fireplaceFeatures`, `roof`, `utilities`, `poolFeatures`, `lotFeatures`, `stories`,
`archStyle`, `construction`, `condition`, `hoaFrequency`, `mlsNumber`, `listingDate`, `tourUrlMls` — plus `lotSqft`,
derived from acres. Plus the owner-note editor and the WYSIWYG description link landed recently.

So `detail-page.html` is mid-flight. Converting it now would mean you and I editing the same file in two different
shapes. **Option A was the right thing to do alone, precisely because it doesn't touch it.**

**Ping me when your Features/tour build is stable and I'll do the B conversion then.**

**3. Any objection to Option A landing on its own?**

None — it was the right call, and it's done. Duplicate-title concern handled as above.

**4. Who owns the sitemap, and was three URLs intentional?**

Ours, and no — a straight bug. It was emdash's default index, which only knows about the `posts` collection. Replaced
with a real one (`src/pages/sitemap.xml.ts`) that emits the main pages, all 15 neighbourhoods, and every active
listing straight from D1. It regenerates on request, so new listings appear without anyone touching it.

---

## Three things to know before you do Option B

**1. The API payload is smaller than your note assumes.** Your step 2 says the API returns `listing`, `photos`,
`marketIntel`, `area`, `contact`, `grantIntro`. What `/api/listing-by-slug/…` actually returns today is:

```
{ listing, photos, canEdit }
```

`listing` has 53 fields (all the MLS data including the 16 new ones, plus `descriptionHtml`, `descriptionIsCustom`,
`ownerNote`), and `photos` is a plain array of URLs — 50 on the Rodeo Drive listing. But **`marketIntel`, `area`,
`contact` and `grantIntro` don't exist on that endpoint.** If the page needs them, that's extra work to scope, not
something already sitting there — worth re-checking your half-day estimate against that.

**2. The head now lives in the Astro route.** When you convert, move that logic into the component rather than writing
a second copy — otherwise we'll have two places emitting `og:` tags and they'll drift, which is the exact problem your
doc is about.

**3. One cutover chore on the hub.** Because `public/listings/index.html` is a static file, it can't resolve its own
origin, so its `canonical` / `og:url` / `og:image` are **hardcoded to the workers.dev host**. When we move to
`grantcmeyer.com`, those need a find/replace. The detail pages take the origin from the request, so they'll follow the
domain automatically with no change. (Converting the hub in Option C would remove the chore entirely.)

---

## On the home page's 6.6 s

You flagged it as "not your problem," but it is a real problem and I don't want it to look like it was waved past:
**I've reproduced it and I have not investigated it yet.** Your read is almost certainly right that it's the
server-side CMS reads. It's logged as its own item and it does deserve a proper look — it's the slowest thing on the
site by a factor of three, and it's the first page anyone lands on.

---

## Where that leaves us

- **Done:** listing metadata, sitemap, robots, hub `og:`.
- **Held, waiting on you:** Option B (detail page) — ping me when Features/3D-tour settles.
- **Held, lower priority:** Option C (hub) — agreed with your reasoning that listing URLs matter more than the one hub
  URL. It would also kill the cutover chore above, so it's worth doing eventually.
- **Mine to chase:** the home page TTFB.

---

*Verified by HTTP fetch against `gcm-homes-emdash.cameron-239.workers.dev` on 10 Sept (worker `0afaa89a`): per-listing
titles confirmed distinct across two listings, all tags present, page body unaffected, sitemap 220 `<loc>`. No
browser screenshot — the change is head-only and the body is still client-built and untouched.*
