// ===== Featured Listing detail page =====
const LISTING_DATA = {
  "1056": {
    addr: "1056 Lakeshore Boulevard",
    crumb: "LAKESHORE NEIGHBORHOOD",
    title: "Beautiful Residential Home in Mill Creek",
    price: "$10,850,000",
    bd: 6, ba: 7, sqft: "7,158",
    lot: "0.86 Acres",
    garage: "4 Car Attached",
    view: "Lakefront/Mountain",
    year: 2001,
    hero: "assets/listing-hero-exterior.jpg",
    gallery: [
      "assets/listing-interior-1.jpg",
      "assets/listing-interior-2.jpg",
      "assets/listing-interior-3.jpg",
      "assets/listing-interior-4.jpg",
      "assets/gallery-1.jpg",
    ],
    description: `Built in 2001, exceptional craftsmanship awaits on the quiet side of Lakeshore Blvd. A wonderful open floorplan offering 6 en-suite bedrooms, or 5 bedrooms plus an office, is great for large families or work-from-home flex space. Grand in scale yet warm and inviting, no detail overlooked. A generous-sized bonus room offers theater-style enjoyment and radiant heat flooring, keeping it cozy year-round. The gourmet kitchen boasts stainless steel appliances, 3 ovens, a warming drawer, a Wolf professional-grade gas range, 2 dishwashers, and dual Sub-Zero refrigerators and freezers, making entertaining seamless. Set on a picturesque 1/2+ lot, with a heated driveway and walkway, this gated lower lake level home is conveniently located near IVGID's resident-only beaches, the Rec Center, Pickleball & Tennis facility, and steps from the scenic East Shore Trail. A timeless design offers modern amenities in a prime and often rare-to-find, location!`,
    localPerspective: `This one sits on a cul-de-sac that most buyers drive past without realizing it dead-ends here — so you get none of the through traffic you'd expect on a Lakeshore address. The south-facing deck gets direct sun until past 7pm in summer, which is genuinely rare at this elevation. The previous owners added hydronic radiant floor heat throughout — that's a $40,000 upgrade you won't see in the listing description, but you'll absolutely notice it the first winter.`,
  },
  "701": {
    addr: "701 Cristina Drive",
    crumb: "TYNER WAY",
    title: "Mountain-Modern Retreat with Lake Views",
    price: "$4,675,000",
    bd: 5, ba: 5, sqft: "4,210",
    lot: "0.41 Acres",
    garage: "3 Car Attached",
    view: "Mountain/Lake",
    year: 2018,
    hero: "assets/listing-interior-2.jpg",
    gallery: [
      "assets/listing-interior-3.jpg",
      "assets/listing-interior-4.jpg",
      "assets/listing-interior-1.jpg",
      "assets/listing-1056.jpg",
    ],
    description: `A 2018 mountain-modern statement perched above Incline Village. Floor-to-ceiling glass frames Diamond Peak and the eastern lake basin. Five well-appointed bedrooms, a chef's kitchen with Wolf and Miele, and a great room anchored by a stone hearth.`,
    localPerspective: `Tyner Way sits on a south-facing bench above the village — you're 200 vertical feet higher than the lake, which gives this property an extra two weeks of usable shoulder-season weather on both ends. Locals know the bus route stops at the bottom of the cul-de-sac, which means ski-day access without parking battles.`,
  },
  "989": {
    addr: "989 Tahoe Boulevard #61",
    crumb: "INCLINE VILLAGE CORE",
    title: "Walkable Condominium Near Diamond Peak",
    price: "$922,000",
    bd: 3, ba: 2, sqft: "1,840",
    lot: "—",
    garage: "1 Car",
    view: "Forested",
    year: 1995,
    hero: "assets/listing-interior-4.jpg",
    gallery: ["assets/listing-interior-1.jpg", "assets/listing-interior-3.jpg", "assets/listing-1056.jpg"],
    description: `A turnkey 3-bedroom condominium on Tahoe Blvd, minutes from Diamond Peak Ski Resort and Burnt Cedar Beach. Recently updated kitchen and baths; full IVGID privileges convey.`,
    localPerspective: `Unit 61 in this building faces the back of the complex, which means no headlights through your living room from the boulevard. The HOA finally repaved last fall — most owners don't know that bumped the assessment up only $40/month, which is a steal for what it covers.`,
  },
};

function ListingDetail({ id, navigate, showGallery, showMatterport }) {
  const data = LISTING_DATA[id] || LISTING_DATA["1056"];
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => { window.scrollTo(0, 0); }, [id]);

  return (
    <div className="page-fade">
      <ListingHero data={data} saved={saved} setSaved={setSaved} />
      <ListingBody data={data} />
      {showGallery && <ListingGallery data={data} />}
      <FeaturesSection />
      {showMatterport && <MatterportSection data={data} />}
      <LocalPerspectiveSection data={data} />
      <GuideSection onContact={() => navigate("contact")} />
      <MarketIntelSection data={data} />
      <CommunityInsightsSection data={data} />
      <ContactSection id="listing-contact" />
    </div>
  );
}

Object.assign(window, { ListingDetail, LISTING_DATA });
