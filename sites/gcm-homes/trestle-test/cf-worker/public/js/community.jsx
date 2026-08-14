// ===== Community Guide page =====
//
// Built from Liz's handoff (community-dev-handoff.zip) + her live prototype: the
// 9-section Community Guide + her interactive Leaflet neighborhood map (embedded
// from public/map/, verbatim from her build). Copy is verbatim from her spec;
// items she flagged [PLACEHOLDER — verify before publishing] (Grant's picks,
// school details, all neighborhood prices/trends, IVGID fee) are stand-ins and
// must be confirmed with Grant before this goes public.
//
// The map = her real traced GeoJSON polygons (public/map/neighborhoods-data.js),
// 16 areas, Map/Satellite/Terrain toggle. Slugs here match her map's areaToSlug
// output so its popup "Explore" buttons resolve to our sub-pages.

// ---- 15 neighborhood guides (x/y kept for reference; the map now uses GeoJSON)
const NEIGHBORHOODS = [
  { slug: "lakefront",          name: "Lakefront",                 tag: "Waterfront living",           x: 67,   y: 68,   price: "$9.2M", trend: "Tight Hold", blurb: "Tahoe's most coveted address — private piers, sweeping water views, and the longest sunsets on the North Shore." },
  { slug: "lakeview",           name: "Lakeview",                  tag: "Lake-view estates",           x: 43,   y: 51,   price: "$3.4M", trend: "Limited",    blurb: "Elevated homes that trade the waterfront for the wide, unobstructed lake panoramas Incline is known for." },
  { slug: "mill-creek",         name: "Mill Creek",                tag: "Walk-to-beach family living", x: 77,   y: 69.5, price: "$2.1M", trend: "Active",     blurb: "A family favorite on the eastern edge — level lots, a short walk to the beach, and easy reach of Diamond Peak." },
  { slug: "central",            name: "Central",                   tag: "Walkable village core",       x: 60.5, y: 52,   price: "$1.6M", trend: "Active",     blurb: "The walkable heart of the village, minutes from Raley's, the recreation center, and the public schools." },
  { slug: "apollo",             name: "Apollo",                    tag: "Trailhead privacy",           x: 66.5, y: 9.25, price: "$2.8M", trend: "Limited",    blurb: "Tucked against the national forest up top, prized for trailhead access and end-of-road privacy." },
  { slug: "woods",              name: "Woods",                     tag: "Quiet, central location",     x: 52.5, y: 42,   price: "$1.9M", trend: "Steady",     blurb: "Quiet, wooded, and genuinely central — a calm pocket within easy reach of everything." },
  { slug: "ponderosa",          name: "Ponderosa",                 tag: "Wooded seclusion",            x: 29.25, y: 48,  price: "$2.3M", trend: "Limited",    blurb: "Secluded lots under tall pines on the western side, close to the golf course and the shore road." },
  { slug: "lower-tyner",        name: "Lower Tyner",               tag: "Mountain & canyon views",     x: 31,   y: 40,   price: "$2.0M", trend: "Steady",     blurb: "Mountain and canyon views on gently rising ground, a step up from the village core." },
  { slug: "upper-tyner",        name: "Upper Tyner",               tag: "Elevation & privacy",         x: 45,   y: 31,   price: "$2.6M", trend: "Limited",    blurb: "Higher still — more elevation, more privacy, and bigger views for those who want the climb." },
  { slug: "jennifer",           name: "Jennifer",                  tag: "Hiking from the doorstep",    x: 51,   y: 20.5, price: "$2.2M", trend: "Steady",     blurb: "Hiking from the doorstep, with quick access to the trails that lace the slopes above the village." },
  { slug: "championship-golf-course",  name: "Championship Golf Course",  tag: "Course frontage",             x: 67,   y: 40.5, price: "$3.1M", trend: "Tight Hold", blurb: "Homes fronting the Robert Trent Jones championship course — green in summer, trail-laced in winter." },
  { slug: "mountain-golf-course",      name: "Mountain Golf Course",      tag: "Golf & winter trails",        x: 58.5, y: 27,   price: "$2.7M", trend: "Limited",    blurb: "Along the shorter mountain course — golf in the warm months, groomed nordic tracks once the snow falls." },
  { slug: "eastern-slope",      name: "Eastern Slope",             tag: "Water & southern exposure",   x: 69.5, y: 24,   price: "$3.6M", trend: "Limited",    blurb: "Eastern exposure and water views, catching the morning light coming up over the lake." },
  { slug: "ski-way",            name: "Ski Way",                   tag: "Close to Diamond Peak",       x: 81,   y: 58,   price: "$2.4M", trend: "Active",     blurb: "The closest neighborhood to Diamond Peak — ski-in mornings and the shortest lift-line commute in town." },
  { slug: "crystal-bay",        name: "Crystal Bay",               tag: "The state-line gateway",      x: 16,   y: 78,   price: "$4.1M", trend: "Emerging",   blurb: "The state-line gateway, where grand lakefront estates meet original mid-century cabins on wooded lots." },
];

