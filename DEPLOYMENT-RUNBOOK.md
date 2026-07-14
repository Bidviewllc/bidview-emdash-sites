# Deployment Runbook — emdash Sites (GitHub → live Cloudflare)

**Repo:** https://github.com/Bidviewllc/bidview-emdash-sites (monorepo — one folder per site under `sites/`)
**Cloudflare account:** `239e9d015c7a3a39cdc2e9400312f553` — every worker below lives here.
**Stack:** Astro + emdash CMS on Cloudflare Workers, with D1 (content + leads), R2 (media), KV (sessions).

**This runbook applies to every site in the repo.** The rules in §0 are the same for all of them; only the deploy command in §3 differs per site.

---

## 0. Read this first — GitHub is the source of truth

> ### 🔒 The rule
> **`main` on GitHub is the single source of truth. What is live on Cloudflare must always be exactly what is on `main` — for every site, with no exceptions.**

Everything that ships goes through GitHub:

1. **Every change goes through a PR.** Branch → PR → review → merge to `main`.
2. **You only ever deploy from a clean, freshly-pulled `main`.** Never from a feature branch, never from a stale checkout, and **never from uncommitted local edits**.
3. **Never edit code on the server, and never deploy a local-only fix.** If it isn't merged to `main`, it doesn't go live. Even an urgent hotfix gets a PR — before you deploy it.

**Deploying is the final step of merging, not a separate activity.** There is no CI/CD in this repo (the only GitHub Action is `pr-slack-notify.yml`, a Slack notification), so Cloudflare does not update itself. **Whoever merges a PR pulls `main` and deploys the affected site(s) immediately.** Merge and deploy are one task — if you merge and walk away, GitHub and live no longer match, and that is a bug.

### Before every deploy — prove you are deploying `main` (30 seconds)

```bash
git checkout main
git pull
git status --short          # MUST print nothing
git log --oneline -1        # this exact commit is what goes live
```

**If `git status` prints anything, stop.** Those changes are not on GitHub. Either they're real work that must go through a PR first, or they're leftovers that will corrupt the deploy. Get the tree clean, then deploy.

---

## 1. One-time setup

```bash
# 1. Clone
git clone https://github.com/Bidviewllc/bidview-emdash-sites.git
cd bidview-emdash-sites

# 2. Install deps for the site you're working on (per-site, NOT at repo root)
cd sites/<site-folder>
npm install --ignore-scripts     # --ignore-scripts skips the better-sqlite3 native build

# 3. Authenticate to Cloudflare (choose the account above)
npx wrangler login
```

Or use a token instead of `wrangler login`:

```bash
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="239e9d015c7a3a39cdc2e9400312f553"
```

**Secrets are already set on the workers** (e.g. `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`). They are **not** in the repo, and they must never be committed. `wrangler deploy` **preserves** existing secrets, so a normal deploy will not wipe them. Only if a worker is renamed or recreated do they need re-adding — otherwise the contact form silently stops emailing.

To add/rotate one:

```bash
npx wrangler secret put RESEND_API_KEY --name <live-worker-name>
```

---

## 2. The standard update flow

```
Branch → PR → review → MERGE to main → pull main → build → DEPLOY → VERIFY live
                                          ↑                            ↑
                                  clean tree (§0)            in a real browser (§6)
```

```bash
# 1. Get the merged code (see §0 pre-deploy check)
git checkout main && git pull && git status --short

# 2. Go to the site that changed
cd sites/<site-folder>

# 3. ALWAYS clear stale build cache first (§5.4)
rm -rf node_modules/.vite node_modules/.vite-build .astro dist .wrangler/deploy

# 4. Deploy using THAT SITE'S command — see §3
npm run deploy:staging     # ← EXAMPLE ONLY. The command differs per site!

# 5. Verify live in a real browser — see §6
```

**Deploy one site at a time.** Each site is an independent worker; there is no "deploy all".

---

## 3. Per-site deploy commands ⚠️ (they are NOT the same)

Using the wrong command can deploy to the **wrong worker**, leaving the real site untouched while everything *looks* successful.

