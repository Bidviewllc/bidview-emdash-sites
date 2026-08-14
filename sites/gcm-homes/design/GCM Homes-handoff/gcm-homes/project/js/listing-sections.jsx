// ===== Featured Listing — sub-sections used by ListingDetail =====

// --- Cinematic hero ---
function ListingHero({ data, saved, setSaved }) {
  return (
    <section className="listing-hero listing-hero--fl" data-screen-label="Listing Hero">
      <div className="listing-hero__img" style={{ backgroundImage: `url(${data.hero})` }} />
      <div className="listing-hero__veil" />
      <div className="listing-hero__share">
        <button onClick={() => setSaved(!saved)} aria-label="Save" style={{ color: saved ? "#F7945B" : "#fff" }}>
          <Icon.Heart />
        </button>
        <button aria-label="Share"><Icon.Share /></button>
        <button aria-label="Print" onClick={() => window.print()}><Icon.Print /></button>
      </div>
      <div className="listing-hero__bottom">
        <div>
          <h1 className="listing-hero__title">{data.addr}</h1>
          <div className="listing-hero__crumb">{data.crumb}</div>
        </div>
        <div className="listing-hero__stats">
          <div className="listing-hero__stat">
            <div className="listing-hero__stat__l">BEDROOMS</div>
            <div className="listing-hero__stat__v">{data.bd} BD</div>
          </div>
          <div className="listing-hero__stat">
            <div className="listing-hero__stat__l">BATHROOMS</div>
            <div className="listing-hero__stat__v">{data.ba} BA</div>
          </div>
          <div className="listing-hero__stat" data-comment-anchor="3d838cfd9a-div-48-13">
            <div className="listing-hero__stat__l">LIST PRICE</div>
            <div className="listing-hero__stat__v listing-hero__stat__v--price">{data.price}</div>
          </div>
        </div>
      </div>
    </section>);

}

// --- Description + sidebar (Quick Statistics; price now lives in hero) ---
function ListingBody({ data }) {
  return (
    <section className="listing-body" data-screen-label="Listing Body">
      <div className="listing-body__grid">
        <div>
          <h2 className="listing-body__h listing-body__h--figma">{data.title}</h2>
          <div className="listing-body__rule listing-body__rule--figma" />
          <p className="listing-body__p listing-body__p--figma">{data.description}</p>
        </div>
        <aside className="aside-fl">
          <div className="aside-fl__h">QUICK STATISTICS</div>
          <div className="aside-fl__stats">
            <div className="aside-fl__row"><span className="aside-fl__row__l">Year Built</span><span className="aside-fl__row__v">{data.year}</span></div>
            <div className="aside-fl__row"><span className="aside-fl__row__l">Lot Size</span><span className="aside-fl__row__v">{data.lot}</span></div>
            <div className="aside-fl__row"><span className="aside-fl__row__l">Living Area</span><span className="aside-fl__row__v">{data.sqft} sq.ft.</span></div>
            <div className="aside-fl__row"><span className="aside-fl__row__l">Garage</span><span className="aside-fl__row__v">{data.garage}</span></div>
            <div className="aside-fl__row"><span className="aside-fl__row__l">View</span><span className="aside-fl__row__v">{data.view}</span></div>
          </div>
          <button className="aside-fl__cta">SCHEDULE A PRIVATE TOUR</button>
        </aside>
      </div>
    </section>);

}

// --- Lightbox ---
function Lightbox({ images, index, onClose, onIndex }) {
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, images.length, onClose, onIndex]);

  return (
    <div className="lb" onClick={onClose} role="dialog" aria-modal="true">
      <img className="lb__img" key={index} src={images[index]} alt={`Photo ${index + 1}`} onClick={(e) => e.stopPropagation()} />
      <button className="lb__close" onClick={onClose} aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <button className="lb__nav lb__nav--prev" onClick={(e) => {e.stopPropagation();onIndex((index - 1 + images.length) % images.length);}} aria-label="Previous">
        <Icon.ArrowLeft />
      </button>
      <button className="lb__nav lb__nav--next" onClick={(e) => {e.stopPropagation();onIndex((index + 1) % images.length);}} aria-label="Next">
        <Icon.ArrowRight />
      </button>
      <div className="lb__counter">{String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</div>
    </div>);

}