// ---- Section content (verbatim from the handoff) -------------------------
const LAKE_FACTS = [
  { num: "6,225–7,700", unit: "ft",    label: "Elevation range" },
  { num: "290",         unit: "days",  label: "Of sunshine a year" },
  { num: "216",         unit: "in",    label: "Average snowfall" },
  { num: "72",          unit: "miles", label: "Of shoreline" },
];

const THINGS_TODO = [
  { h: "Diamond Peak",           pick: true,  p: "A community-owned ski resort with some of the best lake-view runs on the North Shore — and short lift lines compared with the bigger Tahoe resorts." },
  { h: "The Private Beaches",    pick: false, p: "Incline, Burnt Cedar, and Ski Beach are reserved for residents and their guests — swimming, picnics, and boat access through the summer." },
  { h: "Two Golf Courses",       pick: false, p: "The Robert Trent Jones championship course and the shorter mountain course, both run by the community improvement district." },
  { h: "Trails & Sand Harbor",   pick: true,  p: "Hiking and biking from the village down to the lake, plus the East Shore Trail and Sand Harbor's coves just off Highway 28." },
  { h: "On the Water",           pick: false, p: "Boating, paddleboarding, and kayaking on the clearest large lake in the country, with full-service marinas a short drive away." },
  { h: "Thunderbird Lodge",      pick: false, p: "Captain Whittell's stone lakeside castle south of Sand Harbor, open for docent-led tours through the summer months." },
];

const SCHOOLS_GLANCE = [
  "Public elementary, middle & high schools",
  "Private K–8 options within the village",
  "A newer elementary campus completed in 2009",
  "Reno–Tahoe universities within an hour",
];

const HISTORY_ERAS = [
  { era: "Logging era", year: "1880s", p: "The North Shore began as timber country, feeding the Comstock silver mines of Virginia City. Through the 1800s a narrow-gauge line hauled logs up the mountain to a V-flume — the scars of that era still trace the ridgelines between Mill Creek and Sand Harbor." },
  { era: "Thunderbird Lodge", year: "1930s", p: "By the early 1900s the lake had become a summer escape. Captain George Whittell bought some 40,000 acres and built a stone castle south of Sand Harbor — the Thunderbird Lodge — where he was known for legendary parties and a private menagerie that included lions and an elephant." },
  { era: "Crystal Bay Development Co.", year: "1960s", p: "In the 1960s the Crystal Bay Development Company acquired Whittell's holdings and set out to build a master-planned community. Robert Trent Jones designed the golf course, the name Incline Village was chosen, and the first school opened in 1964 — the framework of the village you see today." },
];

const LIVING_HERE = [
  { h: "Getting here", body: ["Reno–Tahoe International Airport sits about 45 minutes down Highway 431, which makes Incline Village one of the more reachable luxury markets in the Sierra.", "Sacramento and the Bay Area are an easy weekend drive, and most of the village is only a few minutes from Highway 28 along the shore."] },
  { h: "Amenities & IVGID", body: ["The Incline Village General Improvement District runs the private beaches, Diamond Peak, both golf courses, the tennis complex, and the recreation center.", "Access comes through an annual recreation fee billed alongside your Washoe County property taxes — one of the things that makes residency here distinct."] },
  { h: "Climate & the seasons", body: ["Incline sits between roughly 6,225 and 7,700 feet, which gives it four genuine seasons: deep, snowy winters and dry, mild summers, with around 290 days of sunshine across the year.", "Snow piles up through the winter — well over a hundred inches in a typical year — then gives way to long, clear summers ideal for the lake."] },
  { h: "Day-to-day essentials", body: ["The village covers the basics close to home — Raley's and the Village shopping center for groceries, the recreation center and library at the core, and the local public and private schools all within a few minutes.", "For specialized care and bigger errands, Tahoe Forest Health System is over the hill in Truckee, and Reno's hospitals and shopping are about 45 minutes away."] },
];

