// ===== Main App =====

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

function App() {
  const [route, setRoute] = React.useState({ page: "home", params: {} });
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const navigate = (page, params = {}) => {
    setRoute({ page, params });
    if (page === "contact") {
      requestAnimationFrame(() => {
        const el = document.getElementById("contact-1") || document.getElementById("contact-2");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo({ top: document.body.scrollHeight - window.innerHeight - 400, behavior: "smooth" });
      });
    } else {
      window.scrollTo(0, 0);
    }
  };

  let view;
  switch (route.page) {
    case "home":
      view = <Home navigate={navigate} emotionLayout={t.emotionLayout} emotionPosition={t.emotionPosition} />;
      break;
    case "listing":
      view = <ListingDetail id={route.params.id || "1056"} navigate={navigate}
              showGallery={t.listingShowGallery}
              showMatterport={t.listingShowMatterport} />;
      break;
    case "listings":
      view = <Listings navigate={navigate} />;
      break;
    case "contact":
      view = <Home navigate={navigate} emotionLayout={t.emotionLayout} emotionPosition={t.emotionPosition} />;
      break;
    default:
      view = <ContentPage slug={route.page} navigate={navigate} />;
  }

  return (
    <React.Fragment>
      <Nav page={route.page} navigate={navigate} />
      <main>{view}</main>
      <Footer navigate={navigate} />
      <TweaksPanel>
        <TweakSection label="Listing detail page" />
        <TweakToggle
          label="Show photo gallery section"
          value={t.listingShowGallery}
          onChange={(v) => setTweak("listingShowGallery", v)}
        />
        <TweakToggle
          label="Show Matterport 3D tour"
          value={t.listingShowMatterport}
          onChange={(v) => setTweak("listingShowMatterport", v)}
        />
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
