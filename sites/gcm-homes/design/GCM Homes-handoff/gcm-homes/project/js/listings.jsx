// ===== Listings Index Page =====
const ALL_LISTINGS = [
  { id: "1056", addr: "1056 Lakeshore Boulevard", meta: "6 BD | 7 BA | 7,158 SQ.FT.", price: "$10,850,000", tag: "RESIDENTIAL", img: "assets/listing-1056.jpg", neighborhood: "Lakeshore" },
  { id: "701",  addr: "701 Cristina Drive", meta: "5 BD | 5 BA | 4,210 SQ.FT.", price: "$4,675,000", tag: "RESIDENTIAL", img: "assets/listing-interior-2.jpg", neighborhood: "Tyner Way" },
  { id: "989",  addr: "989 Tahoe Boulevard #61", meta: "3 BD | 2 BA | 1,840 SQ.FT.", price: "$922,000", tag: "CONDOMINIUM", img: "assets/listing-interior-4.jpg", neighborhood: "Incline Core" },
  { id: "433",  addr: "433 Robin Hood Drive", meta: "4 BD | 4 BA | 3,420 SQ.FT.", price: "$3,295,000", tag: "RESIDENTIAL", img: "assets/listing-interior-1.jpg", neighborhood: "Mountain Bench" },
  { id: "188",  addr: "188 Crystal Bay Loop", meta: "4 BD | 3 BA | 2,890 SQ.FT.", price: "$2,150,000", tag: "RESIDENTIAL", img: "assets/listing-interior-3.jpg", neighborhood: "Crystal Bay" },
  { id: "915",  addr: "915 Country Club Drive", meta: "5 BD | 6 BA | 5,640 SQ.FT.", price: "$6,890,000", tag: "RESIDENTIAL", img: "assets/gallery-1.jpg", neighborhood: "Eastern Slopes" },
];

const FILTERS = ["All Properties", "Lakeshore", "Crystal Bay", "Eastern Slopes", "Mountain Bench", "Under $5M", "Over $5M"];

function Listings({ navigate }) {
  const [filter, setFilter] = React.useState("All Properties");
  const [sortBy, setSortBy] = React.useState("Featured");

  const filtered = ALL_LISTINGS.filter((p) => {
    if (filter === "All Properties") return true;
    if (filter === "Under $5M") return parseInt(p.price.replace(/\D/g, "")) < 5000000;
    if (filter === "Over $5M") return parseInt(p.price.replace(/\D/g, "")) >= 5000000;
    return p.neighborhood === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Price ↑") return parseInt(a.price.replace(/\D/g, "")) - parseInt(b.price.replace(/\D/g, ""));
    if (sortBy === "Price ↓") return parseInt(b.price.replace(/\D/g, "")) - parseInt(a.price.replace(/\D/g, ""));
    return 0;
  });

  React.useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="page-fade">
      <section className="listings-page-hero" data-screen-label="Listings Hero">
        <span className="eyebrow">CURATED LAKE TAHOE PROPERTIES</span>
        <h1 style={{ marginTop: 16 }}>Current Listings</h1>
        <p>From lakefront estates to mountain retreats — every property here has been hand-selected by Grant.</p>
      </section>

      <div className="listings-filters">
        {FILTERS.map((f) => (
          <button key={f} className={"chip " + (f === filter ? "active" : "")} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase" }}>SORT</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  style={{ padding: "8px 14px", border: "1px solid rgba(21,36,59,0.18)", background: "white", fontSize: 13, color: "var(--navy)", borderRadius: 999, fontFamily: "inherit", cursor: "pointer" }}>
            <option>Featured</option>
            <option>Price ↑</option>
            <option>Price ↓</option>
          </select>
        </div>
      </div>

      <div className="listings-grid">
        {sorted.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 64, color: "var(--muted)" }}>
            No properties match the current filter.
          </div>
        ) : (
          sorted.map((p) => <PropCard key={p.id} p={p} navigate={navigate} />)
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Listings, ALL_LISTINGS });
