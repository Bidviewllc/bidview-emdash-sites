// ===== Home Page =====
const FEATURED_PROPS = [
{ id: "1056", addr: "1056 Lakeshore Boulevard", meta: "6 BD | 7 BA | 7,158 SQ.FT.", price: "$10,850,000", tag: "RESIDENTIAL", img: "assets/listing-1056.jpg" },
{ id: "701", addr: "701 Cristina Drive", meta: "5 BD | 5 BA | 4,210 SQ.FT.", price: "$4,675,000", tag: "RESIDENTIAL", img: "assets/listing-interior-2.jpg" },
{ id: "989", addr: "989 Tahoe Boulevard #61", meta: "3 BD | 2 BA | 1,840 SQ.FT.", price: "$922,000", tag: "CONDOMINIUM", img: "assets/listing-interior-4.jpg" }];


const TESTIMONIALS = [
{
  q: "Grant's knowledge of Incline Village is encyclopedic. He knew about our dream home before it even hit the market, allowing us to secure it in a cash-only bidding war.",
  name: "The Harrison Family",
  loc: "LAKESHORE BOULEVARD"
},
{
  q: "Selling a property we had owned for 40 years was emotional. Grant handled the transition with such dignity and achieved a price that far exceeded our expectations.",
  name: "Dr. Robert Chen",
  loc: "TYNER WAY"
},
{
  q: "Navigating the TRPA requirements and water rights was daunting until Grant stepped in. His legal background and local connections saved us months of delay.",
  name: "Sarah & James Miller",
  loc: "CRYSTAL BAY"
}];


const MICRO_MARKETS = [
{
  name: "Eastern Slopes",
  desc: "Defined by its dramatic sunrises and tax-friendly environment, the Eastern Slopes represent the pinnacle of Nevada luxury. Here, mountain architecture meets unparalleled lake vistas in a series of highly private, gated communities.",
  avgPrice: "$4.2M",
  trend: "Limited",
  pin: { x: 64, y: 38 }
},
{
  name: "Lakeshore",
  desc: "The crown jewel of the Tahoe basin — Lakeshore Boulevard estates command the longest sunset views in the Sierras. Walkable to private beaches and the Lone Eagle, these properties hold value better than any micro-market in the West.",
  avgPrice: "$8.6M",
  trend: "Tight Hold",
  pin: { x: 36, y: 64 }
},
{
  name: "Crystal Bay",
  desc: "The state line itself bisects this peninsula, creating one of America's most strategic real-estate boundaries. Crystal Bay offers a hideaway feel with proximity to both Hyatt and Tahoe Vista.",
  avgPrice: "$3.1M",
  trend: "Emerging",
  pin: { x: 22, y: 22 }
},
{
  name: "Mountain Bench",
  desc: "Mid-elevation neighborhoods like Tyner Way and Robin Hood Drive deliver alpine privacy without sacrificing access. Architect-built homes here favor steel, stone and floor-to-ceiling glass.",
  avgPrice: "$2.4M",
  trend: "Active",
  pin: { x: 78, y: 70 }
}];


const BLOG_POSTS = [
{
  title: "The Shift Toward Off-Market Transactions in Incline Village",
  excerpt: "In a market defined by privacy, many of Tahoe's most significant estates never see a public listing. Here is why the \"Quiet Sale\" is becoming…",
  byline: "GRANT C. MEYER",
  date: "MAY 12, 2024 • 6 MIN READ",
  img: "assets/listing-interior-3.jpg"
},
{
  title: "Navigating TRPA: Building Your Dream Home by the Lake",
  excerpt: "Understanding the Tahoe Regional Planning Agency's regulations is the first hurdle for any new developer. We break down the essentials of…",
  byline: "SARAH MILLER",
  date: "APRIL 28, 2024 • 8 MIN READ",
  img: "assets/gallery-1.jpg"
},
{
  title: "Tax Efficiency: The Hidden Value of the Nevada Side",
  excerpt: "Why the \"State Line\" is the most important boundary in Tahoe. An analysis of the significant financial advantages of primary residency in…",
  byline: "GRANT C. MEYER",
  date: "APRIL 15, 2024 • 5 MIN READ",
  img: "assets/listing-interior-1.jpg"
}];