// --- Photo Filmstrip (single row, click to open lightbox) ---
function ListingGallery({ data }) {
  const [lightboxAt, setLightboxAt] = React.useState(null); // null | number
  const open = (i) => setLightboxAt(i);

  return (
    <section className="filmstrip-section" data-screen-label="Listing Gallery" data-comment-anchor="15ed9d011d-div-75-9">
      <div className="filmstrip-wrap">
        <div className="filmstrip__header">
          <div className="filmstrip__header__t">Property Gallery</div>
          <div className="filmstrip__header__c">{data.gallery.length} Photos · Scroll →</div>
        </div>
        <div className="filmstrip">
          {data.gallery.map((src, i) =>
          <div key={i} className="filmstrip__tile"
          style={{ backgroundImage: `url(${src})` }}
          onClick={() => open(i)} />
          )}
          <button className="filmstrip__cta" onClick={() => open(0)}>
            <div className="filmstrip__cta__t">View Full<br />Photo Gallery</div>
            <div className="filmstrip__cta__c">{data.gallery.length} PHOTOS →</div>
          </button>
        </div>
      </div>
      {lightboxAt !== null &&
      <Lightbox
        images={data.gallery}
        index={lightboxAt}
        onIndex={setLightboxAt}
        onClose={() => setLightboxAt(null)} />

      }
    </section>);

}

// --- Features & Amenities (4 cards) ---
const FEATURE_TABS = [
{
  h: "Interior",
  rows: [
  ["TOTAL BEDROOMS", "6"],
  ["TOTAL BATHROOMS", "6.5"],
  ["HALF BATHROOM", "1"],
  ["FLOORING", "Tile, Carpet"],
  ["FIREPLACE", "3"]]

},
{
  h: "Exterior",
  rows: [
  ["GARAGE SPACE", "4 Car Attached"],
  ["WATER SOURCE", "Public"],
  ["UTILITIES", "Fiber optic internet service provided by KT&T"],
  ["POOL", "Yes"],
  ["ROOF", "Clay tile"],
  ["HEAT TYPE", "Forced air, propane"]]

},
{
  h: "Area & Lot",
  rows: [
  ["STATUS", "For Sale"],
  ["LIVING AREA", "7,158 SQ.FT."],
  ["LOT AREA", "0.846 Acres"],
  ["TYPE", "Residential"],
  ["YEAR BUILT", "2001"],
  ["SCHOOL DISTRICT", "Incline Elementary School, Incline Middle School, Incline High School"]]

},
{
  h: "Financial / Market",
  rows: [
  ["SALES PRICE", "$10,850,000"],
  ["ANNUAL TAXES", "$54,372"],
  ["DAYS ON MARKET", "12"],
  ["BUYER AGENCY COMPENSATION", "2.5%"],
  ["YEAR LISTED", "2024"]]

}];


