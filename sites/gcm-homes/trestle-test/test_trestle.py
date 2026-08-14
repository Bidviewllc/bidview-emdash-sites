"""
Trestle API connection test — Grant C. Meyer Homes
Tests: auth token, metadata, and listing fetch
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import sys

import os
# Credentials from the environment only (never commit secrets).
# See ~/.claude/credentials/trestle-api.md for the sandbox/production values.
CLIENT_ID     = os.environ.get("TRESTLE_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("TRESTLE_CLIENT_SECRET", "")
TOKEN_URL     = "https://api.cotality.com/trestle/oidc/connect/token"
ODATA_BASE    = "https://api.cotality.com/trestle/odata"


def get_token():
    print("\n[1] Requesting access token...")
    data = urllib.parse.urlencode({
        "grant_type":    "client_credentials",
        "client_id":     CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope":         "api",
    }).encode()
    req = urllib.request.Request(TOKEN_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("User-Agent", "Mozilla/5.0 (compatible; TrestleClient/1.0)")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read())
            token = body.get("access_token")
            expires = body.get("expires_in")
            print(f"    OK — token expires in {expires}s")
            print(f"    Token preview: {token[:40]}...")
            return token
    except urllib.error.HTTPError as e:
        print(f"    FAILED — HTTP {e.code}: {e.read().decode()}")
        sys.exit(1)
    except Exception as e:
        print(f"    FAILED — {e}")
        sys.exit(1)


def build_odata_url(base, resource, params=None):
    """Build OData URL — params dict keys keep their $ prefix unencoded."""
    url = f"{base}/{resource}"
    if params:
        qs = "&".join(f"{k}={urllib.parse.quote(str(v), safe='(),')}" for k, v in params.items())
        url = f"{url}?{qs}"
    return url


def odata_get(token, path, label):
    url = f"{ODATA_BASE}/{path}" if not path.startswith("http") else path
    print(f"\n[{label}] GET {url}")
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "Mozilla/5.0 (compatible; TrestleClient/1.0)")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read())
            return body
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"    FAILED — HTTP {e.code}: {error_body[:400]}")
        return None
    except Exception as e:
        print(f"    FAILED — {e}")
        return None


def test_metadata(token):
    print("\n[2] Fetching OData service document (resource list)...")
    result = odata_get(token, "", "2")
    if result:
        resources = result.get("value", [])
        print(f"    OK — {len(resources)} resource(s) available:")
        for r in resources[:20]:
            print(f"      - {r.get('name', '?')}  ({r.get('url', '')})")
    return result


def test_data_systems(token):
    print("\n[3] Fetching available DataSystem (originating MLS sources)...")
    result = odata_get(token, "DataSystem", "3")
    if result:
        systems = result.get("value", [])
        print(f"    OK — {len(systems)} data system(s):")
        for s in systems:
            # Print all non-null fields so we can see what this test account exposes
            fields = {k: v for k, v in s.items() if v not in (None, "", [])}
            for k, v in fields.items():
                print(f"      {k}: {v}")
            print()
    return result


def test_listings(token, originating_system=None):
    print("\n[4] Fetching first 5 Property listings...")
    sel = "ListingKey,ListingId,StreetNumber,StreetName,City,StateOrProvince,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus"
    if originating_system:
        url = build_odata_url(ODATA_BASE, "Property", {
            "$top": "5",
            "$filter": f"OriginatingSystemName eq '{originating_system}'",
            "$select": sel,
        })
    else:
        url = build_odata_url(ODATA_BASE, "Property", {"$top": "5", "$select": sel})
    result = odata_get(token, url, "4")
    if result:
        listings = result.get("value", [])
        print(f"    OK — {len(listings)} listing(s) returned:")
        for l in listings:
            addr = f"{l.get('StreetNumber','')} {l.get('StreetName','')} {l.get('City','')} {l.get('StateOrProvince','')}".strip()
            price = l.get("ListPrice") or 0
            print(f"      [{l.get('ListingKey','?')}] {addr} | ${price:,} | {l.get('BedroomsTotal','?')}bd/{l.get('BathroomsTotalInteger','?')}ba | {l.get('LivingArea','?')} sqft | {l.get('StandardStatus','?')}")
    return result


def test_media(token):
    print("\n[5] Fetching media (photos) sample...")
    url = build_odata_url(ODATA_BASE, "Media", {
        "$top": "3",
        "$select": "MediaKey,ResourceRecordKey,MediaURL,MediaType,Order",
    })
    result = odata_get(token, url, "5")
    if result:
        items = result.get("value", [])
        print(f"    OK — {len(items)} media record(s):")
        for m in items:
            print(f"      [{m.get('MediaKey','?')}] {m.get('MediaURL','no URL')} ({m.get('MediaType','?')})")
    return result


def test_incline_village(token, originating_system=None):
    print("\n[6] Filtering for Incline Village listings (top 5)...")
    f = "City eq 'Incline Village'"
    if originating_system:
        f = f"OriginatingSystemName eq '{originating_system}' and City eq 'Incline Village'"
    url = build_odata_url(ODATA_BASE, "Property", {
        "$top": "5",
        "$filter": f,
        "$select": "ListingKey,StreetNumber,StreetName,City,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus",
    })
    result = odata_get(token, url, "6")
    if result:
        listings = result.get("value", [])
        if listings:
            print(f"    OK — {len(listings)} Incline Village listing(s):")
            for l in listings:
                addr = f"{l.get('StreetNumber','')} {l.get('StreetName','')}".strip()
                price = l.get("ListPrice") or 0
                print(f"      {addr} | ${price:,} | {l.get('BedroomsTotal','?')}bd | {l.get('StandardStatus','?')}")
        else:
            print("    No Incline Village listings in this data set")
    return result


if __name__ == "__main__":
    print("=" * 60)
    print("  Trestle API — Connection Test")
    print("  Grant C. Meyer Homes / BlueSpaces LLC")
    print("=" * 60)

    token = get_token()
    test_metadata(token)
    ds = test_data_systems(token)

    # Use the first available OriginatingSystemName if present
    originating = None
    if ds and ds.get("value"):
        originating = ds["value"][0].get("OriginatingSystemName")
        if originating:
            print(f"\n    Using OriginatingSystemName: {originating}")

    test_listings(token, originating)
    test_media(token)
    test_incline_village(token, originating)

    print("\n" + "=" * 60)
    print("  Test complete.")
    print("=" * 60)
