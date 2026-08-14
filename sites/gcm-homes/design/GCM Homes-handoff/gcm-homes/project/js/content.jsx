// ===== Generic content pages (Buyers, Sellers, About, Community, Concierge) =====
const PAGE_CONTENT = {
  buyers: {
    eyebrow: "FOR BUYERS",
    title: "Quiet Access to Tahoe's Most Coveted Estates.",
    lead: "Many of the most significant properties in Incline Village never see a public listing. Grant's network surfaces them first.",
    sections: [
      { h: "Off-Market Inventory", p: "Direct access to properties before they hit Compass or MLS — from generational lakefront homes to ski-in mountain estates." },
      { h: "Discreet Representation", p: "Buyer agency that prioritizes your privacy. NDA-backed showings, blind offers when appropriate." },
      { h: "Local Legal Counsel", p: "Tahoe-specific zoning, water-rights, and TRPA permitting handled before they become deal-killers." },
      { h: "Resident Concierge", p: "We help with property managers, contractors, IVGID enrollment, and the hundred small things between purchase and possession." },
    ],
  },
  sellers: {
    eyebrow: "FOR SELLERS",
    title: "A Sale Designed Around Your Life, Not Just the Listing.",
    lead: "Selling Tahoe property is personal. Our process is tailored for sellers who care as much about who buys it as what it sells for.",
    sections: [
      { h: "Quiet Sale Specialty", p: "Off-market positioning that protects your privacy and the property's storyline." },
      { h: "Pre-Listing Strategy", p: "Selective staging, photography, and a calibrated price ladder — built around comparable transactions, not algorithms." },
      { h: "Buyer Vetting", p: "Cash-pre-approval verification, intentions discussion, and lifestyle-fit conversations before a single showing." },
      { h: "International Reach", p: "Coldwell Banker Global Luxury network places your home in front of the right buyers in Aspen, Jackson, and Park City." },
    ],
  },
  community: {
    eyebrow: "THE COMMUNITY",
    title: "Incline Village — More Than An Address.",
    lead: "A snapshot of the lifestyle, the seasons, and the small details that make Tahoe's north shore unlike anywhere else.",
    sections: [
      { h: "Diamond Peak", p: "A private ski mountain, walkable from much of the village, with the best lake-view runs in the Sierras." },
      { h: "Private Beaches", p: "Three IVGID-only beaches — Burnt Cedar, Incline, Ski Beach — accessible to residents and their guests." },
      { h: "East Shore Trail", p: "A six-mile bike-and-walk corridor along the Nevada coastline of Lake Tahoe." },
      { h: "Year-Round Calendar", p: "From the Concours d'Elegance in August to the Snowfest Parade in March — a tight social calendar without the crowds of South Lake." },
    ],
  },
  concierge: {
    eyebrow: "TAHOE CONCIERGE",
    title: "Beyond the Closing Table.",
    lead: "Our work doesn't end at signing. The Grant C. Meyer Concierge is a private extension of our service for current and former clients.",
    sections: [
      { h: "Property Care", p: "Trusted handymen, snow removal, lake-house openings, and seasonal preparation — all on speed dial." },
      { h: "Membership Curation", p: "Country club introductions, Olympic Club references, Lone Eagle, Lakeside Beach." },
      { h: "Tax & Residency", p: "Coordination with CPAs on Nevada-resident status, Williams Equity transitions, and trust planning." },
      { h: "Discreet Recommendations", p: "Architects, designers, art consultants, household staff — vetted through 35 years on the lake." },
    ],
  },
  about: {
    eyebrow: "ABOUT GRANT",
    title: "Three Decades. One Lake. Thousands of Conversations.",
    lead: "From a 16-year-old part-time ski instructor at Diamond Peak to one of the most consistently top-ranked Sierra agents, Grant has built his career on a single bet: that knowing your client matters more than knowing the market.",
    sections: [
      { h: "Roots", p: "Born in Reno. Family moved to Incline in 1989. Helped run his grandfather's small fly-fishing outfit on the East Shore — that's where the relationships started." },
      { h: "Training", p: "JD from McGeorge School of Law, real-estate-focused. Practiced for four years before moving into agency in 2007." },
      { h: "Philosophy", p: "\"You don't sell Tahoe by selling Tahoe. You sell it by listening for what someone is actually looking for, and then quietly finding it.\"" },
      { h: "Recognition", p: "Coldwell Banker International Society of Excellence, six consecutive years. Top 1% of Sierra agents by volume." },
    ],
  },
};

function ContentPage({ slug, navigate }) {
  const data = PAGE_CONTENT[slug];
  React.useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  if (!data) return <div style={{ padding: 200, textAlign: "center" }}>Coming soon.</div>;

  return (
    <div className="page-fade">
      <section className="listings-page-hero" data-screen-label={"Page " + slug}>
        <span className="eyebrow">{data.eyebrow}</span>
        <h1 style={{ marginTop: 16, maxWidth: 880, marginLeft: "auto", marginRight: "auto" }}>{data.title}</h1>
        <p>{data.lead}</p>
      </section>

      <section className="section section--cream">
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 56 }}>
          {data.sections.map((s, i) => (
            <div key={i} style={{
              background: "var(--white)",
              padding: "44px 40px",
              borderRadius: 6,
              border: "1px solid rgba(197,198,206,0.4)",
              boxShadow: "0 8px 16px -12px rgba(0,0,0,0.08)",
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 40, width: 40, height: 3, background: "var(--orange)",
              }} />
              <div className="eyebrow" style={{ fontSize: 11, marginTop: 12 }}>0{i + 1}</div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 32, color: "var(--navy)", margin: "12px 0 16px", lineHeight: 1.1 }}>
                {s.h}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--body)" }}>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      <ContactSection id={"content-contact-" + slug} />
    </div>
  );
}

Object.assign(window, { ContentPage, PAGE_CONTENT });
