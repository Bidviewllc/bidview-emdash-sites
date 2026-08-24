# Price Calculator Playbook

How to build a patient/customer-facing price calculator for any brand's emdash site, based on the New Leaf Hearing Care build (August 2026). The New Leaf version is the reference implementation — copy it, don't start from scratch.

**Reference implementation (New Leaf):**
- Page: `sites/new-leaf-hearing-care/src/pages/hearing-aid-price-calculator.astro`
- Data: `sites/new-leaf-hearing-care/src/data/pricing.ts`
- Lead API: `sites/new-leaf-hearing-care/src/pages/api/pricing-lead.ts`
- Shareable preview: https://new-leaf-price-calculator.vercel.app (static export, deploy folder at `TheCube/.vercel-deploy/new-leaf-price-calculator/`)

---

## What the calculator is (and isn't)

It shows **price ranges, not quotes**. The patient either takes a short quiz (guided estimate with a recommendation and reasons) or skips straight to a full comparison table. Everything a patient sees comes from a client-approved intake sheet. Nothing goes live without the client reviewing the numbers on the page.

The three screens:
1. **Landing** — headline + two paths: "Get My Estimate" (quiz) or "Just show me all the pricing" (skip link). This hybrid shape was a deliberate decision; keep it unless the client asks otherwise.
2. **Quiz** — 4 questions: listening lifestyle, one ear or two, priority (best tech / balance / budget), desired ongoing care.
3. **Results** — recommendation card with "why this fits your answers" bullets, comparison table (tiers as columns), membership/payment strip, "every price includes" panel, collapsible accessories / other services / insurance & financing, CTAs (booking + phones), optional email-me-my-estimate form, client's compliance disclaimer.

---

## Step 0 — Client intake: the Data Matrix sheet

Make a copy of the New Leaf sheet and blank the yellow cells:
https://docs.google.com/spreadsheets/d/1wlN2HHwYtQhsDs3V0RMzpd0QE2ZFK9h3WWaEV7bTjUE/

Its six sections map 1:1 onto the build:
1. **Technology tiers** — name, patient-facing one-liner, per-ear low/high, warranty, loss & damage, follow-up care, rechargeable, Bluetooth. (Example makes/models column is INTERNAL ONLY — never render it.)
2. **What's included** — the price-defense list, plus anything billed separately (New Leaf: hearing evaluation) and the trial policy.
3. **Price adjusters** — pair discount, style/battery differences, accessories. New Leaf had zero adjusters (pair = 2× per ear, no style upcharges), which made the math trivial. If a client HAS adjusters, the results screen needs option toggles that recompute the range.
4. **Other services** — flat-price services approved for public display.
5. **Insurance & payment** — financing lines and what the page is allowed to SAY about insurance. Never compute insurance math.
6. **Behavior** — exact range vs "starting at", per-ear vs per-pair default, lead capture before/after estimate, where leads go, CTA, required disclaimer wording.

Do not build until the sheet is filled in and the client has signed off on it. Skip any grey-italic example rows when transcribing.

---

## Step 1 — Data file (`src/data/[thing]-pricing.ts`)

Every number and every sentence of client-approved copy from the sheet goes into one TypeScript module: tiers, membership/payment plan, included list, not-included items, trial, accessories, services, financing line, insurance note, disclaimer, contact info (lead email, booking URL, office phones). The page imports it; nothing is hardcoded in markup. Price changes = edit one file.

## Step 2 — The page

Copy `hearing-aid-price-calculator.astro` into the new site's `src/pages/` and swap the brand layer:

- **CSS variables at the top of the style block** — colors come from the brand (New Leaf: purple/green). Check the site's existing pages for its palette.
- **Fonts** — the Google Fonts link + `font-family` rules (New Leaf: Cormorant Garamond headings, DM Sans body).
- **Logo + favicon paths** — from the site's `public/assets/`.
- **`<title>`, meta description** — the page ships with `noindex,nofollow`; remove that only when the client wants it indexed.

