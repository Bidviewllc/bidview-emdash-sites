"""
Local dev proxy for the Trestle MLS API — mirrors cf-worker/worker.js.

Run:  python server.py      then open http://localhost:8766/

PRODUCTION feed (IDX Plus) — billed per Trestle contract. Listings are fetched
once and held in memory for LISTINGS_TTL so local development doesn't hammer
(and bill) the feed on every reload, matching the Worker's edge cache.
"""

import json
import re
import os
import socket
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from http.server import HTTPServer, SimpleHTTPRequestHandler

# This Windows box hangs on IPv6 resolution — force IPv4. (See CLAUDE.md.)
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_only

# Credentials come from the environment only (never commit secrets).
# Local run: set TRESTLE_CLIENT_ID / TRESTLE_CLIENT_SECRET (see ~/.claude/credentials/trestle-api.md).
CLIENT_ID     = os.environ.get("TRESTLE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("TRESTLE_CLIENT_SECRET")
TOKEN_URL     = "https://api.cotality.com/trestle/oidc/connect/token"
ODATA_BASE    = "https://api.cotality.com/trestle/odata"

PORT = 8766
LISTINGS_TTL = 900  # seconds

LIST_SELECT = ",".join([
    "ListingKey", "UnparsedAddress", "StreetNumber", "StreetName", "StreetSuffix",
    "City", "StateOrProvince", "PostalCode", "ListPrice", "BedroomsTotal",
    "BathroomsTotalInteger", "LivingArea", "LotSizeAcres", "YearBuilt",
    "PropertyType", "PropertySubType", "StandardStatus", "Latitude", "Longitude",
    "View", "WaterfrontYN", "DaysOnMarket", "PhotosCount", "ListAgentFullName",
    "ListOfficeName", "ModificationTimestamp",
])

DETAIL_SELECT = ",".join([
    "ListingKey", "UnparsedAddress", "StreetNumber", "StreetName", "StreetSuffix",
    "City", "StateOrProvince", "PostalCode", "ListPrice", "BedroomsTotal",
    "BathroomsTotalInteger", "BathroomsFull", "BathroomsHalf", "LivingArea",
    "LotSizeAcres", "YearBuilt", "GarageSpaces", "View", "PublicRemarks",
    "StandardStatus", "PropertyType", "PropertySubType", "TaxAnnualAmount",
    "DaysOnMarket", "ListAgentFullName", "ListOfficeName", "Latitude", "Longitude",
    "AssociationFee", "Heating", "Cooling", "ParkingFeatures", "Appliances",
    "ModificationTimestamp",
])

_cache = {"listings": None, "at": 0}
_token = {"value": None, "at": 0}


def slugify(s):
    s = (s or "").lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    return s.strip("-")


def address_of(l):
    unparsed = (l.get("UnparsedAddress") or "").strip()
    if unparsed:
        return unparsed
    parts = [l.get("StreetNumber") or "", l.get("StreetName") or "", l.get("StreetSuffix") or ""]
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def category_of(l):
    """A single, non-overlapping category for filtering — mirrors worker.js.

    PropertySubType alone can't be trusted: Land parcels in this feed carry
    subType "SingleFamilyResidence" and leases carry "MultiFamily"/"Commercial",
    so filtering on subType files vacant land under Single Family and buries
    rentals in sale categories. PropertyType decides first.
    """
    by_type = {
        "ResidentialLease": "For Lease",
        "Land": "Land",
        "CommercialSale": "Commercial",
        "ResidentialIncome": "Multi-Family",
    }
    if l.get("PropertyType") in by_type:
        return by_type[l["PropertyType"]]
    by_sub = {
        "SingleFamilyResidence": "Single Family",
        "Condominium": "Condominium",
        "MultiFamily": "Multi-Family",
        "Commercial": "Commercial",
    }
    return by_sub.get(l.get("PropertySubType"), "Other")


def get_token():
    # Trestle tokens last 8h; reuse for 7 to avoid a token call per request.
    if _token["value"] and time.time() - _token["at"] < 7 * 3600:
        return _token["value"]
    body = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope": "api",
    }).encode()
    req = urllib.request.Request(TOKEN_URL, data=body,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        tok = json.loads(r.read())["access_token"]
    _token.update(value=tok, at=time.time())
    return tok


def odata(token, path):
    if path.startswith("http"):
        url = path
    elif "?" in path:
        resource, qs = path.split("?", 1)
        encoded_qs = urllib.parse.quote(qs, safe="=&$,.'()")
        url = f"{ODATA_BASE}/{resource}?{encoded_qs}"
    else:
        url = f"{ODATA_BASE}/{path}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def fetch_primary_photos(token, keys):
    """Trestle accepts `in (...)` of at least 60 keys; 50 keeps headroom."""
    batches = [keys[i:i + 50] for i in range(0, len(keys), 50)]

    def one(batch):
        in_list = "','".join(batch)
        try:
            return odata(token,
                f"Media?$filter=ResourceRecordKey in ('{in_list}') and Order eq 1"
                f"&$select=ResourceRecordKey,MediaURL&$top=200")
        except Exception:
            return {"value": []}  # a photo failure shouldn't 500 the page

    out = {}
    with ThreadPoolExecutor(max_workers=5) as ex:
        for res in ex.map(one, batches):
            for m in res.get("value", []):
                if m.get("MediaURL"):
                    out[m["ResourceRecordKey"]] = m["MediaURL"]
    return out


def fetch_all_active(token):
    rows = []
    nxt = f"Property?$filter=StandardStatus eq 'Active'&$select={LIST_SELECT}&$top=200"
    guard = 0
    while nxt and guard < 20:
        guard += 1
        page = odata(token, nxt)
        rows.extend(page.get("value", []))
        nxt = page.get("@odata.nextLink")

    photos = fetch_primary_photos(token, [r["ListingKey"] for r in rows])

    listings, seen = [], set()
    for l in rows:
        address = address_of(l)
        city_slug = slugify(l.get("City")) or "lake-tahoe"
        state_slug = slugify(l.get("StateOrProvince")) or "nv"
        slug = f"{city_slug}-{state_slug}/{slugify(address) or l['ListingKey']}"
        if slug in seen:
            slug = f"{slug}-{l['ListingKey']}"
        seen.add(slug)

        listings.append({
            "id": l["ListingKey"],
            "address": address,
            "city": l.get("City"),
            "state": l.get("StateOrProvince"),
            "zip": l.get("PostalCode"),
            "price": l.get("ListPrice"),
            "beds": l.get("BedroomsTotal"),
            "baths": l.get("BathroomsTotalInteger"),
            "sqft": l.get("LivingArea"),
            "lotAcres": l.get("LotSizeAcres"),
            "yearBuilt": l.get("YearBuilt"),
            "type": l.get("PropertyType"),
            "subType": l.get("PropertySubType"),
            "category": category_of(l),
            "status": l.get("StandardStatus"),
            "lat": l.get("Latitude"),
            "lng": l.get("Longitude"),
            "view": l.get("View"),
            "waterfront": l.get("WaterfrontYN") is True,
            "dom": l.get("DaysOnMarket"),
            "photosCount": l.get("PhotosCount") or 0,
            "agent": l.get("ListAgentFullName"),
            "office": l.get("ListOfficeName"),
            "updated": l.get("ModificationTimestamp"),
            "photo": photos.get(l["ListingKey"]),
            "slug": slug,
        })
    return listings


def get_listings():
    if _cache["listings"] and time.time() - _cache["at"] < LISTINGS_TTL:
        return _cache["listings"], True
    listings = fetch_all_active(get_token())
    _cache.update(listings=listings, at=time.time())
    return listings, False


def fetch_detail(token, key):
    safe_key = str(key).replace("'", "''")
    data = odata(token, f"Property?$filter=ListingKey eq '{safe_key}'&$select={DETAIL_SELECT}")
    l = (data.get("value") or [None])[0]
    if not l:
        return None, None
    try:
        media = odata(token,
            f"Media?$filter=ResourceRecordKey eq '{safe_key}'"
            f"&$select=MediaKey,MediaURL,Order&$orderby=Order&$top=50")
    except Exception:
        media = {"value": []}

    listing = {
        "id": l["ListingKey"],
        "address": address_of(l),
        "city": l.get("City"), "state": l.get("StateOrProvince"), "zip": l.get("PostalCode"),
        "price": l.get("ListPrice"), "beds": l.get("BedroomsTotal"),
        "baths": l.get("BathroomsTotalInteger"), "bathsFull": l.get("BathroomsFull"),
        "bathsHalf": l.get("BathroomsHalf"), "sqft": l.get("LivingArea"),
        "lotAcres": l.get("LotSizeAcres"), "yearBuilt": l.get("YearBuilt"),
        "garage": l.get("GarageSpaces"), "view": l.get("View"),
        "description": l.get("PublicRemarks"), "status": l.get("StandardStatus"),
        "type": l.get("PropertyType"), "subType": l.get("PropertySubType"),
        "taxes": l.get("TaxAnnualAmount"), "daysOnMarket": l.get("DaysOnMarket"),
        "agent": l.get("ListAgentFullName"), "office": l.get("ListOfficeName"),
        "lat": l.get("Latitude"), "lng": l.get("Longitude"),
        "hoaFee": l.get("AssociationFee"), "heating": l.get("Heating"),
        "cooling": l.get("Cooling"), "parking": l.get("ParkingFeatures"),
        "appliances": l.get("Appliances"), "updated": l.get("ModificationTimestamp"),
    }
    photos = [m["MediaURL"] for m in media.get("value", []) if m.get("MediaURL")]
    return listing, photos


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path

        if path in ("/api/listings", "/listings"):
            try:
                listings, hit = get_listings()
                self.send_json(200, {"count": len(listings), "listings": listings},
                               cache="HIT" if hit else "MISS")
            except Exception as e:
                self.send_json(500, {"error": str(e)})

        elif path.startswith("/listing/") or path.startswith("/api/listing/"):
            try:
                key = path.split("/listing/", 1)[1]
                listing, photos = fetch_detail(get_token(), urllib.parse.unquote(key))
                if listing is None:
                    self.send_json(404, {"error": "Not found"})
                else:
                    self.send_json(200, {"listing": listing, "photos": photos})
            except Exception as e:
                self.send_json(500, {"error": str(e)})

        elif path.startswith("/api/listing-by-slug/"):
            try:
                slug = urllib.parse.unquote(path[len("/api/listing-by-slug/"):]).rstrip("/")
                listings, _ = get_listings()
                found = next((l for l in listings if l["slug"] == slug), None)
                if not found:
                    self.send_json(404, {"error": "Listing not found for slug"})
                    return
                listing, photos = fetch_detail(get_token(), found["id"])
                if listing is None:
                    self.send_json(404, {"error": "Not found"})
                else:
                    self.send_json(200, {"listing": listing, "photos": photos})
            except Exception as e:
                self.send_json(500, {"error": str(e)})

        elif path.startswith("/homes/"):
            self.serve_file("listing.html")

        else:
            super().do_GET()

    def serve_file(self, filename):
        filepath = os.path.join(os.path.dirname(__file__), filename)
        try:
            with open(filepath, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()

    def send_json(self, code, data, cache=None):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        if cache:
            self.send_header("X-Cache-Status", cache)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} - {fmt % args}")


if __name__ == "__main__":
    print("Grant C. Meyer Homes — Local Dev Server  (PRODUCTION Trestle feed)")
    print(f"Serving on http://localhost:{PORT}")
    print(f"  Home:      http://localhost:{PORT}/")
    print(f"  Listings:  http://localhost:{PORT}/listings.html")
    print(f"  API:       http://localhost:{PORT}/api/listings")
    print(f"Listings cached in-memory for {LISTINGS_TTL}s (the feed is billed).")
    print("Press Ctrl+C to stop.\n")
    HTTPServer(("", PORT), Handler).serve_forever()