| Site folder (`sites/…`) | Live domain | **Live worker** | **Deploy command** |
|---|---|---|---|
| `americasbesthearing.com` | americasbesthearing.com | `americas-best-hearing-staging` | `npm run build && npx wrangler deploy` |
| `audiologistdirectory` | audiologistdirectory.com | `audiologist-directory` | `npm run deploy:production` |
| `audiologyandhearingcenters` | audiologyandhearingcenters.com | `audiologyandhearingcenters` | `npm run build && npx wrangler deploy` |
| `campbellhearingsolutions` | campbellhearingsolutions.com | `campbell-hearing-solutions-emdash` | `npm run deploy:cloudflare` |
| `floridamedicalhearingaids` | floridamedicalhearingaids.com | `floridamedicalhearingaids` | `npm run build && npx wrangler deploy` |
| `jc-audiology.com` | jc-audiology.com | `jc-audiology-staging` | `npm run deploy:staging` |
| `lakeside-lactation` | lakeside-lactation.com | `lakeside-lactation` | `npm run build && npx wrangler deploy` |
| `maicoaudio` | maicoaudio.com | `maicoaudio-staging` ⚠️ | `npm run deploy:staging` |
| `new-leaf-hearing-care` | newleafhearing.com | `new-leaf-hearing-care` | `npm run deploy:production` |
| `raleighhearingandtinnituscenter.com` | raleighhearingandtinnituscenter.com | `raleighhearingandtinnituscenter-staging` | `npm run deploy` |
| `robertshearingclinic-emdash` | robertshearingclinic.com | `robertshearingclinic-emdash-staging` ⚠️ | `npm run deploy:staging` |
| `rosehearinghealthcarecenters.com` | rosehearinghealthcarecenters.com | `rosehearinghealthcarecenters-staging` | `npm run deploy` |
| `wncaudiology.com` | wncaudiology.com | `wnc-audiology-staging` ⚠️ | `npm run deploy:staging` |
| `commonwealth-audiology` | *(not launched)* | `commonwealth-audiology` | `npm run deploy` |
| `thechicagomarketingagency` | *(not launched)* | `thechicagomarketingagency` | `npm run build && npx wrangler deploy` |
| `bidviewmarketing-staging` | *(staging / WIP)* | `bidviewmarketing-staging` | *(no deploy script yet)* |
| `harness` | *(not launched — preview: harness.local-981.workers.dev)* | `harness` ⚠️ lives on the **learning account** (`981338e6…`) by design until a domain is chosen; move `account_id` to `239e9d01…` at launch | `npm run deploy` |

### Three traps in that table

**Trap 1 — workers named `*-staging` ARE PRODUCTION.**
When those sites launched they were cut over to their custom domains as-is, keeping the `-staging` suffix. `maicoaudio-staging` **is** the live maicoaudio.com. Don't rename them, and never treat a `-staging` worker as a safe sandbox.

**Trap 2 ⚠️ — for `maicoaudio`, `robertshearingclinic-emdash` and `wncaudiology.com`, the `name` in `wrangler.jsonc` is NOT the live worker.**
Their deploy scripts patch the worker name (and the D1/R2 bindings) at deploy time.

> 🚫 A bare `npx wrangler deploy` in those three folders deploys to a **different, non-live worker** (e.g. `maicoaudio` instead of `maicoaudio-staging`). The real site appears unchanged and you'll waste an hour hunting a ghost.
> ✅ Always use `npm run deploy:staging` there.

**Trap 3 — some sites' `deploy` script does NOT build.**
Where the script is just `wrangler deploy` (Audiology, Lakeside, Florida Medical, Chicago), you must build first, or you ship the previous build:
`npm run build && npx wrangler deploy`

### Always confirm the worker name in the output

```
Uploaded maicoaudio-staging (16.09 sec)     ← must match the LIVE worker in the table
Current Version ID: 6e398d7b-…              ← save this; you need it to roll back
```

---

## 4. ⚠️ Content can live in D1 — and D1 overrides the repo

This is the most confusing thing about these sites and it has cost real time.

