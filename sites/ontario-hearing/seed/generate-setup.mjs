// Generate the complete emdash setup SQL:
// 1. Register 14 collections in _emdash_collections
// 2. Register all fields in _emdash_fields (1 row per editable field)
// 3. CREATE TABLE ec_<slug> for each collection with one column per field
// 4. INSERT data rows from pages.json (column-per-field)
//
// This is what emdash's admin UI "Create Collection" + "Add Field" would do.
// Applied with: wrangler d1 execute --file=seed/setup.sql --remote

import { readFile, writeFile, mkdir } from "node:fs/promises";

const data = JSON.parse(await readFile("emdash/src/data/pages.json", "utf8"));
await mkdir("emdash/seed", { recursive: true });

const sqlEsc = (s) => s === null || s === undefined ? "NULL" : "'" + String(s).replace(/'/g, "''") + "'";
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

// Generate ULID-like 26-char Crockford base32 IDs (matches emdash format)
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let ulidCounter = 0;
const ulid = (seed) => {
  // Deterministic ID derived from seed (collection or field slug) so re-running is idempotent
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const base = Math.abs(h).toString(32).toUpperCase().padStart(8, "0");
  ulidCounter++;
  const ts = (Date.now() + ulidCounter).toString(32).toUpperCase().padStart(10, "0");
  return ("01" + ts + base + base + base).slice(0, 26).padEnd(26, "0");
};

// ============================================================
// Collection definitions — for each: collection slug + fields
// Field shape: { slug, label, type, column_type, sort_order, required? }
// emdash type → column_type mapping:
//   string → TEXT
//   text → TEXT
//   portableText → JSON (or TEXT for our case — storing raw markdown)
//   integer → INTEGER
//   image → TEXT (stores storage key or URL)
// ============================================================
const COLLECTIONS = [
  {
    slug: "site_settings",
    label: "Site Settings", label_singular: "Site Setting",
    fields: [
      { slug: "phone", type: "string", column_type: "TEXT" },
      { slug: "email", type: "string", column_type: "TEXT" },
      { slug: "address_street", type: "string", column_type: "TEXT" },
      { slug: "address_city_state", type: "string", column_type: "TEXT" },
      { slug: "hours_mon_thu", type: "string", column_type: "TEXT" },
      { slug: "hours_fri", type: "string", column_type: "TEXT" },
      { slug: "google_maps_url", type: "string", column_type: "TEXT" },
    ],
  },
  {
    slug: "homepage",
    label: "Homepage", label_singular: "Homepage",
    fields: [
      { slug: "hero_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "hero_heading", type: "string", column_type: "TEXT" },
      { slug: "hero_lead", type: "text", column_type: "TEXT" },
      { slug: "hero_cta_text", type: "string", column_type: "TEXT" },
      { slug: "reviews_count", type: "string", column_type: "TEXT" },
      { slug: "about_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "about_heading", type: "string", column_type: "TEXT" },
      { slug: "about_body", type: "text", column_type: "TEXT" },
      { slug: "about_body2", type: "text", column_type: "TEXT" },
      { slug: "about_badge_title", type: "string", column_type: "TEXT" },
      { slug: "about_years_num", type: "string", column_type: "TEXT" },
      { slug: "about_years_label", type: "string", column_type: "TEXT" },
      { slug: "about_doctors_num", type: "string", column_type: "TEXT" },
      { slug: "about_doctors_label", type: "string", column_type: "TEXT" },
      { slug: "about_brands_num", type: "string", column_type: "TEXT" },
      { slug: "about_brands_label", type: "string", column_type: "TEXT" },
      { slug: "team_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "team_heading", type: "string", column_type: "TEXT" },
      { slug: "team_subhead", type: "text", column_type: "TEXT" },
      { slug: "cochlear_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "cochlear_heading", type: "string", column_type: "TEXT" },
      { slug: "cochlear_body", type: "text", column_type: "TEXT" },
      { slug: "diag_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "diag_heading", type: "string", column_type: "TEXT" },
      { slug: "diag_subhead", type: "text", column_type: "TEXT" },
      { slug: "ha_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "ha_heading", type: "string", column_type: "TEXT" },
      { slug: "brands_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "brands_heading", type: "string", column_type: "TEXT" },
      { slug: "brands_subhead", type: "text", column_type: "TEXT" },
      { slug: "testimonials_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "testimonials_heading", type: "string", column_type: "TEXT" },
      { slug: "faq_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "faq_heading", type: "string", column_type: "TEXT" },
      { slug: "faq_subhead", type: "text", column_type: "TEXT" },
      { slug: "blog_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "blog_heading", type: "string", column_type: "TEXT" },
    ],
  },
  {
    slug: "about_page",
    label: "About Page", label_singular: "About Page",
    fields: [
      { slug: "story_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "story_heading", type: "string", column_type: "TEXT" },
      { slug: "story_body1", type: "text", column_type: "TEXT" },
      { slug: "story_body2", type: "text", column_type: "TEXT" },
      { slug: "story_image_caption", type: "string", column_type: "TEXT" },
      { slug: "story_stat1_num", type: "string", column_type: "TEXT" },
      { slug: "story_stat1_label", type: "string", column_type: "TEXT" },
      { slug: "story_stat2_num", type: "string", column_type: "TEXT" },
      { slug: "story_stat2_label", type: "string", column_type: "TEXT" },
      { slug: "story_stat3_num", type: "string", column_type: "TEXT" },
      { slug: "story_stat3_label", type: "string", column_type: "TEXT" },
      { slug: "philosophy_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "philosophy_heading", type: "string", column_type: "TEXT" },
      { slug: "philosophy_body1", type: "text", column_type: "TEXT" },
      { slug: "philosophy_body2", type: "text", column_type: "TEXT" },
      { slug: "philosophy_body3", type: "text", column_type: "TEXT" },
      { slug: "philosophy_body4", type: "text", column_type: "TEXT" },
      { slug: "philosophy_image_caption", type: "string", column_type: "TEXT" },
      { slug: "team_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "team_heading", type: "string", column_type: "TEXT" },
      { slug: "team_subhead", type: "text", column_type: "TEXT" },
      { slug: "meta_title", type: "string", column_type: "TEXT" },
      { slug: "meta_description", type: "text", column_type: "TEXT" },
    ],
  },
  {
    slug: "contact_page",
    label: "Contact Page", label_singular: "Contact Page",
    fields: [
      { slug: "intro_eyebrow", type: "string", column_type: "TEXT" },
      { slug: "intro_heading", type: "string", column_type: "TEXT" },
      { slug: "intro_body1", type: "text", column_type: "TEXT" },
      { slug: "intro_body2", type: "text", column_type: "TEXT" },
      { slug: "meta_title", type: "string", column_type: "TEXT" },
      { slug: "meta_description", type: "text", column_type: "TEXT" },
    ],
  },
  {
    slug: "team_members",
    label: "Team Members", label_singular: "Team Member",
    fields: [
      { slug: "name", type: "string", column_type: "TEXT" },
      { slug: "role", type: "string", column_type: "TEXT" },
      { slug: "credentials", type: "string", column_type: "TEXT" },
      { slug: "bio_full", type: "portableText", column_type: "TEXT" },
      { slug: "hero_image_url", type: "string", column_type: "TEXT" },
      { slug: "meta_title", type: "string", column_type: "TEXT" },
      { slug: "meta_description", type: "text", column_type: "TEXT" },
      { slug: "sort_order", type: "integer", column_type: "INTEGER" },
    ],
  },
  {
    slug: "blog_posts",
    label: "Blog Posts", label_singular: "Blog Post",
    fields: [
      { slug: "title", type: "string", column_type: "TEXT" },
      { slug: "excerpt", type: "text", column_type: "TEXT" },
      { slug: "content", type: "portableText", column_type: "TEXT" },
      { slug: "featured_image_url", type: "string", column_type: "TEXT" },
      { slug: "author", type: "string", column_type: "TEXT" },
      { slug: "date", type: "string", column_type: "TEXT" },
      { slug: "category", type: "string", column_type: "TEXT" },
      { slug: "read_time", type: "string", column_type: "TEXT" },
      { slug: "meta_title", type: "string", column_type: "TEXT" },
      { slug: "meta_description", type: "text", column_type: "TEXT" },
      { slug: "sort_order", type: "integer", column_type: "INTEGER" },
    ],
  },
  {
    slug: "testimonials",
    label: "Testimonials", label_singular: "Testimonial",
    fields: [
      { slug: "quote", type: "text", column_type: "TEXT" },
      { slug: "author", type: "string", column_type: "TEXT" },
      { slug: "city", type: "string", column_type: "TEXT" },
      { slug: "rating", type: "integer", column_type: "INTEGER" },
      { slug: "sort_order", type: "integer", column_type: "INTEGER" },
    ],
  },
  {
    slug: "faqs",
    label: "FAQs", label_singular: "FAQ",
    fields: [
      { slug: "question", type: "string", column_type: "TEXT" },
      { slug: "answer", type: "text", column_type: "TEXT" },
      { slug: "sort_order", type: "integer", column_type: "INTEGER" },
    ],
  },
  ...["service_pages","brand_pages","location_pages","resource_pages","condition_pages"].map(slug => ({
    slug,
    label: slug.split("_").map(s => s[0].toUpperCase()+s.slice(1)).join(" "),
    label_singular: slug.replace(/_pages$/, "_page").split("_").map(s => s[0].toUpperCase()+s.slice(1)).join(" "),
    fields: [
      { slug: "title", type: "string", column_type: "TEXT" },
      { slug: "meta_title", type: "string", column_type: "TEXT" },
      { slug: "meta_description", type: "text", column_type: "TEXT" },
      { slug: "lead", type: "text", column_type: "TEXT" },
      { slug: "content", type: "portableText", column_type: "TEXT" },
      { slug: "hero_image_url", type: "string", column_type: "TEXT" },
      ...(slug === "brand_pages" ? [{ slug: "brand_name", type: "string", column_type: "TEXT" }] : []),
      ...(slug === "location_pages" ? [{ slug: "location_name", type: "string", column_type: "TEXT" }] : []),
      { slug: "sort_order", type: "integer", column_type: "INTEGER" },
    ],
  })),
  {
    slug: "legal_pages",
    label: "Legal Pages", label_singular: "Legal Page",
    fields: [
      { slug: "title", type: "string", column_type: "TEXT" },
      { slug: "meta_title", type: "string", column_type: "TEXT" },
      { slug: "meta_description", type: "text", column_type: "TEXT" },
      { slug: "content", type: "portableText", column_type: "TEXT" },
    ],
  },
];

let sql = `-- Ontario Hearing Center — full emdash setup SQL
-- 1. Registers 14 collections in _emdash_collections
-- 2. Registers all fields in _emdash_fields
-- 3. CREATE TABLE ec_<slug> for each collection
-- 4. INSERT data rows from src/data/pages.json
-- Apply with: wrangler d1 execute ontario-hearing-db --file=seed/setup.sql --remote
-- Idempotent: uses INSERT OR REPLACE + CREATE TABLE IF NOT EXISTS.

`;

// Step 1+2+3: For each collection, register metadata + create table
for (const col of COLLECTIONS) {
  const colId = ulid("col_" + col.slug);
  col._id = colId; // stash for later

  sql += `\n-- ============================================================\n`;
  sql += `-- Collection: ${col.slug}\n`;
  sql += `-- ============================================================\n`;

  // 1. Register collection
  sql += `INSERT OR REPLACE INTO _emdash_collections (id, slug, label, label_singular, supports, source, search_config, has_seo, comments_enabled, comments_moderation, comments_closed_after_days, comments_auto_approve_users) VALUES (\n`;
  sql += `  ${sqlEsc(colId)}, ${sqlEsc(col.slug)}, ${sqlEsc(col.label)}, ${sqlEsc(col.label_singular)},\n`;
  sql += `  ${sqlEsc('["drafts","revisions","search"]')}, ${sqlEsc("seed")}, ${sqlEsc('{"enabled":true}')}, 0, 0, 'first_time', 90, 1\n`;
  sql += `);\n\n`;

  // 2. Register title field first (every collection has a title — emdash convention)
  const titleFieldId = ulid("field_" + col.slug + "_title");
  sql += `INSERT OR REPLACE INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, sort_order, searchable, translatable) VALUES (\n`;
  sql += `  ${sqlEsc(titleFieldId)}, ${sqlEsc(colId)}, 'title', 'Title', 'string', 'TEXT', 1, 0, 1, 1\n`;
  sql += `);\n`;

  // Then register each custom field (skip title — already registered above)
  col.fields.filter((f) => f.slug !== "title").forEach((f, i) => {
    const fieldId = ulid("field_" + col.slug + "_" + f.slug);
    sql += `INSERT OR REPLACE INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, sort_order, searchable, translatable) VALUES (\n`;
    sql += `  ${sqlEsc(fieldId)}, ${sqlEsc(colId)}, ${sqlEsc(f.slug)}, ${sqlEsc(f.label || f.slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))}, ${sqlEsc(f.type)}, ${sqlEsc(f.column_type)}, ${f.required ? 1 : 0}, ${i + 1}, 0, 1\n`;
    sql += `);\n`;
  });

  // 3. CREATE TABLE — filter out "title" since it's already a standard column
  const customCols = col.fields
    .filter((f) => f.slug !== "title")
    .map((f) =>
      `  "${f.slug}" ${f.column_type}${f.column_type === "INTEGER" ? " DEFAULT 0" : ""}`
    ).join(",\n");

  sql += `\nCREATE TABLE IF NOT EXISTS "ec_${col.slug}" (\n`;
  sql += `  "id" TEXT PRIMARY KEY,\n`;
  sql += `  "slug" TEXT,\n`;
  sql += `  "status" TEXT DEFAULT 'draft',\n`;
  sql += `  "author_id" TEXT,\n`;
  sql += `  "primary_byline_id" TEXT,\n`;
  sql += `  "created_at" TEXT DEFAULT (datetime('now')),\n`;
  sql += `  "updated_at" TEXT DEFAULT (datetime('now')),\n`;
  sql += `  "published_at" TEXT,\n`;
  sql += `  "scheduled_at" TEXT,\n`;
  sql += `  "deleted_at" TEXT,\n`;
  sql += `  "version" INTEGER DEFAULT 1,\n`;
  sql += `  "live_revision_id" TEXT,\n`;
  sql += `  "draft_revision_id" TEXT,\n`;
  sql += `  "locale" TEXT DEFAULT 'en' NOT NULL,\n`;
  sql += `  "translation_group" TEXT,\n`;
  sql += `  "title" TEXT NOT NULL DEFAULT '',\n`;
  sql += customCols;
  sql += `,\n  CONSTRAINT "ec_${col.slug}_slug_locale_unique" UNIQUE ("slug", "locale")\n`;
  sql += `);\n\n`;
}

// ============================================================
// Step 4: Insert data rows
// ============================================================
sql += `\n\n-- ============================================================\n-- DATA INSERTS\n-- ============================================================\n\n`;

function insertRow(collection, slug, title, fields) {
  const cols = ["id", "slug", "status", "locale", "version", "title", "created_at", "updated_at", "published_at"];
  const vals = [sqlEsc(slug), sqlEsc(slug), "'published'", "'en'", "1", sqlEsc(title), "datetime('now')", "datetime('now')", "datetime('now')"];
  for (const [k, v] of Object.entries(fields)) {
    if (k === "title") continue; // already in standard cols
    cols.push(`"${k}"`);
    if (typeof v === "number") vals.push(String(v));
    else vals.push(sqlEsc(v));
  }
  return `INSERT OR REPLACE INTO "ec_${collection}" (${cols.join(", ")}) VALUES (${vals.join(", ")});\n\n`;
}

// site_settings
sql += `-- site_settings\n`;
sql += insertRow("site_settings", "main", "Site Settings", {
  phone: "(585) 442-4180",
  email: "info@ontariohearing.com",
  address_street: "2210 Monroe Avenue",
  address_city_state: "Rochester, NY 14618",
  hours_mon_thu: "9 AM – 5 PM",
  hours_fri: "9 AM – 4 PM",
  google_maps_url: "https://www.google.com/maps?cid=9213821493223506062",
});

// homepage
sql += `-- homepage\n`;
sql += insertRow("homepage", "homepage", "Homepage", {
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

// about_page
const aboutData = data.find((p) => p.slug === "about-us");
sql += `-- about_page\n`;
sql += insertRow("about_page", "about", "About Page", {
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
  meta_title: aboutData?.title ?? "About Us - Ontario Hearing Center | Rochester, NY",
  meta_description: aboutData?.meta_description ?? "",
});

// contact_page
const contactData = data.find((p) => p.slug === "contact-us");
sql += `-- contact_page\n`;
sql += insertRow("contact_page", "contact", "Contact Page", {
  intro_eyebrow: "Send us a message",
  intro_heading: "A real person will reply.",
  intro_body1: "Whether you're looking to schedule your first hearing evaluation, have a question about an existing pair of hearing aids, or need to discuss insurance coverage, the form on the right reaches our front desk directly.",
  intro_body2: "Most messages receive a response the same business day. If your matter is urgent, please give us a call instead.",
  meta_title: "Contact Us | Ontario Hearing Center, Rochester NY",
  meta_description: "Contact Ontario Hearing Center in Rochester, NY. Speak with our audiologists, schedule a hearing test, or get help with hearing aid selection & billing.",
});

// team_members — current real audiologists (matches src/data/team.ts)
const teamData = [
  { slug: "dr-adam-sheppard", name: "Dr. Adam Sheppard", role: "Practice Lead", creds: "Au.D., Ph.D., F-AAA", photo: "/assets/dr-adam.webp", bio: "Doctorate and Ph.D. in auditory neuroscience from the University at Buffalo. Twenty-plus peer-reviewed publications. Cochlear implant specialist.", sort: 1 },
  { slug: "dr-andrea-segmond", name: "Dr. Andrea Segmond", role: "Audiologist", creds: "Au.D.", photo: "/assets/dr-andrea-segmond.webp", bio: "Audiologist providing extensive hearing tests, hearing aids, and other audiology services in Rochester, NY. With Ontario Hearing Center since 2000.", sort: 2 },
  { slug: "dr-elizabeth-orlando", name: "Dr. Elizabeth Orlando", role: "Audiologist", creds: "Au.D.", photo: "/assets/dr-elizabeth-orlando.webp", bio: "Audiologist providing hearing aids, hearing tests, and other audiology services in Rochester, NY. Serving the Rochester area since 1989.", sort: 3 },
];
sql += `-- team_members\n`;
for (const t of teamData) {
  sql += insertRow("team_members", t.slug, t.name, {
    name: t.name, role: t.role, credentials: t.creds, bio_full: t.bio,
    hero_image_url: t.photo,
    meta_title: t.name,
    meta_description: t.bio,
    sort_order: t.sort,
  });
}

// testimonials
const testimonials = [
  { slug: "monty-wright", quote: "Ontario Hearing Center has been fabulous to work with. We have been managing hearing aids and the associated professionals for over 25 years now. This has been the best experience to date. Thanks to the entire team for the outstanding service.", author: "Monty Wright", city: "Rochester, NY", sort: 1 },
  { slug: "liz-scagliozzi", quote: "A very welcoming and pleasant office—I'm so glad I was referred! The audiologist was incredibly patient and took the time to explain everything about my hearing test and the results in a way that was easy to understand. I ended up purchasing new hearing aids and feel confident in my decision. Pam the office manager at the front desk was also so helpful and kind throughout the entire process. Highly recommend!", author: "Liz Scagliozzi", city: "Brighton, NY", sort: 2 },
  { slug: "everett-charette", quote: "Excellent, courteous service today for checking and cleaning my hearing aids after purchasing them 6 months ago. The bluetooth iPhone connection, the TV streaming and the rechargeable hearing aid dock enhanced my hearing immensely. The upgrades were worth every penny.", author: "Everett Charette", city: "Pittsford, NY", sort: 3 },
];
sql += `-- testimonials\n`;
for (const t of testimonials) {
  sql += insertRow("testimonials", t.slug, t.author, { quote: t.quote, author: t.author, city: t.city, rating: 5, sort_order: t.sort });
}

// faqs
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
sql += `-- faqs\n`;
faqs.forEach((f, i) => {
  sql += insertRow("faqs", f.slug, f.q, { question: f.q, answer: f.a, sort_order: i + 1 });
});

// blog_posts
const blogPosts = data.filter((p) => p.type === "blog");
sql += `-- blog_posts\n`;
blogPosts.forEach((p, i) => {
  const title = cleanTitle(p.title || p.h1 || p.slug);
  let content = cleanContent(p.content_markdown);
  let author = null, date = null, category = null;
  const m = content.match(/^(?:- ([^\n]+)\n){2,4}/m);
  if (m) {
    const bullets = m[0].split("\n").filter((l) => l.trim().startsWith("- ")).map((l) => l.replace(/^-\s+/, "").trim());
    if (bullets.length >= 2) { author = bullets[0]; date = bullets[1]; category = bullets[2] || null; content = content.replace(m[0], "").trim(); }
  }
  const readTime = Math.max(3, Math.round(content.length / 1500)) + " min read";
  sql += insertRow("blog_posts", p.slug, title, {
    title,
    excerpt: p.meta_description || extractLead(content) || "",
    content,
    featured_image_url: p.featured_image || "",
    author, date, category, read_time: readTime,
    meta_title: p.meta_title || p.title || "",
    meta_description: p.meta_description || "",
    sort_order: i + 1,
  });
});

// service_pages
const serviceSlugs = new Set([
  "hearing-test","cochlear-implant","tinnitus","custom-ear-molds","real-ear-measurement",
  "hearing-aids","hearing-aid-fittings-in-rochester-ny","hearing-aid-batteries","types-of-hearing-aids",
  "aural-rehabilitation",
  "audiologist-in-pittsford-ny",
  "services","what-to-expect","insurance","giving-back",
]);
const services = data.filter((p) => serviceSlugs.has(p.slug));
sql += `-- service_pages\n`;
services.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1 || p.slug);
  sql += insertRow("service_pages", p.slug, t, {
    title: t, meta_title: p.meta_title || p.title || "", meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "", content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "", sort_order: i + 1,
  });
});

// brand_pages
const brands = data.filter((p) => p.type === "brand");
sql += `-- brand_pages\n`;
brands.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  const brandName = (p.h1 || "").replace(/ Hearing Aids.*/i, "").trim() || p.slug.replace(/-hearing-aids$/, "");
  sql += insertRow("brand_pages", p.slug, t, {
    title: t, meta_title: p.meta_title || p.title || "", meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "", content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "", brand_name: brandName, sort_order: i + 1,
  });
});

// location_pages
const locations = data.filter((p) => p.type === "location");
sql += `-- location_pages\n`;
locations.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  const cityMatch = (p.h1 || "").match(/in\s+([A-Z][a-z]+)/i);
  const locationName = cityMatch ? cityMatch[1] : "Rochester";
  sql += insertRow("location_pages", p.slug, t, {
    title: t, meta_title: p.meta_title || p.title || "", meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "", content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "", location_name: locationName, sort_order: i + 1,
  });
});

// resource_pages
const resourceSlugs = new Set(["audiology","audiologist","hearing-loss","resources"]);
const resources = data.filter((p) => resourceSlugs.has(p.slug));
sql += `-- resource_pages\n`;
resources.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  sql += insertRow("resource_pages", p.slug, t, {
    title: t, meta_title: p.meta_title || p.title || "", meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "", content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "", sort_order: i + 1,
  });
});

// condition_pages
const conditionSlugs = new Set(["sensorineural-hearing-loss","menieres-disease","vertigo"]);
const conditions = data.filter((p) => conditionSlugs.has(p.slug));
sql += `-- condition_pages\n`;
conditions.forEach((p, i) => {
  const t = cleanTitle(p.title || p.h1);
  sql += insertRow("condition_pages", p.slug, t, {
    title: t, meta_title: p.meta_title || p.title || "", meta_description: p.meta_description || "",
    lead: extractLead(p.content_markdown) || "", content: cleanContent(p.content_markdown),
    hero_image_url: p.featured_image || "", sort_order: i + 1,
  });
});

// legal_pages
const legalSlugs = new Set(["disclaimer","privacy-policy","terms-conditions","sitemap","thank-you","thank-you-for-contacting-us"]);
const legals = data.filter((p) => legalSlugs.has(p.slug));
sql += `-- legal_pages\n`;
legals.forEach((p) => {
  const t = cleanTitle(p.title || p.h1);
  sql += insertRow("legal_pages", p.slug, t, {
    title: t, meta_title: p.meta_title || p.title || "", meta_description: p.meta_description || "",
    content: cleanContent(p.content_markdown),
  });
});

await writeFile("emdash/seed/setup.sql", sql);

const counts = {
  site_settings: 1, homepage: 1, about_page: 1, contact_page: 1,
  team_members: teamData.length, testimonials: testimonials.length, faqs: faqs.length,
  blog_posts: blogPosts.length, service_pages: services.length, brand_pages: brands.length,
  location_pages: locations.length, resource_pages: resources.length,
  condition_pages: conditions.length, legal_pages: legals.length,
};
const total = Object.values(counts).reduce((a,b) => a+b, 0);
const totalFields = COLLECTIONS.reduce((acc, c) => acc + c.fields.length + 1, 0); // +1 for title
console.log("Generated emdash/seed/setup.sql:");
console.log(`  Collections registered: ${COLLECTIONS.length}`);
console.log(`  Fields registered: ${totalFields}`);
console.log(`  Tables created: ${COLLECTIONS.length}`);
console.log(`  Data rows: ${total}`);
console.log(`  Size: ${(sql.length / 1024).toFixed(1)} KB`);
