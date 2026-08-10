// Generate emdash D1 seed SQL from src/data/pages.json
// emdash schema: each ec_<collection> table has standard columns
// (id, slug, status, title, content JSON, ...) — custom fields go in content JSON.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const data = JSON.parse(await readFile("emdash/src/data/pages.json", "utf8"));
await mkdir("emdash/seed", { recursive: true });

const sqlEsc = (s) => "'" + String(s ?? "").replace(/'/g, "''") + "'";
const jsonStr = (obj) => sqlEsc(JSON.stringify(obj));

const cleanTitle = (t) => (t || "").replace(/\s*[\|\-—]\s*Ontario.*$/i, "").trim();

const cleanContent = (md) => (md || "")
  .replace(/^# .+$/m, "")
  .replace(/!\[[^\]]*\]\([^)]+Path-419\.svg\)/g, "")
  .replace(/^\[Schedule An Appointment\]\([^)]+\)\s*$/m, "")
  .replace(/##\s+(Ready to Get Started\??|Recent Posts|Recent Articles|Categories|Tags|Archives|Related Posts|Related Articles|More Posts)\b[\s\S]*$/i, "")
  .trim();

const extractLead = (md) => {
  const lines = (md || "").split("\n").filter(l => l.trim());
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("#") || t.startsWith("!") || t.startsWith("[") || t.startsWith("-")) continue;
    const c = t.replace(/^[_*]+|[_*]+$/g, "").trim();
    if (c.length > 30 && c.length < 300) return c;
  }
  return null;
};

// Helper to emit a single INSERT into ec_<collection>
// Usage: insert("homepage", "homepage", "Homepage", { hero_heading: "...", ... })
function insert(collection, slug, title, content) {
  const table = `ec_${collection}`;
  return `INSERT OR REPLACE INTO ${table} (id, slug, status, locale, version, title, content, created_at, updated_at, published_at)
VALUES (${sqlEsc(slug)}, ${sqlEsc(slug)}, 'published', 'en', 1, ${sqlEsc(title)}, ${jsonStr(content)}, datetime('now'), datetime('now'), datetime('now'));\n\n`;
}

let sql = `-- Ontario Hearing Center — emdash D1 seed (JSON content format)
-- Generated from src/data/pages.json (114 pages from live ontariohearing.com scrape)
-- PRE-REQ: 14 collections must already be created via /_emdash/admin (see COLLECTIONS.md)
-- Apply: wrangler d1 execute ontario-hearing-db --file=seed/seed-entries.sql --remote

`;

// ============================================================
// site_settings (1 row)
// ============================================================
sql += `-- site_settings\n`;
sql += insert("site_settings", "main", "Site Settings", {
  phone: "(585) 442-4180",
  email: "info@ontariohearing.com",
  address_street: "2210 Monroe Avenue",
  address_city_state: "Rochester, NY 14618",
  hours_mon_thu: "8 AM – 5 PM",
  hours_fri: "8 AM – 4 PM",
  google_maps_url: "https://www.google.com/maps?cid=9213821493223506062",
});