On the emdash sites, most page bodies are served from the **D1 database**, not from the files in the repo. The lookup is roughly:

```
getPageByRoute(route) → if a D1 row exists, use D1's body_html
                      → otherwise fall back to the repo file (src/data/pages.json)
```

**So editing the repo file and deploying can change nothing on the live page** — D1 still wins.

*Real example:* removing `novalidate` from Campbell's insurance form in `src/data/pages.json` had zero effect, because the live page renders `body_html` from D1's `ec_pages` row. The fix had to be applied to **D1 as well**.

**How to tell:** you deployed, and the page is unchanged. First suspect the edge cache (§5.1); if that's not it, the content is coming from D1.

**Keep both in sync.** Update the repo file *and* D1 — otherwise the next person reads the source file and is misled.

**Find your site's D1 ID:**

```bash
grep -A2 d1_databases sites/<site-folder>/wrangler.jsonc     # database_id
```

**Update D1:**

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/239e9d015c7a3a39cdc2e9400312f553/d1/database/<DB_ID>/query" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"sql":"UPDATE ec_pages SET body_html = REPLACE(body_html, \"old\", \"new\") WHERE slug=\"insurance\""}'
```

Contact-form leads are also stored in D1, in the `contact_submissions` table of the same database.

---

## 5. Gotchas that will bite you

### 5.1 Bump the edge cache version, or your change won't appear
Most workers cache rendered HTML at the Cloudflare edge, keyed by a version string in `src/worker.ts`:

```ts
const CACHE_VERSION = "v27";   // ← bump whenever page HTML changes
```

Change HTML without bumping it and the edge serves the old page for up to an hour. **Bump, then deploy.**

### 5.2 Some sites' inner pages bypass the worker entirely
On sites converted from WordPress, pages may be **prerendered static HTML in `public/`**, served straight from Cloudflare's edge — **the worker never runs for them.**

Confirmed on `audiologyandhearingcenters`: the **homepage is server-rendered** (goes through the worker) but the **inner pages are static assets**. Any worker-level HTML injection (chat widget, Turnstile, etc.) **will not reach them** — those files must be edited directly in `public/**/index.html`.

Tell-tale sign: view-source shows `<!-- Cache served by breeze CACHE -->` and the worker's injected markup is missing.

### 5.3 Astro CSRF blocks cross-origin POSTs
A POST to `/api/contact` **without a matching `Origin` header returns 403**. That is correct behaviour, not a bug — real browser submissions work. If testing with `curl`, pass `-H "Origin: https://<the-domain>"`.

### 5.4 Stale Vite cache ships a stale bundle
Always run this before building:

```bash
rm -rf node_modules/.vite node_modules/.vite-build .astro dist .wrangler/deploy
```

### 5.5 Windows / IPv6 — random `fetch failed`
If `wrangler`, `curl` or `node` throw `fetch failed` for no reason, it's IPv6. Force IPv4:

```bash
export NODE_OPTIONS='--dns-result-order=ipv4first'
curl -4 …
```

### 5.6 Transient `10013` on asset upload
`A request to the Cloudflare API … [code: 10013]` during asset upload is transient. The build is fine — just re-run the deploy.

### 5.7 `gh` logged in as the wrong account
If a push 404s, you're on a read-only account. Switch to the one with write access:

```bash
gh auth switch --user <account-with-write-access>
```

### 5.8 Never commit secrets
API keys, tokens and secret keys go in as **Cloudflare Worker secrets** (`npx wrangler secret put NAME --name <worker>`), never in `wrangler.jsonc` or source.
*(The Turnstile **site** key in the HTML is public by design — that one is fine. The Turnstile **secret** key must never be committed.)*

---

## 6. Verifying a deploy — do not skip this

### ⚠️ A successful POST does NOT mean the form works

This is the lesson that cost the most. On Roberts, a direct POST to `/api/contact` returned **200 and saved the lead** — but the form was **completely dead in a real browser**, because `site.js` had a submit handler that called `preventDefault()` and then did nothing. Direct POSTs bypass that JavaScript entirely, so every automated test passed while real users submitted into a void.

> **Always click-submit the form in a real browser.** A curl/POST test alone is not verification.

### Post-deploy checklist

1. **Page loads** — homepage + the page you changed return `200`.
2. **Worker name** in the deploy output matches the live worker in §3.
3. **Your change is visible** — if not: edge cache (§5.1), then D1 (§4).
4. **Forms work in a real browser:**
   - Turnstile "Verify you are human" widget renders (allow ~10–16s; asserting at 8s gives a false negative).
   - Submit with required fields **empty** → blocked.
   - Submit **filled** → lands on the thank-you page.
   - Lead appears in D1 `contact_submissions`.
   - Lead email arrives.
5. **Test data must be pure ASCII.** The spam filter rejects any non-ASCII character — an em-dash (`—`) in your test message causes the lead to be **silently accepted and never saved**. Use plain hyphens.
6. **Delete your test rows** from `contact_submissions` afterwards.
7. **GitHub == live.** The commit you deployed is on `main`, and nothing is left uncommitted.

---

## 7. Rollback

Every deploy prints a `Current Version ID`.

```bash
cd sites/<site-folder>
npx wrangler deployments list          # 10 most recent deployments
npx wrangler rollback <version-id>     # instant revert
```

For the three sites whose deploy script patches the worker name (§3, Trap 2), pass the worker explicitly:

```bash
npx wrangler rollback <version-id> --name maicoaudio-staging
```

⚠️ Rollback reverts the **worker code only** — it does **not** revert D1 content changes (§4). If you changed D1, undo that separately.

**Then fix `main`.** A rollback puts live *behind* `main`, which breaks the §0 rule. Immediately revert the offending commit on GitHub (`git revert`, via a PR) so `main` matches live again.

---

## 8. Domains & DNS

Live domains are bound to workers as **Worker Custom Domains** (not DNS records pointing at an origin).

- To attach a new domain, the zone's existing apex/`www` A/CNAME record must be **deleted first** — the Workers API refuses to bind a hostname that already has externally-managed DNS records (error `100117`).
- Do **not** touch MX / SPF / DKIM / DMARC records — those are email, unrelated to the worker.
- SSL provisions automatically within seconds of binding.

---

## 9. Contact form architecture (the sites that have one)

Shared handler at `src/pages/api/contact.ts`:

```
POST /api/contact
  → honeypot check (hidden field must stay empty)
  → Turnstile verify (FAIL-OPEN: no token → fall through to the spam filter,
                      so a real lead is never dropped)
  → looksLikeSpam()  → spam rejected BEFORE any email is sent
  → save to D1 (contact_submissions)   ← lead is safe even if email fails
  → send via Resend
  → 303 redirect to /thank-you…   (or {"ok":true} JSON for the AJAX sites)