const HERO_IMG = "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?fm=jpg&q=80&w=2800&auto=format&fit=crop";

function fmtPrice(n) { return n ? "$" + Number(n).toLocaleString() : "—"; }

// ---- Match live listings to a neighborhood by polygon -----------------------
// The Trestle feed has no subdivision field (SubdivisionName is null on all
// listings), so we can't filter by name. Instead we test each listing's lat/lng
// against the neighborhood's traced GeoJSON polygon(s) — window.NB_GEO, the same
// data the map uses. Central North + Central South are two polygons, one guide.
function areaToSlug(name) {
  const s = String(name || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (s === "central-north" || s === "central-south") ? "central" : s;
}
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function pointInFeature(lng, lat, feature) {
  const g = feature.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of polys) {
    if (!pointInRing(lng, lat, poly[0])) continue;   // outer ring
    let inHole = false;
    for (let k = 1; k < poly.length; k++) if (pointInRing(lng, lat, poly[k])) inHole = true;
    if (!inHole) return true;
  }
  return false;
}
function listingsInNeighborhood(slug, listings) {
  const geo = window.NB_GEO;
  if (!geo) return [];
  const features = geo.features.filter(f => areaToSlug(f.properties.area) === slug);
  if (!features.length) return [];
  return listings.filter(l =>
    l.lat != null && l.lng != null && features.some(f => pointInFeature(l.lng, l.lat, f))
  );
}

// One shared fetch of the feed, reused across neighborhood pages.
let _listingsPromise = null;
function loadAllListings() {
  if (!_listingsPromise) {
    _listingsPromise = fetch("/api/listings").then(r => r.json()).then(d => d.listings || []).catch(() => []);
  }
  return _listingsPromise;
}