// ============================================================
// homepage (1 row)
// ============================================================
sql += `-- homepage\n`;
sql += insert("homepage", "homepage", "Homepage", {
  hero_eyebrow: "Rochester · Brighton · Since 1956",
  hero_heading: "Your guide to better hearing.",
  hero_lead: "Trusted hearing health solutions so you can enjoy life. Doctoral-level audiologists serving Rochester families for nearly seventy years.",
  hero_cta_text: "Schedule An Appointment",
  reviews_count: "100+",
  about_eyebrow: "AUDIOLOGISTS & HEARING AIDS IN ROCHESTER, NY",
  about_heading: "Ontario Hearing Center.",
  about_body: "Ontario Hearing Center connects you to the best audiologists and hearing aids in Rochester, NY. Our audiology team has been providing quality hearing services since 1956. We provide advanced hearing technologies and solutions while staying rooted in our traditional values.",
  about_body2: "We are conveniently located in Brighton, NY, at 2210 Monroe Avenue. Our patients travel to see us from Spencerport, Westgate, North Gates, Pittsford, and East Rochester, NY.",
  about_badge_title: "Elizabeth, John, & Andrea.",
  about_years_num: "70+", about_years_label: "years in Rochester",
  about_doctors_num: "3", about_doctors_label: "doctoral audiologists",
  about_brands_num: "7", about_brands_label: "hearing-aid brands",
  team_eyebrow: "Meet your audiologists",
  team_heading: "Doctoral-level audiologists in Rochester, NY.",
  team_subhead: "Every patient is seen by a doctoral-level audiologist. No rushed appointments. No one-size-fits-all recommendations.",
  cochlear_eyebrow: "Cochlear Implants",
  cochlear_heading: "Cochlear Implant in Rochester, NY.",
  cochlear_body: "Ontario Hearing Center is a proud member of the Cochlear Provider Network. If hearing aids don't provide enough help for your hearing loss, we offer cochlear options so you can hear your very best.",
  diag_eyebrow: "Audiology services",
  diag_heading: "Evaluating, managing, and restoring the way you hear.",
  diag_subhead: "We provide the full continuum of diagnostic and therapeutic hearing care, from first evaluation through long-term management.",
  ha_eyebrow: "Hearing aid services",
  ha_heading: "Care doesn't end at the fitting. It begins there.",
  brands_eyebrow: "Hearing aids",
  brands_heading: "The right device for your life.",
  brands_subhead: "Seven manufacturers, countless configurations — and one audiologist sitting with you to make sense of it all.",
  testimonials_eyebrow: "Patient reviews",
  testimonials_heading: "From Rochester, NY.",
  faq_eyebrow: "FREQUENTLY ASKED QUESTIONS",
  faq_heading: "Answers to the questions patients actually ask.",
  faq_subhead: "Still have a question? Call us at (585) 442-4180.",
  blog_eyebrow: "From the experts",
  blog_heading: "Writing from our audiologists.",
});

// ============================================================
// about_page (1 row)
// ============================================================
const about = data.find(p => p.slug === "about-us");
sql += `-- about_page\n`;
sql += insert("about_page", "about", "About Page", {
  story_eyebrow: "Our story",
  story_heading: "Nearly seventy years on Monroe Avenue.",
  story_body1: "Ontario Hearing Center is an audiology and hearing aid clinic with expert audiologists that provides comprehensive hearing care services, hearing tests, cochlear implants, and advanced hearing solutions in Brighton, Rochester, NY.",
  story_body2: "We are your guide to better hearing. Our team at Ontario Hearing Center is dedicated to providing quality hearing services so you can enjoy life. We offer the world's most advanced hearing technology and solutions for those who need it. Our team has been serving the area since 1956, and we want to give our customers an experience that they'll never forget — a positive one from start to finish.",
  story_image_caption: "2210 Monroe Avenue, since 1956",
  story_stat1_num: "1956", story_stat1_label: "founded",
  story_stat2_num: "70+", story_stat2_label: "years in Rochester",
  story_stat3_num: "3", story_stat3_label: "doctoral audiologists",
  philosophy_eyebrow: "Our philosophy",
  philosophy_heading: "Doctoral care, at a human pace.",
  philosophy_body1: "With a team of dedicated audiology professionals, we are committed to providing quality hearing services and innovative solutions for our client's needs. Ontario Hearing Center is rooted in traditional values while offering the world's most advanced hearing technologies and hearing solutions to support your every need.",
  philosophy_body2: "We offer expert answers to all your audiology questions. We also carry the best hearing aid brands to give our patients a wide selection of hearing solutions. With hearing aid technology being a continually growing aspect of hearing healthcare, we aim to provide high-quality aids in Rochester, NY.",
  philosophy_body3: "At Ontario Hearing Center, we understand that choosing among a multitude of hearing aid solutions can be overwhelming for our patients. We are committed to making our patients experience the best customer service while providing the best hearing healthcare in Rochester, NY.",
  philosophy_body4: "Your journey to better hearing starts with YOU. We are committed to providing all the resources and support you need every step of the way.",
  philosophy_image_caption: "Traditional values, modern technology.",
  team_eyebrow: "Our team",
  team_heading: "Meet your audiologists.",
  team_subhead: "Three doctoral-level practitioners. One office. Every appointment with someone who has trained for years to be in the room with you.",
  meta_title: about?.title ?? "About Us - Ontario Hearing Center | Rochester, NY",
  meta_description: about?.meta_description ?? "",
});