function PropCard({ p, navigate }) {
  return (
    <article className="prop-card" onClick={() => navigate("listing", { id: p.id })}>
      <div className="prop-card__media">
        <div className="prop-card__img" style={{ backgroundImage: `url(${p.img})` }} />
        <div className="prop-card__tag">{p.tag}</div>
      </div>
      <div className="prop-card__body">
        <h3 className="prop-card__addr">{p.addr}</h3>
        <div className="prop-card__meta">{p.meta}</div>
        <div className="prop-card__price">{p.price}</div>
        <div className="prop-card__cta" style={{ color: "rgb(28, 48, 80)" }}>SEE DETAILS →</div>
      </div>
    </article>);

}

function Home({ navigate, emotionLayout = "centered", emotionPosition = "inline" }) {
  const [microIdx, setMicroIdx] = React.useState(0);
  const micro = MICRO_MARKETS[microIdx];
  const emotion = <EmotionalSection layout={emotionLayout} />;

  return (
    <div className="page-fade">
      {/* HERO */}
      <section className="hero" data-screen-label="01 Hero">
        <div className="hero__img" />
        <div className="hero__veil" data-comment-anchor="8325bb7b5f-div-107-9" />
        <div className="hero__copy">
          <h1 className="hero__title">The View From Here <em>Changes Everything.</em></h1>
          <p className="hero__sub">
            Falling in love with Lake Tahoe is easy. Finding the right home in
            a market this unique… that's where it gets interesting.
          </p>
        </div>
      </section>

      {/* SECTION 2 — Reality Check */}
      <section className="section section--dark" data-screen-label="02 Reality Check">
        <div className="container reality">
          <div>
            <h2 className="reality__h">Incline Village Isn't Like Any Market You've Bought In Before.</h2>
            <p className="reality__p">
              Tahoe real estate operates on its own set of rules. The luxury segment here is defined by
              low turnover, high privacy, and a pace that catches outsiders off guard. Professionalism here
              isn't just about sales — it's about survival.
            </p>
            <a className="reality__link" href="#">
              VIEW MARKET INTELLIGENCE <Icon.ArrowRight />
            </a>
          </div>
          <div className="stats">
            <div className="stat" style={{ borderStyle: "solid", borderWidth: "0px 0px 0px 1px", borderColor: "rgba(247, 148, 91, 0.5)" }}>
              <div className="stat__num">11+ Months</div>
              <div className="stat__label">AVERAGE DAYS ON MARKET</div>
              <div className="stat__desc">Luxury homes often wait for the perfect buyer. Patience is as critical as the price tag.</div>
            </div>
            <div className="stat" style={{ borderWidth: "0px 0px 0px 1px", borderColor: "rgba(247, 148, 91, 0.5)" }}>
              <div className="stat__num">~50%</div>
              <div className="stat__label">CASH PURCHASES</div>
              <div className="stat__desc">Competition is fierce. Half of all transactions are liquidity-driven, requiring rapid negotiation.</div>
            </div>
            <div className="stat" style={{ borderWidth: "0px 0px 0px 1px", borderColor: "rgba(247, 148, 91, 0.5)" }}>
              <div className="stat__num">20–40%</div>
              <div className="stat__label">ONLINE VALUATION INACCURACY</div>
              <div className="stat__desc">Algorithm-based estimates fail to account for Tahoe's specific micro-locations and lot features.</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Emotional Weight (inline position) */}
      {emotionPosition === "inline" && emotion}

      {/* SECTION 4 — The Guide */}
      <section className="section section--beige" data-screen-label="04 The Guide">
        <div className="container guide">
          <div className="guide__photo">
            <div className="guide__img" />
            <div className="guide__name">Grant C. Meyer</div>
          </div>
          <div className="guide__copy">
            <div className="eyebrow">YOUR NEIGHBOR BEFORE YOU EVEN ARRIVE</div>
            <h2 className="guide__h">This Is Where 35 Years Makes the Difference.</h2>
            <div className="guide__creds">
              <div className="cred">
                <div className="cred__icon"><Icon.Check size={14} /></div>
                <div>
                  <div className="cred__t">35-Year Resident</div>
                  <div className="cred__d">Unmatched local knowledge and community roots</div>
                </div>
              </div>
              <div className="cred">
                <div className="cred__icon"><Icon.Check size={14} /></div>
                <div>
                  <div className="cred__t">17 Years Realtor</div>
                  <div className="cred__d">Navigating every market cycle since 2007.</div>
                </div>
              </div>
              <div className="cred">
                <div className="cred__icon"><Icon.Check size={14} /></div>
                <div>
                  <div className="cred__t">Volume Leader</div>
                  <div className="cred__d">Consistently ranked in the top 1% of Sierra agents.</div>
                </div>
              </div>
              <div className="cred">
                <div className="cred__icon"><Icon.Check size={14} /></div>
                <div>
                  <div className="cred__t">Legal Training</div>
                  <div className="cred__d">Expertise in complex zoning and water rights.</div>
                </div>
              </div>
            </div>
            <p className="guide__p">
              Grant doesn't just sell homes; he curates the Tahoe lifestyle. With a deep understanding
              of the local micro-climates, community nuances, and the intricate legal landscape of Lake
              Tahoe property, he provides a level of counsel that goes beyond the sale.
            </p>
            <button className="btn btn--dark" style={{ alignSelf: "flex-start", marginTop: 8 }}>
              READ THE FULL STORY
            </button>
          </div>
        </div>

        {/* Logos strip */}
        <div className="container logos-strip">
          <div className="logos-strip__h">Nice Headline About Benefit of These Logos</div>
          <div className="h-rule" />
          <div className="logos-strip__row">
            <div className="logo-chip">
              <svg width="42" height="42" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="#15243B" strokeWidth="2" />
                <text x="40" y="46" fontSize="22" fill="#15243B" textAnchor="middle" fontFamily="serif" fontWeight="600">CB</text>
              </svg>
            </div>
            <div className="logo-chip" style={{ fontFamily: "serif", fontSize: 12, letterSpacing: "0.18em", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>LUXURY</div>
                <div style={{ fontSize: 9, letterSpacing: "0.3em", marginTop: 4 }}>PORTFOLIO INTL.</div>
              </div>
            </div>
            <div className="logo-chip">
              <svg width="80" height="44" viewBox="0 0 100 50">
                <rect x="4" y="4" width="42" height="42" fill="#15243B" />
                <text x="25" y="32" fontSize="20" fill="#F7945B" textAnchor="middle" fontFamily="serif" fontWeight="700">R</text>
                <text x="70" y="32" fontSize="14" fill="#15243B" textAnchor="middle" fontFamily="serif" fontWeight="600">REALTOR®</text>
              </svg>
            </div>
            <div className="logo-chip" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect width="32" height="32" fill="#15243B" />
                <text x="16" y="22" fontSize="16" fill="#F7945B" textAnchor="middle" fontFamily="serif" fontWeight="700">IV</text>
              </svg>
              <div style={{ fontSize: 9, lineHeight: 1.3, fontWeight: 700, color: "#15243B", textAlign: "left" }}>
                INCLINE<br />VILLAGE<br />REALTORS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — The Proof */}
      <section className="section section--white" data-screen-label="05 The Proof">
        <div className="container">
          <div className="section-title">
            <h2>Hundreds of Clients. Thousands of Negotiations. One Market.</h2>
            <p>From first-time Tahoe buyers to clients who've completed 23 transactions together,
            the proof is in the relationships, not the brochures.</p>
          </div>
          <div className="testimonials">
            {TESTIMONIALS.map((t, i) =>
            <div className="testimonial" key={i}>
                <div className="stars">
                  {Array.from({ length: 5 }).map((_, j) => <Icon.Star key={j} />)}
                </div>
                <p className="testimonial__q">"{t.q}"</p>
                <div className="testimonial__attr">
                  <div className="testimonial__name">{t.name}</div>
                  <div className="testimonial__loc">{t.loc}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 6 — Invitation (Contact) */}
      <ContactSection id="contact-1" />

      {/* SECTION 3 (moved) — Emotional Weight after the Contact form */}
      {emotionPosition === "afterReview" && emotion}

      {/* SECTION 7 — Featured Listings */}
      <section className="section section--white" data-screen-label="07 Featured Listings">
        <div className="container">
          <div className="section-title">
            <h2>Featured Listings</h2>
            <p>Curated selections of the finest estates currently available in the Incline Village market.</p>
          </div>
          <div className="props">
            {FEATURED_PROPS.map((p) => <PropCard key={p.id} p={p} navigate={navigate} />)}
          </div>
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <button className="btn btn--dark" onClick={() => navigate("listings")}>
              VIEW ALL LISTINGS <Icon.ArrowRight color="currentColor" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 8 — Micro-Markets */}
      <section className="section section--dark" style={{ position: "relative", overflow: "hidden" }} data-screen-label="08 Micro-Markets">
        {/* Decorative wave from figma */}
        <div style={{
          position: "absolute",
          right: 0, top: "50%",
          transform: "translateY(-50%)",
          width: 427, height: 910,
          opacity: 0.1,
          color: "var(--orange)",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40
        }}>
          <img src="assets/decoration-wave.svg" alt="" style={{ width: "100%", color: "currentColor" }} />
          <img src="assets/decoration-wave.svg" alt="" style={{ width: "100%", transform: "translateY(-40px)" }} />
        </div>
        <div className="container">
          <div className="section-title on-dark">
            <span className="eyebrow">NEIGHBORHOOD INTELLIGENCE</span>
            <h2>Explore Tahoe's Micro-Markets</h2>
          </div>
          <div className="micro">
            <div className="micro__map">
              <div className="micro__map__img" />
              {MICRO_MARKETS.map((m, i) =>
              <button key={m.name}
              className={"micro__pin " + (i === microIdx ? "active" : "")}
              style={{ left: `${m.pin.x}%`, top: `${m.pin.y}%` }}
              onClick={() => setMicroIdx(i)}
              aria-label={m.name} />

              )}
              <div style={{
                position: "absolute",
                left: 24, bottom: 24,
                color: "rgba(255,255,255,0.6)",
                fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase"
              }}>
                LAKE TAHOE · NEVADA SIDE
              </div>
            </div>
            <div className="micro__content">
              <h3 className="micro__h" style={{ borderWidth: "0px 0px 0px 2px" }}>{micro.name}</h3>
              <p className="micro__p">{micro.desc}</p>
              <div className="micro__stats">
                <div>
                  <div className="micro__stat__label">AVERAGE PRICE</div>
                  <div className="micro__stat__v">{micro.avgPrice}</div>
                </div>
                <div>
                  <div className="micro__stat__label">INVENTORY TREND</div>
                  <div className="micro__stat__v">{micro.trend}</div>
                </div>
              </div>
              <a className="reality__link micro__cta" href="#">
                LEARN MORE <Icon.ArrowRight />
              </a>
            </div>
          </div>
          <div className="micro__nav">
            <button className="btn btn--icon btn--ghost" onClick={() => setMicroIdx((microIdx - 1 + MICRO_MARKETS.length) % MICRO_MARKETS.length)}>
              <Icon.ArrowLeft />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
              {MICRO_MARKETS.map((_, i) =>
              <button key={i} onClick={() => setMicroIdx(i)} style={{
                width: i === microIdx ? 22 : 6, height: 6, borderRadius: 3,
                background: i === microIdx ? "#F7945B" : "rgba(255,255,255,0.3)",
                transition: "all 200ms ease"
              }} />
              )}
            </div>
            <button className="btn btn--icon" style={{ background: "#F7945B" }} onClick={() => setMicroIdx((microIdx + 1) % MICRO_MARKETS.length)}>
              <Icon.ArrowRight color="#fff" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 9 — Market Insights (Blog) */}
      <section className="section section--cream" data-screen-label="09 Market Insights">
        <div className="container">
          <div className="section-title">
            <h2 style={{ fontSize: 60 }}>Market Insights</h2>
            <p>Expert perspectives on the evolving landscape of Lake Tahoe luxury real estate,
            community lifestyle, and investment trends.</p>
          </div>
          <div className="blog">
            {BLOG_POSTS.map((b, i) =>
            <article className="blog-card" key={i}>
                <div className="blog-card__media" style={{ backgroundImage: `url(${b.img})` }} />
                <div className="blog-card__meta">MARKET ANALYSIS</div>
                <h3 className="blog-card__h">{b.title}</h3>
                <p className="blog-card__p">{b.excerpt}</p>
                <a href="#" className="blog-card__cta">READ ARTICLE →</a>
                <div className="blog-card__byline">
                  <div className="blog-card__avatar" />
                  <div>
                    <div className="blog-card__byline__t">{b.byline}</div>
                    <div className="blog-card__byline__d">{b.date}</div>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 10 — Second Invitation */}
      <ContactSection id="contact-2" />
    </div>);

}

Object.assign(window, { Home, FEATURED_PROPS });