function NeighborhoodListings({ slug, name }) {
  const [state, setState] = React.useState({ loading: true, homes: [] });
  React.useEffect(() => {
    let live = true;
    loadAllListings().then(all => {
      if (!live) return;
      const homes = listingsInNeighborhood(slug, all).sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      setState({ loading: false, homes });
    });
    return () => { live = false; };
  }, [slug]);

  return (
    <section className="section section--cream" data-screen-label="Neighborhood Listings">
      <div className="container">
        <div className="cg-head">
          <span className="eyebrow">Currently on the Market</span>
          <h2 className="cg-h2">Homes for Sale in {name}</h2>
          <p className="cg-intro">
            {state.loading ? "Finding the homes currently listed here…"
              : state.homes.length
                ? `${state.homes.length} active ${state.homes.length === 1 ? "listing" : "listings"} within ${name}, straight from the MLS.`
                : `No active listings inside ${name} at the moment — the market here moves quietly. Grant can share what's coming and what's sold off-market.`}
          </p>
        </div>

        {state.loading ? (
          <div className="cg-featured">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="cg-fcard cg-fcard--sk" />)}
          </div>
        ) : state.homes.length ? (
          <React.Fragment>
            <div className="cg-featured">
              {state.homes.slice(0, 6).map(l => (
                <a key={l.id} className="cg-fcard" href={"/homes/" + l.slug + "/"}>
                  <div className="cg-fcard__media" style={{ backgroundImage: l.photo ? `url(${l.photo})` : "none" }} />
                  <div className="cg-fcard__body">
                    <div className="cg-fcard__tag">{l.category || l.type || "Residential"}</div>
                    <h3 className="cg-fcard__addr">{l.address}</h3>
                    <div className="cg-fcard__meta">
                      {[l.beds && `${l.beds} BD`, l.baths && `${l.baths} BA`,
                        l.sqft && `${Number(l.sqft).toLocaleString()} SQ.FT.`].filter(Boolean).join(" | ")}
                    </div>
                    <div className="cg-fcard__price">{fmtPrice(l.price)}</div>
                  </div>
                </a>
              ))}
            </div>
            {state.homes.length > 6 && (
              <div style={{ textAlign: "center", marginTop: 44 }}>
                <a className="btn btn--dark" href="/listings/">SEE ALL {state.homes.length} HOMES <Icon.ArrowRight color="currentColor" /></a>
              </div>
            )}
          </React.Fragment>
        ) : (
          <div style={{ textAlign: "center" }}>
            <a className="btn btn--orange" href="/contact/">Ask Grant what's available</a>
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Interactive neighborhood map ----------------------------------------
// Follows Liz's build: her self-contained Leaflet app (public/map/) embedded as
// an iframe — real traced GeoJSON polygons for all 16 areas, a Map/Satellite/
// Terrain toggle, per-area popups. Clicking a popup's "Explore" postMessages
// `gotoNeighborhood` up to us (see the listener in CommunityGuide), which opens
// that area's sub-page. Below the map, a clickable card grid is the mobile +
// no-JS-map fallback. (Central North/South are two polygons but one guide.)
function NeighborhoodExplorer({ navigate }) {
  return (
    <div className="nbhd">
      <div className="nbhd__mapframe">
        <iframe title="Incline Village neighborhood map" src="/map/"
                loading="lazy" />
      </div>

      <div className="nbhd__grid">
        {NEIGHBORHOODS.map(n => (
          <a key={n.slug} className="nbhd__card" href={"/neighborhood/" + n.slug + "/"}
             onClick={(e) => { e.preventDefault(); navigate("neighborhood", { param: n.slug }); }}>
            <div className="nbhd__card__name">{n.name}</div>
            <div className="nbhd__card__tag">{n.tag}</div>
            <div className="nbhd__card__go">Explore →</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ---- Featured properties (live Trestle) ----------------------------------
function CommunityFeatured({ navigate }) {
  const [listings, setListings] = React.useState(null);
  React.useEffect(() => {
    fetch("/api/listings")
      .then(r => r.json())
      .then(d => setListings((d.listings || []).slice(0, 3)))
      .catch(() => setListings([]));
  }, []);

  return (
    <section className="section section--cream" data-screen-label="Featured Properties">
      <div className="container">
        <div className="cg-head">
          <span className="eyebrow">Currently on the Market</span>
          <h2 className="cg-h2">Featured Properties</h2>
          <p className="cg-intro">Homes Grant is representing right now across Incline Village and Crystal Bay.</p>
        </div>
        <div className="cg-featured">
          {listings === null
            ? Array.from({ length: 3 }, (_, i) => <div key={i} className="cg-fcard cg-fcard--sk" />)
            : listings.map(l => (
              <a key={l.id} className="cg-fcard" href={"/homes/" + l.slug + "/"}>
                <div className="cg-fcard__media" style={{ backgroundImage: l.photo ? `url(${l.photo})` : "none" }} />
                <div className="cg-fcard__body">
                  <div className="cg-fcard__tag">{l.category || l.type || "Residential"}</div>
                  <h3 className="cg-fcard__addr">{l.address}</h3>
                  <div className="cg-fcard__meta">
                    {[l.beds && `${l.beds} BD`, l.baths && `${l.baths} BA`,
                      l.sqft && `${Number(l.sqft).toLocaleString()} SQ.FT.`].filter(Boolean).join(" | ")}
                  </div>
                  <div className="cg-fcard__price">{fmtPrice(l.price)}</div>
                </div>
              </a>
            ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <a className="btn btn--dark" href="/listings/">VIEW ALL LISTINGS <Icon.ArrowRight color="currentColor" /></a>
        </div>
      </div>
    </section>
  );
}

// ---- The page ------------------------------------------------------------
function CommunityGuide({ navigate }) {
  const [openLiving, setOpenLiving] = React.useState(0);
  React.useEffect(() => { window.scrollTo(0, 0); }, []);

  // The embedded map (public/map/index.html) drives navigation: its popup
  // "Explore" button postMessages `gotoNeighborhood` up to this page.
  React.useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === "gotoNeighborhood" && d.slug) navigate("neighborhood", { param: d.slug });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);

  return (
    <div className="page-fade cg">
      {/* 1. Hero */}
      <section className="cg-hero" data-screen-label="Community Hero">
        <div className="cg-hero__img" style={{ backgroundImage: `url(${HERO_IMG})` }} />
        <div className="cg-hero__veil" />
        <div className="cg-hero__copy">
          <span className="eyebrow eyebrow--light">Incline Village &amp; Crystal Bay</span>
          <h1 className="cg-hero__title">A Guide to Life on Tahoe's <em>North Shore.</em></h1>
          <p className="cg-hero__sub">Sixteen distinct neighborhoods, one extraordinary lake, and the details that make this corner of Nevada worth the move — mapped out from a 35-year resident's point of view.</p>
        </div>
      </section>

      {/* 2. Lake facts strip */}
      <section className="cg-facts" data-screen-label="Quick Facts">
        <div className="container">
          <span className="eyebrow">Incline at a Glance</span>
          <h2 className="cg-h2">The Lake, By the Numbers</h2>
          <div className="cg-facts__grid">
            {LAKE_FACTS.map((f, i) => (
              <div key={i} className="cg-fact">
                <div className="cg-fact__num">{f.num}<span>{f.unit}</span></div>
                <div className="cg-fact__label">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Explore the Neighborhoods */}
      <section className="section" data-screen-label="Neighborhoods">
        <div className="container">
          <div className="cg-head">
            <span className="eyebrow">Explore the Neighborhoods</span>
            <h2 className="cg-h2">Sixteen Areas, One Community</h2>
            <p className="cg-intro">Tap an area on the map to see its character, or pick a neighborhood below. Each opens its own guide, with the homes currently for sale there.</p>
          </div>
          <NeighborhoodExplorer navigate={navigate} />
        </div>
      </section>

      {/* 4. Things to Do */}
      <section className="section section--cream" data-screen-label="Things To Do">
        <div className="container">
          <div className="cg-head">
            <span className="eyebrow">Things to Do</span>
            <h2 className="cg-h2">What Living on the North Shore Looks Like</h2>
            <p className="cg-intro">Skiing in the morning, the beach by afternoon — the calendar here runs on the seasons.</p>
          </div>
          <div className="cg-todo">
            {THINGS_TODO.map((t, i) => (
              <div key={i} className="cg-todo__card">
                {t.pick && <div className="cg-todo__pick">Grant's pick</div>}
                <h3 className="cg-todo__h">{t.h}</h3>
                <p className="cg-todo__p">{t.p}</p>
              </div>
            ))}
          </div>
          <blockquote className="cg-quote">
            <p>Ask any local where the lake is best and you'll get a different answer for every month — the cove in July, the East Shore Trail in October, Diamond Peak in February. That's the whole secret of living here: there's a season for all of it.</p>
            <cite>Grant C. Meyer · 35 years on the lake</cite>
          </blockquote>
        </div>
      </section>

      {/* 5. Schools */}
      <section className="section" data-screen-label="Schools">
        <div className="container cg-split">
          <div>
            <span className="eyebrow">Schools</span>
            <h2 className="cg-h2">Learning, a Few Minutes From Home</h2>
            <p className="cg-body">Incline Village built its first elementary school in 1964 and its high school as the community itself took shape. Today families choose between the local public schools and a handful of private options — all within the village, none more than a short drive away.</p>
          </div>
          <div className="cg-glance">
            <div className="cg-glance__h">In One Glance</div>
            {SCHOOLS_GLANCE.map((s, i) => (
              <div key={i} className="cg-glance__row"><Icon.Check size={13} /> <span>{s}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. History */}
      <section className="cg-history" data-screen-label="History">
        <div className="container">
          <span className="eyebrow eyebrow--light">A Short History</span>
          <h2 className="cg-h2 cg-h2--light">From Logging Camp to Master-Planned Village</h2>
          <div className="cg-eras">
            {HISTORY_ERAS.map((e, i) => (
              <div key={i} className="cg-era">
                <div className="cg-era__mark">{String(i + 1).padStart(2, "0")}</div>
                <div className="cg-era__title">{e.era}<span> · {e.year}</span></div>
                <p className="cg-era__p">{e.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Living Here (accordion) */}
      <section className="section section--cream" data-screen-label="Living Here">
        <div className="container">
          <div className="cg-head">
            <span className="eyebrow">Living Here</span>
            <h2 className="cg-h2">Settling Into Incline Village</h2>
            <p className="cg-intro">The practical side of the move — how you get here, what residency opens up, and what the year actually feels like.</p>
          </div>
          <div className="cg-acc">
            {LIVING_HERE.map((item, i) => (
              <div key={i} className={"cg-acc__item" + (openLiving === i ? " is-open" : "")}>
                <button className="cg-acc__head" onClick={() => setOpenLiving(openLiving === i ? -1 : i)}>
                  <span>{item.h}</span>
                  <span className="cg-acc__sign">{openLiving === i ? "–" : "+"}</span>
                </button>
                {openLiving === i && (
                  <div className="cg-acc__body">
                    {item.body.map((p, j) => <p key={j}>{p}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Featured Properties (live) */}
      <CommunityFeatured navigate={navigate} />

      {/* 9. Contact */}
      <ContactSection id="community-contact" />
    </div>
  );
}

// ---- Neighborhood sub-page -----------------------------------------------
const NEIGHBORHOOD_BESPOKE = {
  "crystal-bay": {
    heroSub: "The gateway from California into Incline Village, right at the state line. Homes range from lakefront estates to original cabins, and owners share in the community amenities — with the private beaches the one exception.",
    overview: [
      "Crystal Bay sits where Highway 28 crosses from California into Nevada, wrapping the northwest corner of the lake. It's the quieter, more weathered cousin of Incline Village — a mix of grand lakefront estates and original mid-century cabins on wooded lots, many held by the same families for generations.",
      "Because it straddles the state line, Crystal Bay carries a particular appeal for buyers drawn to Nevada's tax treatment while staying steps from the California shore. Inventory is thin and turns over slowly, which makes local relationships the difference between hearing about a home and touring it.",
    ],
    take: "Crystal Bay rewards patience. The lakefront here rarely lists publicly, and when it does the right buyer is often already on a list. If this is the corner you want, the move is to be known here before the home exists.",
    glance: ["Right at the Nevada–California state line", "Lakefront estates to historic cabins", "Shares community amenities (beaches excepted)"],
    stats: [["$2.1M–$12M", "Typical range"], ["1–3 / yr", "Lakefront sales"], ["Mixed", "Home styles"], ["NV", "Tax jurisdiction"]],
  },
};

function NeighborhoodPage({ slug, navigate }) {
  React.useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  const area = NEIGHBORHOODS.find(n => n.slug === slug);
  if (!area) return <NotFound navigate={navigate} />;

  const b = NEIGHBORHOOD_BESPOKE[slug];
  const overview = b?.overview || [
    `${area.name} is one of the fifteen areas that make up Incline Village and Crystal Bay, each with its own character, price range, and rhythm through the seasons.`,
    "Detailed notes for this neighborhood are on the way. In the meantime, Grant can share off-market context, recent comps, and what's quietly available here.",
  ];
  const take = b?.take || `Grant's perspective on ${area.name} — who it suits, how it holds value, and what to watch for — goes here once we capture it.`;
  const glance = b?.glance || [area.tag, "Part of greater Incline Village", "Full IVGID amenity access"];
  const stats = b?.stats || [["—", "Typical range"], ["—", "Recent sales"], ["—", "Home styles"], ["NV", "Tax jurisdiction"]];
  const heroSub = b?.heroSub || "A distinct corner of Incline Village. Full neighborhood notes, photography, and current listings are being prepared — reach out and Grant will walk you through it directly.";

  return (
    <div className="page-fade cg">
      <section className="nb-hero" data-screen-label="Neighborhood Hero">
        <div className="nb-hero__veil" />
        <div className="container nb-hero__copy">
          <a className="nb-hero__back" href="/community/"
             onClick={(e) => { e.preventDefault(); navigate("community"); }}>← The Community</a>
          <span className="eyebrow eyebrow--light">{area.tag}</span>
          <h1 className="cg-hero__title">{area.name}</h1>
          <p className="cg-hero__sub">{heroSub}</p>
        </div>
      </section>

      <section className="section">
        <div className="container cg-split">
          <div>
            <h2 className="cg-h2">Living in {area.name}</h2>
            {overview.map((p, i) => <p key={i} className="cg-body">{p}</p>)}
            <div className="nb-take">
              <div className="nb-take__l">Grant's Take</div>
              <p>{take}</p>
            </div>
          </div>
          <aside className="nb-side">
            <div className="cg-glance">
              <div className="cg-glance__h">At a Glance</div>
              {glance.map((g, i) => <div key={i} className="cg-glance__row"><Icon.Check size={13} /> <span>{g}</span></div>)}
            </div>
            <div className="nb-stats">
              {stats.map(([v, l], i) => (
                <div key={i} className="nb-stat"><div className="nb-stat__v">{v}</div><div className="nb-stat__l">{l}</div></div>
              ))}
            </div>
            <a className="btn btn--orange nb-cta" href="/contact/"
               onClick={(e) => { e.preventDefault(); navigate("contact"); }}>Ask Grant About {area.name}</a>
          </aside>
        </div>
      </section>

      <NeighborhoodListings slug={slug} name={area.name} />

      <ContactSection id={"nb-contact-" + slug} />
    </div>
  );
}

// NB: NEIGHBORHOODS is NOT exported to window — window.NB_GEO (the GeoJSON) is a
// different shape and lives in js/neighborhoods-geo.js.
Object.assign(window, { CommunityGuide, NeighborhoodPage });