// ============================================================
// contact_page (1 row)
// ============================================================
const contact = data.find(p => p.slug === "contact-us");
sql += `-- contact_page\n`;
sql += insert("contact_page", "contact", "Contact Page", {
  intro_eyebrow: "Send us a message",
  intro_heading: "A real person will reply.",
  intro_body1: "Whether you're looking to schedule your first hearing evaluation, have a question about an existing pair of hearing aids, or need to discuss insurance coverage, the form on the right reaches our front desk directly.",
  intro_body2: "Most messages receive a response the same business day. If your matter is urgent, please give us a call instead.",
  meta_title: contact?.title ?? "Contact Us - Ontario Hearing Center | Rochester, NY",
  meta_description: contact?.meta_description ?? "",
});

// ============================================================
// team_members (3 rows)
// ============================================================
// Current real audiologists (matches src/data/team.ts)
const teamData = [
  { slug: "dr-adam-sheppard", name: "Dr. Adam Sheppard", role: "Practice Lead", creds: "Au.D., Ph.D., F-AAA", photo: "/assets/dr-adam.webp", bio: "Doctorate and Ph.D. in auditory neuroscience from the University at Buffalo. Twenty-plus peer-reviewed publications. Cochlear implant specialist.", sort: 1 },
  { slug: "dr-andrea-segmond", name: "Dr. Andrea Segmond", role: "Audiologist", creds: "Au.D.", photo: "/assets/dr-andrea-segmond.webp", bio: "Audiologist providing extensive hearing tests, hearing aids, and other audiology services in Rochester, NY. With Ontario Hearing Center since 2000.", sort: 2 },
  { slug: "dr-elizabeth-orlando", name: "Dr. Elizabeth Orlando", role: "Audiologist", creds: "Au.D.", photo: "/assets/dr-elizabeth-orlando.webp", bio: "Audiologist providing hearing aids, hearing tests, and other audiology services in Rochester, NY. Serving the Rochester area since 1989.", sort: 3 },
];
sql += `-- team_members (${teamData.length} rows)\n`;
for (const t of teamData) {
  sql += insert("team_members", t.slug, t.name, {
    name: t.name,
    role: t.role,
    credentials: t.creds,
    bio_full: t.bio,
    hero_image_url: t.photo,
    meta_title: t.name,
    meta_description: t.bio,
    sort_order: t.sort,
  });
}

// ============================================================
// testimonials (3 rows)
// ============================================================
const testimonials = [
  { slug: "monty-wright", quote: "Ontario Hearing Center has been fabulous to work with. We have been managing hearing aids and the associated professionals for over 25 years now. This has been the best experience to date. Thanks to the entire team for the outstanding service.", author: "Monty Wright", city: "7 days ago", sort: 1 },
  { slug: "liz-scagliozzi", quote: "A very welcoming and pleasant office—I'm so glad I was referred! The audiologist was incredibly patient and took the time to explain everything about my hearing test and the results in a way that was easy to understand. I ended up purchasing new hearing aids and feel confident in my decision. Pam the office manager at the front desk was also so helpful and kind throughout the entire process. Highly recommend!", author: "Liz Scagliozzi", city: "2 months ago", sort: 2 },
  { slug: "everett-charette", quote: "Excellent, courteous service from Dr. Orlando today for checking and cleaning my hearing aids after purchasing them 6 months ago. The bluetooth iPhone connection, the TV streaming and the rechargeable hearing aid dock enhanced my hearing immensely. The upgrades were worth every penny.", author: "Everett Charette", city: "4 months ago", sort: 3 },
];
sql += `-- testimonials (${testimonials.length} rows)\n`;
for (const t of testimonials) {
  sql += insert("testimonials", t.slug, t.author, {
    quote: t.quote, author: t.author, city: t.city, rating: 5, sort_order: t.sort,
  });
}