```

- **Email:** Resend. Sender is `noreply@bidview.net` with the **practice name** as the display name. (Cloudflare Email Workers was removed — spam exhausted its daily quota, which killed *all* lead emails, including real ones.)
- **AJAX vs native:** ABH, JC and Audiology submit via JavaScript and expect `{"ok":true}` JSON. The rest use a native form POST and expect a `303` redirect. The handler decides from the `Accept` header.
- **Multi-location sites** (Maico, ABH, Audiology): the clinic dropdown submits a **numeric option ID**, not the city name. `CLINIC_MAP` in `contact.ts` translates ID → location name.
  ⚠️ **If you add a clinic to one of those forms, add its ID to `CLINIC_MAP`,** or the lead email will show a bare number instead of the location.

---

## 10. Golden rules

1. **GitHub `main` is the source of truth. Live must always equal `main`.**
2. **Every change goes through a PR.** No local-only fixes, ever.
3. **Merge and deploy are one task.** Merging alone does not make it live.
4. **Deploy only from a clean, freshly-pulled `main`** (`git status` must be empty).
5. **Use the right deploy command per site** (§3). A bare `wrangler deploy` is wrong for several of them.
6. **`*-staging` workers are production.**
7. **Page didn't change? → edge cache (§5.1), then D1 (§4).**
8. **Test forms by clicking them in a real browser**, never by POST alone.
9. **Never commit secrets.**
