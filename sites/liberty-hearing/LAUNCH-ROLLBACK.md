# Liberty Hearing Center — launch record & rollback

**Purpose:** restore the domain to its pre-launch state if the cutover to
`liberty-hearing.cameron-239.workers.dev` goes wrong.

Captured **2026-09-08** (before any change). **Nothing has been cut over yet.**

Ontario launched without a DNS snapshot and rollback depended on Cameron
remembering the old record — this file exists so that cannot happen again.

---

## 1. The domain BEFORE launch

| | |
| --- | --- |
| Domain | `libertyhearingcentertx.com` |
| Zone ID | `29b0ef015289c069adf2a13e05fb7184` |
| Cloudflare account | `239e9d015c7a3a39cdc2e9400312f553` (Cameron@bidviewmarketing.com) |
| Nameservers | `brit.ns.cloudflare.com`, `harvey.ns.cloudflare.com` |
| Zone status | active |
| **What was serving it** | **Squarespace** — a "Coming Soon" placeholder (3,147 bytes, title `Coming Soon`), on both apex and `www` |
| Worker custom domains bound | **none** |

### Full zone — 8 records, read from the Cloudflare dashboard

Verbatim, as it existed before launch. **This is the restore source.**

| Name | Type | Value | Proxy | TTL | Pri |
| --- | --- | --- | --- | --- | --- |
| `libertyhearingcentertx.com` | A | `198.49.23.145` | Proxied | Auto | — |
| `libertyhearingcentertx.com` | A | `198.185.159.144` | Proxied | Auto | — |
| `libertyhearingcentertx.com` | A | `198.49.23.144` | Proxied | Auto | — |
| `libertyhearingcentertx.com` | A | `198.185.159.145` | Proxied | Auto | — |
| `_domainconnect.libertyhearingcentertx.com` | CNAME | `_domainconnect.domains.squarespace.com` | Proxied | Auto | — |
| `www.libertyhearingcentertx.com` | CNAME | `ext-sq.squarespace.com` | Proxied | Auto | — |
| `libertyhearingcentertx.com` | MX | `alt4.aspmx.l.google.com` | DNS only | Auto | 10 |
| `libertyhearingcentertx.com` | TXT | `"google-site-verification=t07qIetTffu0ylxYpXrS81i8brLUSQmamLzKL2sSsoE"` | DNS only | Auto | — |

The four apex A records are **Squarespace's standard set**
(`198.185.159.144/145`, `198.49.23.144/145`).

### Independent corroboration (public DNS, same day)

Resolver answers differ from the table above because proxied records return
Cloudflare IPs — that is expected, not a discrepancy.

```
apex   A     172.67.184.228, 104.21.56.118          (Cloudflare edge - proxied)
apex   AAAA  2606:4700:3037::6815:3876, 2606:4700:3030::ac43:b8e4
apex   MX    10 alt4.aspmx.l.google.com.
apex   TXT   google-site-verification=t07qIetTffu0ylxYpXrS81i8brLUSQmamLzKL2sSsoE
apex   NS    brit.ns.cloudflare.com., harvey.ns.cloudflare.com.
www    A     104.21.56.118, 172.67.184.228          (proxied CNAME, flattened)
HTTP   apex + www -> 200, title "Coming Soon", 3147 bytes, server cloudflare
```

Machine-readable copy: `scratchpad/dns-snapshot.json`.

**Gotcha:** public DNS reports `www` as an **A** record because Cloudflare
flattens a proxied CNAME. It is a **CNAME** in the dashboard. Do not use a
`dig`/DoH result to conclude the CNAME does not exist.

---

## 2. The planned change

**Delete (5):** the four apex `A` records + the `www` CNAME.
**Keep (2):** the `MX` and the `TXT`. **Deleting the MX kills their email.**
**Optional:** `_domainconnect` CNAME is a Squarespace leftover — affects neither
web nor mail. Not part of the cutover.

Then bind the worker (Cameron's token can do this; it **cannot** edit DNS):

```
PUT https://api.cloudflare.com/client/v4/accounts/239e9d015c7a3a39cdc2e9400312f553/workers/domains
Authorization: Bearer <~/.claude/credentials/cloudflare-cameron-token.txt>
{"zone_id":"29b0ef015289c069adf2a13e05fb7184",
 "hostname":"libertyhearingcentertx.com",
 "service":"liberty-hearing","environment":"production"}
```
then repeat with `"hostname":"www.libertyhearingcentertx.com"`.

---

## 3. ROLLBACK — how to put it back

### 3a. Revert the domain to Squarespace

1. Cloudflare dashboard -> `libertyhearingcentertx.com` -> **Workers Routes /
   Domains**: remove the custom domains for `liberty-hearing` (apex and `www`).
   (Or `DELETE /accounts/{acct}/workers/domains/{id}`.)
2. Recreate the 5 deleted records **exactly** as in the table above:
   - 4 x `A` on the apex -> `198.49.23.145`, `198.185.159.144`,
     `198.49.23.144`, `198.185.159.145` — **Proxied**, TTL Auto
   - 1 x `CNAME` `www` -> `ext-sq.squarespace.com` — **Proxied**, TTL Auto
3. Confirm `MX` and `TXT` are still present and untouched.
4. Verify: apex and `www` return 200 with title `Coming Soon` (~3,147 bytes).

DNS is authoritative at Cloudflare, so this takes effect in seconds — there is
no registrar propagation wait.

### 3b. Roll the site back (independent of DNS)

Deployed worker versions, newest first (rollback points):

| Version | Deployed (UTC) | What it was |
| --- | --- | --- |
| `5cce9935-9e53-4e73-af33-ba3f0d4cc775` | 2026-09-08 16:31 | **current** — dead-link fixes |
| `c4ff3e1a-e8fc-44df-8e91-e26b1cec1347` | 2026-09-08 16:27 | blog posts + sitewide Cherry |
| `370cc8d4-d42f-40a5-bc19-039449443dce` | 2026-09-08 16:17 | full redeploy |
| `bd6051d0-804c-4a2c-bf7d-c8dc1c8b5fb4` | 2026-09-08 16:04 | favicon + Cherry on /pricing/ |
| `3a2e5b68-de9a-4e64-a17c-2de752343a25` | 2026-09-08 15:55 | ToC slug-collision fix |
| `f1f23e55-4a14-4ca2-80d9-c07ddfd88d54` | 2026-09-08 15:46 | 24 content pages |

`npx wrangler rollback --message "..."`, or redeploy from this repo folder.

### 3c. Data

D1 `liberty-hearing-db` (`c6fbfd7c-5c0f-42fc-9ff2-00dccd78892a`) at capture time:
**40 tables, 0 rows in `contact_submissions`** — no real leads yet, so nothing to
lose today. **Once the form goes live this stops being true** — take a D1 export
before any destructive change (`C:/bv/d1_export.js`).

---

## 4. Before flipping the switch

- [ ] **`LEAD_TO` is unset** — the contact form saves to D1 but emails nobody,
      while `/contact/` promises a same-day reply. Needs the clinic's address.
- [ ] **Turnstile** not enabled — no keypair; Cameron's token cannot create one.
- [ ] Their **email has only one MX** (`alt4`, pri 10). Google Workspace normally
      publishes `aspmx.l` (pri 1) + alt1-alt4, or `smtp.google.com` (pri 1).
      **Do not change this during the cutover** — raise it with Erika separately.
- [ ] 6 JPEGs at 313-383 KB; no JSON-LD schema; no analytics.