// ============================================================
// faqs (8 rows)
// ============================================================
const faqs = [
  { slug: "self-refer", q: "Can you self-refer to an audiologist?", a: "In Rochester, a referral is not necessary to see an audiologist unless Medicare is your primary insurer. Otherwise, almost all insurances cover testing minus a possible co-pay. Please check with your insurance provider for more information about what your specific healthcare plan covers." },
  { slug: "doctor-referral", q: "Do you need a doctor's referral for a hearing test?", a: "The majority of healthcare plans do not require you have a doctor's referral for a hearing test in the state of New York. Medicare is one known exception. If you have any questions or concerns about healthcare coverage, please give us a call." },
  { slug: "dispenser-vs-audiologist", q: "Is a hearing aid dispenser the same as an audiologist?", a: "An audiologist is a doctorate-level specialist in hearing anatomy. To work as a hearing aid dispenser, you must be qualified, apply for a license, and have substantial experience with hearing aids. An audiologist must have a doctorate degree in the study of audiology. An audiologist may be better suited for more medically related services, including balance problems, impacted ear wax, and noise-induced hearing loss." },
  { slug: "how-hearing-aids-work", q: "How do hearing aids work?", a: "Unlike traditional analog hearing aids of the past, digital hearing aids have the capabilities and flexibility of sophisticated computer systems. They are customized for each individual's hearing loss with the end result creating sound that is crisp and clear regardless of the environment." },
  { slug: "best-hearing-aid", q: "Which hearing aid is the best?", a: "We recognize that the options can be overwhelming, so we take our time to go over your options and what will work best for your lifestyle. It's important that the hearing devices you choose fit your needs, as well as your comfort and hearing loss. We ensure that you are hearing the best you can with the best available devices." },
  { slug: "hearing-aid-cost", q: "How much do hearing aids cost?", a: "Prices of hearing aids vary depending on the brand, technology, and features of the device. Insurance coverage and level of hearing loss are also big determining factors for the cost of a hearing aid." },
  { slug: "what-is-tinnitus", q: "What is tinnitus?", a: "Tinnitus refers to hearing sounds that come from inside the body, rather than from an external source. While it is often described as ringing in the ears, tinnitus can also manifest as a buzzing, grinding, or humming sound." },
  { slug: "office-location", q: "Where is your office located?", a: "We are conveniently located in Brighton, NY, at 2210 Monroe Avenue. Our patients travel to see us from Spencerport, Westgate, North Gates, Pittsford, and East Rochester, NY." },
];
sql += `-- faqs (${faqs.length} rows)\n`;
faqs.forEach((f, i) => {
  sql += insert("faqs", f.slug, f.q, { question: f.q, answer: f.a, sort_order: i + 1 });
});

// ============================================================
// blog_posts (48 rows)
// ============================================================
const blogPosts = data.filter(p => p.type === "blog");
sql += `-- blog_posts (${blogPosts.length} rows)\n`;
blogPosts.forEach((p, i) => {
  const title = cleanTitle(p.title || p.h1 || p.slug);
  let content = cleanContent(p.content_markdown);
  let author = null, date = null, category = null;
  const m = content.match(/^(?:- ([^\n]+)\n){2,4}/m);
  if (m) {
    const bullets = m[0].split("\n").filter(l => l.trim().startsWith("- ")).map(l => l.replace(/^-\s+/, "").trim());
    if (bullets.length >= 2) {
      author = bullets[0]; date = bullets[1]; category = bullets[2] || null;
      content = content.replace(m[0], "").trim();
    }
  }
  const readTime = Math.max(3, Math.round(content.length / 1500)) + " min read";
  sql += insert("blog_posts", p.slug, title, {
    title,
    excerpt: p.meta_description || extractLead(content) || "",
    content,
    featured_image_url: p.featured_image || "",
    author, date, category, read_time: readTime,
    meta_title: p.title || "",
    meta_description: p.meta_description || "",
    sort_order: i + 1,
  });
});

