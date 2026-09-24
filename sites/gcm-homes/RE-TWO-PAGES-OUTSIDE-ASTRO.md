# RE: Two Pages Outside Astro

**To:** Liz
**From:** Vince
**Date:** 10 September 2026
**Re:** your `two-pages-outside-astro.md` (9 Sept)
**Status:** ✅ **Option A + the sitemap are shipped and live** — and since then, **the home-page slowness you flagged
is fixed too** (it wasn't what either of us thought: see "On the home page's 6.6 s"). Options B and C are **held**, for
the reason you identified yourself (see Q2). **One thing needs a decision from you:** the MLS sync cadence.

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

Site: **https://gcm-homes-emdash.cameron-239.workers.dev**

1. **View source** on these two listings and confirm the titles differ (they were identical before):
   - https://gcm-homes-emdash.cameron-239.workers.dev/homes/glenbrook-nv/777-rodeo-drive/
   - https://gcm-homes-emdash.cameron-239.workers.dev/homes/incline-village-nv/1011-lakeshore-blvd/
2. **The real test** — paste either of those into https://www.opengraph.xyz/ (or drop it in a chat) and confirm a photo
   and title render.
3. https://gcm-homes-emdash.cameron-239.workers.dev/sitemap.xml → 220 `<loc>` entries.
4. https://gcm-homes-emdash.cameron-239.workers.dev/robots.txt → `Sitemap:` line present.
5. https://gcm-homes-emdash.cameron-239.workers.dev/listings/ → view source, `og:image` + `canonical` present.

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

## On the home page's 6.6 s — chased, and fixed

I dug into this properly. Two things to report, one of which contradicts your measurement, so here's exactly what I
found.

**I could not reproduce 6,644 ms.** Measuring from my PoP (Singapore — `cf-ray` confirmed), the home page was
**~386 ms warm**, and the one slow run I saw was **2,261 ms on a cold isolate** (my first request of the session warmed
it; every page after was fast). Interleaved, three runs each:

| Page | TTFB (warm) |
|---|---:|
| `/` | 398 / 374 / 497 ms |
| `/community/` | 334 / 261 / 241 ms |

So I'm not going to claim your number was wrong — you're on a different PoP and D1's latency varies with distance —
but I couldn't see it, and I'd rather say that than quietly "fix" a number I never observed.

**What I did find is a real defect, and it's the thing behind whatever you measured.** The response headers showed
`cache-control` **absent** and `cf-cache-status` **absent** — meaning **nothing was cached at all.** Every single
visitor triggered a full SSR render plus a D1 round-trip. The `server-timing` header broke it down:

```
render;dur=300    mw;dur=300    db.total;dur=201    db.count;dur=2
```

So ~200 ms of every request was database, on every hit, forever, for everyone — and a cold isolate stacked seconds on
top. Your instinct ("server-side CMS reads") was right; the aggravating factor was that nothing shielded them.

**Fix: an edge cache in front of the worker.**

| | Before | After |
|---|---|---|
| Home page | ~386 ms warm / 2,261 ms cold, **every** request | **1,973 ms first → 86 ms** thereafter |
| D1 queries per request | 2, always | **0 on a cache hit** |

Safety, since caching a CMS-backed site can go wrong in boring ways:

- A logged-in admin (emdash session/edit cookie) **bypasses the cache entirely** and gets `private, no-store` — so
  inline editing still works and an editable view can never be served to an anonymous visitor.
- `/api/*` and `/_emdash/*` are never cached. Only `GET`, only `200`, only html/xml/plain.
- The cache key drops the query string, so `?utm=…` traffic shares one entry instead of fragmenting it. Verified safe:
  no page reads `searchParams` server-side.
- Listing pages are keyed per path, so the per-listing `<head>` from Option A can't cross-contaminate — I checked two
  listings explicitly and each kept its own title.

**One caveat worth knowing:** anonymous visitors can now see stale HTML for **up to 5 minutes** after a CMS edit. You
and Grant always see fresh when logged in. If that's too long for content work, say so and I'll shorten it.

---

## Three other things shipped since, two of which touch you

**1. The community page copy is now fully editable (80 fields).** Its nine sections were hardcoded constants. They're
now a `community` collection, seeded *verbatim* from those constants — so nothing changed visually (I verified: same
copy, 6 cards, 2 Grant's picks, 3 eras, 4 accordion items). Relevant to you because **three of the placeholders we've
been waiting on Grant for are now fillable in the admin** rather than needing a code change: the school lines, which
items are "Grant's picks", and the IVGID fee wording.

**2. The MLS sync moved to GitHub Actions — and the cadence is yours to set.** It used to be one Vercel cron a day
(Hobby caps it there). Cloudflare Cron can never work for this (its egress is WAF-blocked). GitHub's runners are
**not** blocked — I verified that with a real run before building on it.

Workflow file:
https://github.com/Bidviewllc/bidview-emdash-sites/blob/main/.github/workflows/gcm-homes-trestle-sync.yml
Run history / "Run workflow" button:
https://github.com/Bidviewllc/bidview-emdash-sites/actions/workflows/gcm-homes-trestle-sync.yml

**Change the `cron:` line and that's the whole job.** The trade-off is documented in the file: every Trestle query is
billed and each run is a full pull, so more frequent = fresher listings but more cost. Reference points are in the
comment (2 h / 6 h / 30 min / daily). Currently **every 2 hours**. The run summary prints the listing/photo counts so
you don't have to open logs. The Vercel cron is off so we're not double-paying.

**3. That workflow immediately caught a bug worth flagging.** The first run reported success, but the log showed:

```
emdash mirror (non-fatal): UNIQUE constraint failed: ec_listings.slug, ec_listings.locale
```

`ec_listings` held **213 rows against 196 live listings** — i.e. **17 sold/withdrawn properties were still showing in
the admin.** Cause: a **re-listed property gets a new ListingKey but the same address, hence the same slug**, and the
mirror deleted departed rows *after* upserting — so the stale row still owned the slug, the insert failed, the whole
mirror aborted, and the delete never ran. Re-listings are routine, so this would have kept recurring. Fixed by
deleting departed rows before the upsert; now 196 = 196 with owner overrides intact.

The lesson, if you ever read these logs: **the mirror is wrapped non-fatal, so a broken mirror does not fail the
sync.** A green checkmark isn't proof — grep for `emdash mirror:` (worked) versus `emdash mirror (non-fatal):`
(silently didn't).

---

## Where that leaves us

- **Done:** listing metadata, sitemap, robots, hub `og:`, **edge cache**, **community copy editable**, **sync on
  Actions**, mirror bug fixed.
- **Yours to set:** the sync cadence (one line in the workflow).
- **Held, waiting on you:** Option B (detail page) — ping me when Features/3D-tour settles.
- **Held, lower priority:** Option C (hub) — agreed that listing URLs matter more than the one hub URL. It would also
  kill the cutover chore above, so it's worth doing eventually.

---

*Verified against `gcm-homes-emdash.cameron-239.workers.dev` on 10 Sept. Metadata (worker `0afaa89a`): per-listing
titles confirmed distinct across two listings, all tags present, page body unaffected, sitemap 220 `<loc>` — Vince also
confirmed the link previews independently on opengraph.xyz. Timings: 3+ runs per page, cache-busted, `server-timing`
read from the response headers. Cache (`v2`): MISS→HIT confirmed, admin-cookie bypass confirmed, per-listing keys
confirmed. Community: verified the rendered copy is unchanged and CMS-driven via a live D1 edit + revert. Sync:
workflow run end-to-end on GitHub's runners (196 listings / 6,670 photos), mirror line checked in the log.*
