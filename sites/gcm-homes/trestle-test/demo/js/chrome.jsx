// ===== Top Nav =====
function Nav({ page, navigate }) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [page]);

  // Nav is always solid (cream bg + navy text + full-color logo) per Liz's note
  const navClass = "nav";

  // Real hrefs, so links are crawlable, middle-clickable and hoverable-with-a-
  // status-bar like any normal site. onClick keeps SPA navigation instant.
  const links = [
    ["Listings", "/listings/"],   // separate document — no navigate()
    ["Buyers", "buyers"],
    ["Sellers", "sellers"],
    ["The Community", "community"],
    ["Concierge", "concierge"],
    ["About", "about"],
  ];

  return (
    <header className={navClass}>
      <div className="nav__inner">
        <a className="nav__logo" href="/" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
          <img src="/assets/logo.png" alt="Grant C. Meyer Homes" />
        </a>
        <nav className="nav__links">
          {links.map(([label, key]) => (
            key.startsWith("/")
              ? <a key={key} className="nav__link" href={key}>{label}</a>
              : <a key={key} className="nav__link" href={PAGE_PATHS[key]}
                   onClick={(e) => { e.preventDefault(); navigate(key); }}>{label}</a>
          ))}
        </nav>
        <a className="btn btn--orange" href={PAGE_PATHS.contact}
           onClick={(e) => { e.preventDefault(); navigate("contact"); }}>
          INQUIRE NOW
        </a>
      </div>
    </header>
  );
}

// ===== Footer =====
// Only links with somewhere real to go. The previous footer carried 14 dead
// href="#" links (Blog, Home Valuation, Sellers Guide, Terms, Privacy, socials…)
// pointing at content that does not exist — they read as broken to a visitor.
// Add each back when the page behind it exists.
function Footer({ navigate }) {
  const spaLink = (label, key) => (
    <a href={PAGE_PATHS[key]} onClick={(e) => { e.preventDefault(); navigate(key); }}>{label}</a>
  );

  return (
    <footer className="footer">
      <div className="footer__cols">
        <div className="footer__brand">
          <img src="/assets/logo.png" alt="Grant C. Meyer Homes" style={{
            filter: "brightness(0) invert(1)",
            height: 72,
          }} />
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", marginBottom: 24, maxWidth: 280 }}>
            Three decades of expertise in Lake Tahoe luxury real estate.
            Curated representation, quiet sales, lasting relationships.
          </p>
        </div>
        <div>
          <h4 className="footer__h">Properties</h4>
          <div className="footer__links">
            <a href="/listings/">Search Listings</a>
            {spaLink("For Buyers", "buyers")}
            {spaLink("For Sellers", "sellers")}
          </div>
        </div>
        <div>
          <h4 className="footer__h">Tahoe</h4>
          <div className="footer__links">
            {spaLink("The Community", "community")}
            {spaLink("Concierge", "concierge")}
          </div>
        </div>
        <div>
          <h4 className="footer__h">About</h4>
          <div className="footer__links">
            {spaLink("About Grant", "about")}
            {spaLink("Contact", "contact")}
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <span style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.45)", maxWidth: 640 }}>
          Listing data via Trestle (Cotality), courtesy of Incline Village Realtors®. Information is deemed
          reliable but not guaranteed and should be independently verified.
        </span>
        <span>© 2026 Grant C. Meyer Homes.</span>
      </div>
    </footer>
  );
}

// ===== Contact section (used in home + contact page) =====
function ContactSection({ id = "contact" }) {
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = React.useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4500);
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <section id={id} className="section section--cream" data-screen-label="Contact">
      <div className="container">
        <div className="invite">
          <div className="invite__left">
            <h2 className="invite__h">Your Tahoe Story Starts With One Conversation.</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 10 }}>
              <div className="invite__row">
                <Icon.Phone />
                <div>
                  <div className="invite__row__label">CALL DIRECTLY</div>
                  <div className="invite__row__v">(775) 555-0192</div>
                </div>
              </div>
              <div className="invite__row">
                <Icon.Mail />
                <div>
                  <div className="invite__row__label">EMAIL GRANT</div>
                  <div className="invite__row__v">grant@meyerhomes.com</div>
                </div>
              </div>
              <div className="invite__row">
                <Icon.Pin />
                <div>
                  <div className="invite__row__label">MAILING ADDRESS</div>
                  <div className="invite__row__v">923 Tahoe Blvd, Incline Village, NV</div>
                </div>
              </div>
            </div>
            <div className="invite__agent">
              <img src="/assets/grant.jpg" alt="Grant C. Meyer" />
              <div>
                <div className="invite__agent__name">Grant C. Meyer</div>
                <div className="invite__agent__role">Coldwell Banker Global Luxury Agent</div>
              </div>
            </div>
          </div>

          <form className="invite__form" onSubmit={submit}>
            <h3 className="invite__form__h">Let's begin with a conversation, not a transaction.</h3>
            <div className="form-row">
              <div className="field">
                <label className="field__label">FULL NAME</label>
                <input className="field__input" placeholder="John Doe" value={form.name} onChange={update("name")} required />
              </div>
              <div className="field">
                <label className="field__label">EMAIL ADDRESS</label>
                <input className="field__input" type="email" placeholder="john@example.com" value={form.email} onChange={update("email")} required />
              </div>
            </div>
            <div className="field">
              <label className="field__label">PHONE NUMBER</label>
              <input className="field__input" placeholder="+1 (555) 000-0000" value={form.phone} onChange={update("phone")} />
            </div>
            <div className="field">
              <label className="field__label">HOW CAN WE HELP?</label>
              <textarea className="field__input" placeholder="I'm interested in viewing current listings in Crystal Bay..." value={form.message} onChange={update("message")} />
            </div>
            {sent ? (
              <div className="form-sent">
                <Icon.Check size={14} /> Thanks — Grant will be in touch within 24 hours.
              </div>
            ) : (
              <button type="submit" className="btn--submit btn">SEND INQUIRY</button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Nav, Footer, ContactSection });
