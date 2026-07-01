"""
Verify all 70 WP redirects by testing www.wncaudiology.com live.
These are www-only redirects (match_type=server, server=https://www.wncaudiology.com).
"""
import urllib.request, urllib.error, json
from pathlib import Path

SOURCES = [
    "/tinnitus-treatment/",
    "/tinnitus-articles/how-to-prevent-tinnitus-from-worsening-while-flying/",
    "/tinnitus-articles/hearing-aids-relieve-tinnitus-symptoms/",
    "/reviews/",
    "/privacy-policy/",
    "/over-the-counter-hearing-aids/",
    "/location-contact/",
    "/hearing-tips/page/5/",
    "/hearing-tips/page/4/",
    "/hearing-tips/page/3/",
    "/hearing-tips/",
    "/hearing-testing/",
    "/hearing-test-info/your-autumn-hearing-health-guide/",
    "/hearing-test-info/why-regular-hearing-tests-are-important-after-age-50/",
    "/hearing-test-info/should-i-get-a-hearing-test/",
    "/hearing-test-info/cannabis-use-hearing-health/",
    "/hearing-protection/",
    "/hearing-loss-causes-symptoms/",
    "/hearing-loss-articles/will-i-get-my-hearing-back-after-an-ear-infection/",
    "/hearing-loss-articles/who-is-a-good-candidate-for-cochlear-implants/",
    "/hearing-loss-articles/what-does-hearing-loss-sound-like/",
    "/hearing-loss-articles/understanding-the-link-between-heart-health-and-hearing/",
    "/hearing-loss-articles/top-3-reasons-your-hearing-protection-might-not-be-working/",
    "/hearing-loss-articles/the-negative-effects-of-ignoring-hearing-loss/",
    "/hearing-loss-articles/the-impact-of-hearing-loss-on-first-responders/",
    "/hearing-loss-articles/the-connection-between-hearing-loss-and-reduced-lifespan/",
    "/hearing-loss-articles/is-hearing-loss-reversable/",
    "/hearing-loss-articles/how-untreated-hearing-loss-affects-mobility/",
    "/hearing-loss-articles/how-to-stay-connected-during-the-holidays-with-hearing-loss/",
    "/hearing-loss-articles/how-to-protect-hearing-and-hearing-aids-in-cold-weather/",
    "/hearing-loss-articles/how-to-prevent-hearing-loss-from-headphones/",
    "/hearing-loss-articles/how-to-hear-better-at-summer-bbqs-and-family-events/",
    "/hearing-loss-articles/how-to-address-hearing-loss-with-loved-ones-this-thanksgiving/",
    "/hearing-loss-articles/how-lifestyle-choices-impact-your-hearing-health/",
    "/hearing-loss-articles/how-high-blood-pressure-can-damage-your-hearing/",
    "/hearing-loss-articles/how-driving-with-the-windows-open-affects-your-hearing-health/",
    "/hearing-loss-articles/how-auditory-processing-disorder-differs-from-hearing-loss/",
    "/hearing-loss-articles/how-anxiety-impacts-hearing-loss-and-ways-to-overcome-it/",
    "/hearing-loss-articles/how-addressing-hearing-loss-can-combat-isolation/",
    "/hearing-loss-articles/hidden-costs-of-untreated-hearing-loss-in-the-workplace/",
    "/hearing-loss-articles/hearing-aids-vs-cochlear-implants-for-infants/",
    "/hearing-loss-articles/enjoy-the-sounds-of-autumn-how-to-protect-your-hearing-this-fall/",
    "/hearing-loss-articles/earwax-purpose-and-when-to-remove-it/",
    "/hearing-loss-articles/can-hearing-loss-make-you-feel-tired/",
    "/hearing-loss-articles/can-hearing-loss-lead-to-memory-problems/",
    "/hearing-loss-articles/are-men-and-women-affected-differently-by-hearing-loss/",
    "/hearing-loss-articles/am-i-at-risk-for-hearing-loss/",
    "/hearing-loss-articles/airpods-as-hearing-aids-what-to-know-before-relying-on-them/",
    "/hearing-loss-articles/6-reasons-to-have-regular-hearing-tests/",
    "/hearing-aids-plans-and-pricing/",
    "/hearing-aids-online/",
    "/hearing-aids-news/when-is-it-time-to-update-your-hearing-aids/",
    "/hearing-aids-news/whats-new-in-2025-for-hearing-aid-technology/",
    "/hearing-aids-news/what-are-bone-conduction-hearing-devices/",
    "/hearing-aids-news/wearing-hearing-aids-while-exercising-and-sweating/",
    "/hearing-aids-news/understanding-hearing-aids-how-to-set-reasonable-goals/",
    "/hearing-aids-news/how-to-protect-your-hearing-aids-this-summer/",
    "/hearing-aids-news/how-to-adjust-comfortably-to-your-new-hearing-aids/",
    "/hearing-aids-news/how-often-should-you-get-your-hearing-aids-professionally-cleaned/",
    "/hearing-aids-news/guide-to-maintaining-and-cleaning-your-hearing-aids/",
    "/hearing-aids-news/essential-guide-to-prolonging-the-life-of-your-hearing-aid/",
    "/hearing-aids-news/can-you-wear-hearing-aids-during-an-ear-infection/",
    "/hearing-aids-news/6-tricks-to-make-hearing-aid-batteries-last/",
    "/hearing-aid-tips-faq/",
    "/hearing-aid-repair/",
    "/hearing-aid-fittings/",
    "/best-hearing-aids/",
    "/best-hearing-aid-brands/",
    "/balance-testing/",
    "/about-us/",
]


class RedirectTracker(urllib.request.HTTPRedirectHandler):
    def __init__(self):
        self.final_url = None
        self.code = None

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.final_url = newurl
        self.code = code
        # Return None to stop following (only capture first redirect)
        return None


results = {}
for path in SOURCES:
    try:
        tracker = RedirectTracker()
        opener = urllib.request.build_opener(tracker)
        req = urllib.request.Request(
            f"https://www.wncaudiology.com{path}",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        try:
            opener.open(req, timeout=8)
        except urllib.error.HTTPError as e:
            if tracker.final_url:
                results[path] = tracker.final_url
            else:
                results[path] = f"HTTP_{e.code}"
        else:
            results[path] = tracker.final_url or "NO_REDIRECT"
    except Exception as e:
        results[path] = f"ERROR_{e}"

# Deduplicate target patterns for summary
from collections import Counter
targets = Counter(results.values())
print("=== REDIRECT TARGETS SUMMARY ===")
for tgt, count in targets.most_common():
    print(f"  {count}x -> {tgt}")

print()
print("=== FULL REDIRECT MAP ===")
for src, tgt in sorted(results.items()):
    print(f"  {src} -> {tgt}")

# Save as JSON for later use
out = Path(__file__).parent / "wp-redirects.json"
out.write_text(json.dumps(results, indent=2), encoding="utf-8")
print(f"\nSaved -> {out}")
