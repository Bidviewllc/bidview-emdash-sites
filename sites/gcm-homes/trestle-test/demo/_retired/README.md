# Retired 2026-07-17

These rendered **hardcoded, invented listings** presented as real inventory:

- `listings.jsx` — `ALL_LISTINGS`: "1056 Lakeshore Boulevard — $10,850,000", "701 Cristina Drive — $4,675,000", etc. None of these properties exist. Reachable from the footer's "Search Listings".
- `listing.jsx` — `LISTING_DATA` for the same fake ids, with `LISTING_DATA[id] || LISTING_DATA["1056"]`, so ANY unknown id silently rendered the fake $10.85M Lakeshore home.
- `listing-sections.jsx` — the section components used only by `listing.jsx`.

Replaced by the live Trestle feed:
- `/listings/`            -> `listings.html` (search + filters + map)
- `/homes/:city/:address` -> `listing.html`  (detail)

Kept for reference only — the section components in `listing-sections.jsx`
(Matterport, gallery lightbox, local-perspective, market intel) are good design
work and may be worth porting onto the real detail page.
