// ===== Main App =====
//
// Routing is URL-based (History API), not React state alone. Every page has a
// real, linkable, indexable URL — previously every route rendered at "/" and a
// refresh or shared link 404'd, which is fatal for an SEO-driven property site.
//
// Listings live OUTSIDE this SPA:
//   /listings/            -> listings.html  (live Trestle search + map)
//   /homes/:city/:address -> listing.html   (live Trestle detail)
// Those are separate documents, so links to them are ordinary <a href> —
// no navigate() call, no client-side interception.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "version": "A",
  "emotionLayout": "bottomCard",
  "emotionPosition": "inline",
  "listingShowGallery": true,
  "listingShowMatterport": true
}/*EDITMODE-END*/;

const VERSION_PRESETS = {
  A: { emotionLayout: "bottomCard", emotionPosition: "inline" },
  B: { emotionLayout: "split",      emotionPosition: "afterReview" },
};

// page key -> canonical URL. Trailing slashes are canonical site-wide
// (vercel.json "trailingSlash": true, which 308s /about -> /about/). Linking to
// the canonical form directly avoids a redirect hop on every click.
const PAGE_PATHS = {
  home: "/",
  buyers: "/buyers/",
  sellers: "/sellers/",
  community: "/community/",
  concierge: "/concierge/",
  about: "/about/",
  contact: "/contact/",
};

const PATH_PAGES = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page])
);

// Returns { page, param }. Static pages have no param; /neighborhood/<slug>/
// carries the slug so the SPA can render that area's sub-page.
function routeFromPath(pathname) {
  const p = pathname === "/" ? "/" : pathname.replace(/\/*$/, "/");
  const nb = p.match(/^\/neighborhood\/([^/]+)\/$/);
  if (nb) return { page: "neighborhood", param: decodeURIComponent(nb[1]) };
  return { page: PATH_PAGES[p] || "notfound", param: null };
}

function NotFound({ navigate }) {
  React.useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="page-fade">
      <section className="listings-page-hero" data-screen-label="404">
        <span className="eyebrow">404</span>
        <h1 style={{ marginTop: 16, maxWidth: 880, marginLeft: "auto", marginRight: "auto" }}>
          This page has moved on.
        </h1>
        <p>The page you're looking for doesn't exist. Let's get you back to the lake.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 34, flexWrap: "wrap" }}>
          <a className="btn btn--orange" href="/listings/">BROWSE LISTINGS</a>
          <a className="btn" href="/"
             style={{ border: "1px solid var(--line, #C5C6CE)", color: "var(--navy)" }}
             onClick={(e) => { e.preventDefault(); navigate("home"); }}>
            RETURN HOME
          </a>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [route, setRoute] = React.useState(() => routeFromPath(window.location.pathname));
  const { page, param } = route;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Back/forward must work like any normal site.
  React.useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const scrollToContact = () => {
    requestAnimationFrame(() => {
      const el = document.getElementById("contact-1") || document.getElementById("contact-2");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: document.body.scrollHeight - window.innerHeight - 400, behavior: "smooth" });
    });
  };

  const navigate = (next, params = {}) => {
    const path = next === "neighborhood"
      ? "/neighborhood/" + params.param + "/"
      : (PAGE_PATHS[next] || "/");
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute({ page: next, param: params.param || null });
    if (next === "contact") scrollToContact();
    else window.scrollTo(0, 0);
  };

  // Landing directly on /contact/ should still land you at the form.
  React.useEffect(() => {
    if (page === "contact") scrollToContact();
  }, [page]);

  let view;
  switch (page) {
    case "home":
    case "contact":
      view = <Home navigate={navigate} emotionLayout={t.emotionLayout} emotionPosition={t.emotionPosition} />;
      break;
    case "community":
      view = <CommunityGuide navigate={navigate} />;
      break;
    case "neighborhood":
      view = <NeighborhoodPage slug={param} navigate={navigate} />;
      break;
    case "notfound":
      view = <NotFound navigate={navigate} />;
      break;
    default:
      view = <ContentPage slug={page} navigate={navigate} />;
  }

  return (
    <React.Fragment>
      <Nav page={page} navigate={navigate} />
      <main>{view}</main>
      <Footer navigate={navigate} />
      <TweaksPanel>
        <TweakSection label="Home page version" />
        <TweakRadio
          label="Version"
          value={t.version}
          options={[
            { value: "A", label: "A — inline + strip" },
            { value: "B", label: "B — after contact + split" },
          ]}
          onChange={(v) => {
            const preset = VERSION_PRESETS[v];
            setTweak({ version: v, ...preset });
          }}
        />
        <TweakSection label="Section 3 — Emotional Weight (advanced)" />
        <TweakSelect
          label="Layout"
          value={t.emotionLayout}
          options={[
            { value: "centered", label: "Centered card" },
            { value: "split", label: "Split — photo + panel" },
            { value: "fullbleed", label: "Full-bleed quote" },
            { value: "bottomCard", label: "Bottom caption strip" },
          ]}
          onChange={(v) => setTweak("emotionLayout", v)}
        />
        <TweakSelect
          label="Position"
          value={t.emotionPosition}
          options={[
            { value: "inline", label: "Inline (after Reality Check)" },
            { value: "afterReview", label: "After Contact form" },
          ]}
          onChange={(v) => setTweak("emotionPosition", v)}
        />
      </TweaksPanel>
    </React.Fragment>
  );
}

// NotFound is used cross-script by community.jsx (NeighborhoodPage fallback).
Object.assign(window, { PAGE_PATHS, NotFound });

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