// ============================================================
// service_pages
// ============================================================
const serviceSlugs = new Set([
  "hearing-test","cochlear-implant","tinnitus","custom-ear-molds","real-ear-measurement",
  "hearing-aids","hearing-aid-fittings-in-rochester-ny","hearing-aid-batteries","types-of-hearing-aids",
  "audiologist-in-pittsford-ny",
  "audiologists-in-pittsford-ny__cochlear-implants",
  "audiologists-in-pittsford-ny__custom-ear-molds",
  "audiologists-in-pittsford-ny__tinnitus-evaluation-treatment",
  "audiologists-in-pittsford-ny__hearing-tests",
  "audiologists-in-pittsford-ny__hearing-aid-fittings",
  "services","what-to-expect","insurance","giving-back",
]);
const services = data.filter(p => serviceSlugs.has(p.slug));
sql += `-- service_pages (${services.length} rows)\n`;
services.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1 || p.slug);
  sql += insert("service_pages", p.slug, t, {
    title: t,
    meta_title: p.title || "",
    meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "",
    content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "",
    sort_order: i + 1,
  });
});

// ============================================================
// brand_pages
// ============================================================
const brands = data.filter(p => p.type === "brand");
sql += `-- brand_pages (${brands.length} rows)\n`;
brands.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  const brandName = (p.h1 || "").replace(/ Hearing Aids.*/i, "").trim() || p.slug.replace(/-hearing-aids$/, "");
  sql += insert("brand_pages", p.slug, t, {
    brand_name: brandName,
    title: t,
    meta_title: p.title || "",
    meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "",
    content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "",
    sort_order: i + 1,
  });
});

// ============================================================
// location_pages
// ============================================================
const locations = data.filter(p => p.type === "location");
sql += `-- location_pages (${locations.length} rows)\n`;
locations.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  const cityMatch = (p.h1 || "").match(/in\s+([A-Z][a-z]+)/i);
  const locationName = cityMatch ? cityMatch[1] : "Rochester";
  sql += insert("location_pages", p.slug, t, {
    location_name: locationName,
    title: t,
    meta_title: p.title || "",
    meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "",
    content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "",
    sort_order: i + 1,
  });
});

// ============================================================
// resource_pages
// ============================================================
const resourceSlugs = new Set(["audiology","audiologist","hearing-loss","resources"]);
const resources = data.filter(p => resourceSlugs.has(p.slug));
sql += `-- resource_pages (${resources.length} rows)\n`;
resources.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  sql += insert("resource_pages", p.slug, t, {
    title: t,
    meta_title: p.title || "",
    meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "",
    content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "",
    sort_order: i + 1,
  });
});

// ============================================================
// condition_pages
// ============================================================
const conditionSlugs = new Set(["sensorineural-hearing-loss","menieres-disease","vertigo"]);
const conditions = data.filter(p => conditionSlugs.has(p.slug));
sql += `-- condition_pages (${conditions.length} rows)\n`;
conditions.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  sql += insert("condition_pages", p.slug, t, {
    title: t,
    meta_title: p.title || "",
    meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "",
    content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "",
    sort_order: i + 1,
  });
});

// ============================================================
// legal_pages
// ============================================================
const legalSlugs = new Set(["disclaimer","privacy-policy","terms-conditions","sitemap","thank-you","thank-you-for-contacting-us"]);
const legals = data.filter(p => legalSlugs.has(p.slug));
sql += `-- legal_pages (${legals.length} rows)\n`;
legals.forEach((p) => {
  const t = cleanTitle(p.title || p.h1);
  sql += insert("legal_pages", p.slug, t, {
    title: t,
    meta_title: p.title || "",
    meta_description: p.meta_description || "",
    content: cleanContent(p.content_markdown),
  });
});

await writeFile("emdash/seed/seed-entries.sql", sql);

const counts = {
  site_settings: 1, homepage: 1, about_page: 1, contact_page: 1,
  team_members: teamData.length, testimonials: testimonials.length, faqs: faqs.length,
  blog_posts: blogPosts.length, service_pages: services.length, brand_pages: brands.length,
  location_pages: locations.length, resource_pages: resources.length,
  condition_pages: conditions.length, legal_pages: legals.length,
};
const total = Object.values(counts).reduce((a,b) => a+b, 0);
console.log("Generated seed-entries.sql (JSON content format):");
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
console.log(`Total: ${total} rows across ${Object.keys(counts).length} collections`);
console.log(`File: emdash/seed/seed-entries.sql (${(sql.length / 1024).toFixed(1)} KB)`);