function FeaturesSection() {
  const [page, setPage] = React.useState(0);
  const visible = 3; // 3 wider cards visible at once
  const total = FEATURE_TABS.length;
  const maxPage = Math.max(0, total - visible);

  return (
    <section className="section--features" data-screen-label="Features & Amenities" style={{ backgroundColor: "rgb(240, 237, 232)" }}>
      <div className="features-wrap">
        <h2 className="features-h">Features &amp; Amenities Highlight</h2>
        <div className="features-viewport">
          <div className="features-track"
          style={{ transform: `translateX(calc(${-page} * (100% / ${visible}) - ${page} * 28px / ${visible}))` }}>
            {FEATURE_TABS.map((tab, i) =>
            <div key={i} className="feat-card">
                <div className="feat-card__h">{tab.h}</div>
                <div className="feat-card__list">
                  {tab.rows.map(([l, v], j) =>
                <div key={j} className="feat-card__row">
                      <span className="feat-card__row__l">{l}</span>
                      <span className="feat-card__row__v" style={{ width: "228px" }}>{v}</span>
                    </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="features-nav">
          <button className="features-nav__prev" onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous" disabled={page === 0}>
            <Icon.ArrowLeft />
          </button>
          <button className="features-nav__next" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} aria-label="Next" disabled={page === maxPage}>
            <Icon.ArrowRight />
          </button>
        </div>
      </div>
    </section>);

}

// --- Matterport 3D Tour ---
function MatterportSection({ data }) {
  return (
    <section style={{ padding: "0 0 96px" }} data-screen-label="Matterport 3D Tour">
      <div className="matterport">
        <div className="matterport__bg" style={{ backgroundImage: "url(assets/listing-3d-tour.png)" }} />
        <div className="matterport__inner">
          <div className="matterport__play">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#fff", marginLeft: 3 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h3 className="matterport__h">Experience {data.addr.split(" ").slice(0, 2).join(" ")} in 3D</h3>
          <p className="matterport__p">
            Take a virtual walk through every room of this stunning
            residence using our Matterport integration.
          </p>
          <button className="matterport__cta">Launch 3D Tour</button>
        </div>
      </div>
    </section>);

}

// --- The Local Perspective ---
function LocalPerspectiveSection({ data }) {
  return (
    <section className="section--local" data-screen-label="Local Perspective">
      <div className="local-card">
        <div className="local-card__copy">
          <div className="local-card__head">
            <div className="local-card__eyebrow">Where 35 Years Makes the Difference</div>
            <div className="local-card__title">The Local Perspective</div>
          </div>
          <div className="local-card__body">
            <p>{data.localPerspective}</p>
          </div>
          <div className="local-card__attr" style={{ color: "rgb(247, 148, 91)" }}>— GRANT C. MEYER</div>
        </div>
        <div className="local-card__photo" style={{ backgroundImage: "url(assets/listing-local-perspective.png)" }} />
      </div>
    </section>);

}

// --- The Guide Appears (Grant) ---
const GUIDE_CREDS = [
{ h: "35-Year Resident", p: "Unmatched local knowledge and community roots." },
{ h: "17 Years Realtor", p: "Navigating every market cycle since 2007." },
{ h: "Volume Leader", p: "Consistently ranked in the top 1% of Sierra agents." },
{ h: "Legal Training", p: "Expertise in complex zoning and water rights." }];


function GuideSection({ onContact }) {
  return (
    <section className="section--guide-fl" data-screen-label="The Guide">
      <div className="guide-fl">
        <div className="guide-fl__photo" style={{ backgroundImage: "url(assets/grant.jpg)" }} />
        <div className="guide-fl__copy">
          <div>
            <div className="guide-fl__eyebrow">Your Neighbor Before You Even Arrive.</div>
            <h2 className="guide-fl__name">Grant C. Meyer</h2>
          </div>
          <div className="guide-fl__creds">
            {GUIDE_CREDS.map((c, i) =>
            <div key={i} className="guide-fl__cred">
                <span className="guide-fl__cred__icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <div className="guide-fl__cred__h">{c.h}</div>
                  <div className="guide-fl__cred__p">{c.p}</div>
                </div>
              </div>
            )}
          </div>
          <p className="guide-fl__body">
            Grant doesn't just sell homes; he curates the Tahoe lifestyle. With a deep understanding of the
            local micro-climates, community nuances, and the intricate legal landscape of Lake Tahoe property,
            he provides a level of counsel that goes beyond the sale.
          </p>
          <button className="guide-fl__cta" onClick={onContact}>Let's Talk</button>
        </div>
      </div>
    </section>);

}

// --- Market Intelligence ---
function MarketIntelSection({ data }) {
  // Animate progress bar in on mount
  const [shown, setShown] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {if (e.isIntersecting) setShown(true);}, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const barHeights = [40, 55, 80, 60, 35]; // last bar in figma = peak (3rd), orange
  return (
    <section ref={ref} className="section--market" data-screen-label="Market Intelligence">
      <div className="market-card">
        <div className="market-card__top">
          <h3 className="market-card__h">Market Intelligence: {data.crumb.split(" ")[0] === "LAKESHORE" ? "Mill Creek" : data.crumb.split(" ").slice(0, 2).join(" ")}</h3>
          <div className="market-card__chip">Q3 2024</div>
        </div>
        <p className="market-card__desc">
          Lake-view single family homes in Incline Village held 93–97% of their 2022 peak value through the
          2023 correction — significantly outperforming the broader Washoe County market. This price band
          had fewer than 8 sales in the past 12 months, making accurate valuation highly dependent on local market knowledge.
        </p>
        <div className="market-card__metrics">
          <div className="metric">
            <div className="metric__head">
              <div className="metric__label">AVG. LIST-TO-SALE RATIO</div>
              <div className="metric__v">98.2%</div>
            </div>
            <div className="metric__bar">
              <div className="metric__bar__fill" style={{ width: shown ? "98.2%" : "0%" }} />
            </div>
            <div className="metric__note">Properties in this area consistently hold their value within 2% of asking.</div>
          </div>
          <div className="metric">
            <div className="metric__head">
              <div className="metric__label">AVG. DAYS ON MARKET</div>
              <div className="metric__v">42 Days</div>
            </div>
            <div className="metric__bars">
              {barHeights.map((h, i) =>
              <div key={i}
              className={"metric__bars__b" + (i === 2 ? " is-peak" : "")}
              style={{ height: shown ? `${h}%` : "0%", transitionDelay: `${i * 80}ms` }} />
              )}
            </div>
            <div className="metric__note">Mill Creek luxury inventory remains highly sought after with fast turnarounds.</div>
          </div>
        </div>
      </div>
    </section>);

}

// --- Community Insights (dark) ---
const COMMUNITY_ROWS = [
{ h: "Waterfront Lifestyle", p: "Direct access to the village's most tranquil beaches and recreation centers." },
{ h: "Tax Benefits", p: "Experience the financial advantage of Nevada residency in a luxury setting." },
{ h: "Village Access", p: "Five-minute walk to world-class dining and high-end boutique shopping." }];


function CommunityInsightsSection({ data }) {
  return (
    <section className="section--community" data-screen-label="Community Insights">
      <div className="community">
        <div className="community__copy">
          <div>
            <div className="community__head">
              <div className="community__eyebrow">{data.crumb}</div>
              <div className="community__title">Community Insights</div>
            </div>
          </div>
          <div className="community__body">
            <p>
              The Lakeshore Corridor is Incline Village's most sought-after stretch — direct lake frontage
              properties here rarely come available more than once or twice per year. This particular block
              has a slightly quieter character than the central Lakeshore sections because the road narrows
              north of Ski Way, deterring casual through traffic.
            </p>
            <p>
              HOA here is managed by the Incline Village General Improvement District (IVGID), which gives
              owners access to all four private beaches, the Championship Golf Course, and the Diamond Peak
              ski pass program. These aren't available to renters or non-owner guests.
            </p>
          </div>
          <div className="community__rows">
            {COMMUNITY_ROWS.map((r, i) =>
            <div key={i} className="community__row">
                <span className="community__row__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <div className="community__row__h">{r.h}</div>
                  <div className="community__row__p">{r.p}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="community__map">
          <div className="community__map__img" style={{ backgroundImage: "url(assets/listing-neighborhood-map.png)" }} />
          <div className="community__map__pin" />
        </div>
      </div>
    </section>);

}

Object.assign(window, {
  ListingHero, ListingBody, ListingGallery, FeaturesSection,
  MatterportSection, LocalPerspectiveSection, GuideSection,
  MarketIntelSection, CommunityInsightsSection
});