Layout decisions already made with Liz (keep for future builds unless told otherwise):
- Comparison **table** (tiers as columns), not cards — easier to compare levels. Recommended tier's column gets a highlight + "Recommended" tag. Table scrolls horizontally on mobile inside `.table-scroll`.
- Membership/alternate-payment block styled like the recommendation block: colored banner strip ("Prefer a monthly payment?") over a white card.
- Panel headings ("Every price above includes", accordions) in bold brand-accent sans, not serif.
- Per pair / per ear toggle; default from the sheet (Section 6), and a "one ear" quiz answer flips the default to per-ear.
- Lead form comes AFTER the estimate (trust over lead volume — New Leaf's choice; re-ask per client in Section 6).

## Step 3 — Quiz + recommendation logic

How it works: the **tier** is chosen from lifestyle + priority (care breaks the tie between the two budget tiers). The **care answer always shapes the explanation** even when it doesn't change the tier:

- `buildReasons()` produces 2–3 "why this fits your answers" bullets tied to what they actually picked.
- When an answer conflicts with what the tier includes, a **care-note callout** explains the mismatch (e.g. "you said just get me set up — this tier includes 3 years of unlimited visits either way, and here's why that matters").
- A budget-minded patient who wants unlimited care gets nudged to the membership.
- "Not sure about one ear or two" adds a bullet pointing to the hearing evaluation.

For a new brand: re-map the quiz answers to that client's tier ladder, then rewrite every bullet in `buildReasons()` in the client's voice. **This copy is patient-facing prose — run the banned-patterns audit (`TheCube/production/banned-patterns.md`) before shipping it.** Watch especially for repeated bullet openers.

## Step 4 — Lead handling

The API route (`src/pages/api/[x]-lead.ts`) validates and returns `{ok:true}`. Sending is per-client:

- **ActiveCampaign** — proven pattern on New Leaf's site: see `api/wellness-submit.ts` (contact sync + field values + tags). Remember the Workers gotcha: fire-and-forget promises must go through `locals.cfContext.waitUntil` or they're silently dropped.
- **Direct email** — requires Cloudflare Email Service (send_email binding + DNS records on the sending domain). Nothing on any site does this yet; budget a setup step and find out who controls the client's DNS.

Keep the front-end submit in this exact shape so the static exporter (Step 6) can stub it:

```js
const res = await fetch('/api/...', { ... });
if (!res.ok) throw new Error();
```

## Step 5 — Run and verify locally

```
cd sites/[site] && npx astro dev
```

Gotchas hit on the New Leaf build:
- `better-sqlite3` bindings error → `npm rebuild better-sqlite3` (Node version mismatch), then restart the dev server.
- A killed dev server can leave a zombie on port 4321 — the restart lands on 4322 and the zombie serves a broken error overlay. Kill whatever listens on 4321 first.
- Verify headlessly before showing Liz: Playwright is in the site's devDependencies and drives installed Chrome with `chromium.launch({ channel: 'chrome' })`. Click through: each quiz persona (confirm tier + care note differ), the skip path, the pair/ear toggle, and the lead form. Zero console/page errors is the bar.

## Step 6 — Shareable Vercel preview

The calculator page is standalone (no site layout), so it exports to a static one-pager the team/client can view before anything touches the real site:

```
node scripts/export-calculator-static.cjs <site-folder> <page-path> <out-folder> <live-domain> [dev-url]

# New Leaf example (page path WITHOUT a leading slash — Git Bash mangles it otherwise):
node scripts/export-calculator-static.cjs sites/new-leaf-hearing-care hearing-aid-price-calculator/ \
  ../TheCube/.vercel-deploy/new-leaf-price-calculator https://newleafhearing.com http://localhost:4322
```

The script pulls the rendered page from the dev server, inlines the CSS (dev serves it as a separate file), strips Vite/dev-toolbar scripts, rewrites internal links to the live domain so CTAs work, **stubs the lead-form send** (shows the thank-you but sends nothing — tell the client this), and copies referenced logo/favicon assets. Then:

```
cd <out-folder> && vercel --prod --yes
```

## Step 7 — Real deploy

Client signs off on the Vercel preview → wire real lead handling (Step 4) → deploy the site to staging (`npm run deploy:staging`), client re-checks → production (`npm run deploy:production`). See `DEPLOYMENT-RUNBOOK.md`.

---

## Checklist for a new brand

- [ ] Copy the Data Matrix sheet, client fills it, client signs off
- [ ] `src/data/[x]-pricing.ts` transcribed (skip example rows; internal-only columns stay out)
- [ ] Page copied, brand tokens swapped (colors, fonts, logo, title)
- [ ] Quiz mapping + `buildReasons()` copy rewritten for this client's tiers
- [ ] Banned-patterns audit on all patient-facing copy
- [ ] Price adjusters handled if the client has any (New Leaf didn't)
- [ ] Lead route created; sending method decided (AC vs email service)
- [ ] Headless click-through passes with zero errors
- [ ] Static export → Vercel preview → team + client review
- [ ] Real lead send wired and tested → staging → client sign-off → production
