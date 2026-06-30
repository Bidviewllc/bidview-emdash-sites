/**
 * extract-content.mjs
 * Reads every local-site page and produces seed/seed.json for the
 * floridamedicalhearingaids emdash project.
 *
 * Run from the project root:
 *   node scripts/extract-content.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCAL_SITE = path.resolve(
  'C:/Clients/Bidview Marketing/emdash/floridamedicalhearingaids.com/local-site'
);
const MANIFEST_PATH = path.resolve(
  'C:/Clients/Bidview Marketing/emdash/floridamedicalhearingaids.com/scraped-html/manifest.json'
);
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'seed', 'seed.json');

// ── Categorisation rules ────────────────────────────────────────────────────

/** Slugs that belong to the "posts" (blog) collection */
const POST_SLUGS = new Set([
  'swimmers-ear',
  'hearing-aids-for-tinnitus',
  'understanding-hyperacusis-symptoms-management-treatment',
  'rechargeable-hearing-aids-costs-features-benefits',
  'what-you-need-to-know-about-over-the-counter-hearing-aids',
  'hearing-test-online-what-you-need-to-know',
  'understanding-pressure-in-your-ear',
  'ear-candling-risks-why-ear-candles-are-not-a-safe-way-to-remove-wax',
]);

/** URL path prefixes that identify hearing aid brand pages */
const BRAND_PATH_PREFIX = '/hearing-aid/';

/** URL path prefixes that identify team member pages */
const TEAM_PATH_PREFIXES = [
  '/hearing-instrument-specialist/',
  '/patient-care-coordinator/',
];

/** URL path prefixes / slug suffixes that identify location pages */
const LOCATION_SLUG_CONTAINS = 'audiologist-hearing-aids';
const LOCATION_SLUG_SUFFIX = '-fl';

/** Slugs to skip entirely (category archive pages, etc.) */
const SKIP_SLUGS = new Set([
  'category_hearing',
  'category_hyperacusis',
]);

// ── HTML extraction helpers ─────────────────────────────────────────────────

function extractMeta(html, property) {
  // Try name= first, then property=
  let m = html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'));
  if (!m) m = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'));
  if (m) return m[1].trim();
  m = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'));
  if (!m) m = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
  return m ? m[1].trim() : '';
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].replace(/&amp;/g, '&').trim() : '';
}

function extractH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}

function extractBody(html) {
  // Everything between </header> and <footer (exclusive)
  const headerEnd = html.indexOf('</header>');
  const footerStart = html.lastIndexOf('<footer ');
  if (headerEnd === -1 || footerStart === -1 || footerStart <= headerEnd) {
    // Fallback: look for main content wrapper
    const mainStart = html.indexOf('<main');
    const mainEnd = html.lastIndexOf('</main>');
    if (mainStart !== -1 && mainEnd !== -1) {
      return html.substring(mainStart, mainEnd + 7).trim();
    }
    return '';
  }
  return html.substring(headerEnd + 9, footerStart).trim();
}

function extractOgImage(html) {
  return extractMeta(html, 'og:image');
}

// ── Slug helpers ────────────────────────────────────────────────────────────

/**
 * Given a URL, return { slug, collection }.
 *
 * For depth-2 pages like /audiology-services/hearing-tests/ the slug is
 * built as "audiology-services--hearing-tests" to avoid collision with the
 * parent /audiology-services/ page.
 *
 * URL examples:
 *   https://floridamedicalhearingaids.com/                           → home / pages
 *   https://floridamedicalhearingaids.com/swimmers-ear/              → swimmers-ear / posts
 *   https://floridamedicalhearingaids.com/hearing-aid/phonak/        → phonak / hearing_aid_brands
 *   https://floridamedicalhearingaids.com/hearing-instrument-specialist/debra-adair/  → debra-adair / team_members
 *   https://floridamedicalhearingaids.com/patient-care-coordinator/susan-simpkins/   → susan-simpkins / team_members
 *   https://floridamedicalhearingaids.com/audiologist-hearing-aids-sebring-fl/       → audiologist-hearing-aids-sebring-fl / locations
 *   https://floridamedicalhearingaids.com/audiology-services/hearing-tests/ → audiology-services--hearing-tests / pages
 *   https://floridamedicalhearingaids.com/category/hearing/          → SKIP
 */
function categorise(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname; // e.g. /swimmers-ear/

  // Home
  if (pathname === '/') return { slug: 'home', collection: 'pages' };

  // Remove leading/trailing slashes → path segments
  const parts = pathname.replace(/^\/|\/$/g, '').split('/');

  // Category pages — skip
  if (parts[0] === 'category') return null;

  // Hearing aid brand pages  /hearing-aid/<brand>/
  if (pathname.startsWith(BRAND_PATH_PREFIX)) {
    const brand = parts[1];
    if (!brand) return null;
    return { slug: brand, collection: 'hearing_aid_brands' };
  }

  // Team member pages
  for (const prefix of TEAM_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      const memberSlug = parts[1];
      if (!memberSlug) return null;
      return { slug: memberSlug, collection: 'team_members' };
    }
  }

  // Depth-1 slug
  const depth1Slug = parts[0];

  // Location pages (depth-1)
  if (depth1Slug.includes(LOCATION_SLUG_CONTAINS) && depth1Slug.endsWith(LOCATION_SLUG_SUFFIX)) {
    return { slug: depth1Slug, collection: 'locations' };
  }

  // Blog posts (depth-1)
  if (POST_SLUGS.has(depth1Slug)) {
    return { slug: depth1Slug, collection: 'posts' };
  }

  // Depth-2 pages (e.g. /audiology-services/hearing-tests/) — join with "--"
  if (parts.length >= 2 && parts[1]) {
    const slug = `${parts[0]}--${parts[1]}`;
    return { slug, collection: 'pages' };
  }

  // Depth-1 default → pages
  return { slug: depth1Slug, collection: 'pages' };
}

/**
 * Given a URL, resolve the local HTML file path.
 * The local-site mirrors the URL structure:
 *   /                     → local-site/index.html
 *   /swimmers-ear/        → local-site/swimmers-ear/index.html
 *   /hearing-aid/phonak/  → local-site/hearing-aid/phonak/index.html
 */
function urlToLocalPath(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  if (pathname === '/') return path.join(LOCAL_SITE, 'index.html');
  const relative = pathname.replace(/^\/|\/$/g, '').replace(/\//g, path.sep);
  return path.join(LOCAL_SITE, relative, 'index.html');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading manifest…');
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  const entries = [];
  const countsByCollection = {};

  // Process each URL in manifest order
  for (const [url] of Object.entries(manifest)) {
    const cat = categorise(url);
    if (!cat) {
      console.log(`  SKIP  ${url}`);
      continue;
    }
    const { slug, collection } = cat;

    // Skip duplicate slugs (shouldn't happen, but defensive)
    const key = `${collection}:${slug}`;
    if (SKIP_SLUGS.has(key)) {
      console.log(`  SKIP  ${url} (in SKIP_SLUGS)`);
      continue;
    }

    const localPath = urlToLocalPath(url);
    let html = '';
    try {
      html = await fs.readFile(localPath, 'utf8');
    } catch (e) {
      console.warn(`  WARN  Cannot read ${localPath}: ${e.message}`);
      continue;
    }

    const title = extractTitle(html);
    const metaDescription = extractMeta(html, 'description');
    const ogImage = extractOgImage(html);
    const h1 = extractH1(html);
    const body = extractBody(html);

    console.log(`  ${collection.padEnd(20)} ${slug.padEnd(55)} h1="${h1.substring(0, 40)}"`);

    entries.push({
      collection,
      slug,
      status: 'published',
      // content.ts reads from entry.data — fields must be nested here
      data: {
        meta_title: title,
        title,
        meta_description: metaDescription,
        og_image: ogImage,
        h1,
        head_extra: '',
        body,
      },
    });

    countsByCollection[collection] = (countsByCollection[collection] || 0) + 1;
  }

  // ── site_settings entry ──────────────────────────────────────────────────
  // Extract from the home page
  const homeHtml = await fs.readFile(path.join(LOCAL_SITE, 'index.html'), 'utf8');
  const phoneMatch = homeHtml.match(/tel:([\d\-\+\(\)\s]+)"/);
  const phone = phoneMatch ? phoneMatch[1].trim() : '(863) 591-8281';
  const emailMatch = homeHtml.match(/mailto:([^"]+)"/);
  const email = emailMatch ? emailMatch[1].trim() : '';
  const addressMatch = homeHtml.match(/(\d+\s+[^<]{5,80}(?:FL|Florida)[^<]{0,30})/);
  const address = addressMatch ? addressMatch[1].replace(/\s+/g, ' ').trim() : '251 E Interlake Blvd, Lake Placid, FL 33852';

  entries.unshift({
    collection: 'site_settings',
    slug: 'main',
    status: 'published',
    data: {
      meta_title: 'Florida Medical Hearing Aids',
      title: 'Florida Medical Hearing Aids',
      meta_description: 'Florida Medical Hearing is an audiology and hearing aid clinic with an expert hearing instrument specialist providing hearing tests and professional hearing services in Sebring, FL and Lake Placid, FL.',
      site_name: 'Florida Medical Hearing Aids',
      phone,
      email: email || 'info@floridamedicalhearingaids.com',
      address,
      og_image: '',
      head_extra: '',
      body: '',
    },
  });

  // ── Assemble seed.json ───────────────────────────────────────────────────
  const seed = {
    '$schema': 'https://emdashcms.com/seed.schema.json',
    version: '1',
    meta: {
      name: 'Florida Medical Hearing Aids',
      description: 'Hearing Instrument Specialist & Hearing Aids in Florida',
      url: 'https://floridamedicalhearingaids.com',
    },
    collections: [
      {
        name: 'site_settings',
        slug: 'site_settings',
        label: 'Site Settings',
        fields: [
          { name: 'site_name', slug: 'site_name', type: 'string', label: 'Site Name' },
          { name: 'phone', slug: 'phone', type: 'string', label: 'Phone' },
          { name: 'email', slug: 'email', type: 'string', label: 'Email' },
          { name: 'address', slug: 'address', type: 'string', label: 'Address' },
          { name: 'meta_title', slug: 'meta_title', type: 'string', label: 'Meta Title' },
          { name: 'meta_description', slug: 'meta_description', type: 'text', label: 'Meta Description' },
          { name: 'og_image', slug: 'og_image', type: 'string', label: 'OG Image' },
          { name: 'head_extra', slug: 'head_extra', type: 'text', label: 'Extra Head HTML' },
          { name: 'body', slug: 'body', type: 'richtext', label: 'Body HTML' },
        ],
      },
      {
        name: 'pages',
        slug: 'pages',
        label: 'Pages',
        fields: [
          { name: 'meta_title', slug: 'meta_title', type: 'string', label: 'Meta Title' },
          { name: 'meta_description', slug: 'meta_description', type: 'text', label: 'Meta Description' },
          { name: 'og_image', slug: 'og_image', type: 'string', label: 'OG Image' },
          { name: 'h1', slug: 'h1', type: 'string', label: 'H1' },
          { name: 'head_extra', slug: 'head_extra', type: 'text', label: 'Extra Head HTML' },
          { name: 'body', slug: 'body', type: 'richtext', label: 'Body HTML' },
        ],
      },
      {
        name: 'posts',
        slug: 'posts',
        label: 'Blog Posts',
        fields: [
          { name: 'meta_title', slug: 'meta_title', type: 'string', label: 'Meta Title' },
          { name: 'meta_description', slug: 'meta_description', type: 'text', label: 'Meta Description' },
          { name: 'og_image', slug: 'og_image', type: 'string', label: 'OG Image' },
          { name: 'h1', slug: 'h1', type: 'string', label: 'H1' },
          { name: 'head_extra', slug: 'head_extra', type: 'text', label: 'Extra Head HTML' },
          { name: 'body', slug: 'body', type: 'richtext', label: 'Body HTML' },
        ],
      },
      {
        name: 'team_members',
        slug: 'team_members',
        label: 'Team Members',
        fields: [
          { name: 'meta_title', slug: 'meta_title', type: 'string', label: 'Meta Title' },
          { name: 'meta_description', slug: 'meta_description', type: 'text', label: 'Meta Description' },
          { name: 'og_image', slug: 'og_image', type: 'string', label: 'OG Image' },
          { name: 'h1', slug: 'h1', type: 'string', label: 'H1' },
          { name: 'head_extra', slug: 'head_extra', type: 'text', label: 'Extra Head HTML' },
          { name: 'body', slug: 'body', type: 'richtext', label: 'Body HTML' },
        ],
      },
      {
        name: 'locations',
        slug: 'locations',
        label: 'Locations',
        fields: [
          { name: 'meta_title', slug: 'meta_title', type: 'string', label: 'Meta Title' },
          { name: 'meta_description', slug: 'meta_description', type: 'text', label: 'Meta Description' },
          { name: 'og_image', slug: 'og_image', type: 'string', label: 'OG Image' },
          { name: 'h1', slug: 'h1', type: 'string', label: 'H1' },
          { name: 'head_extra', slug: 'head_extra', type: 'text', label: 'Extra Head HTML' },
          { name: 'body', slug: 'body', type: 'richtext', label: 'Body HTML' },
        ],
      },
      {
        name: 'hearing_aid_brands',
        slug: 'hearing_aid_brands',
        label: 'Hearing Aid Brands',
        fields: [
          { name: 'meta_title', slug: 'meta_title', type: 'string', label: 'Meta Title' },
          { name: 'meta_description', slug: 'meta_description', type: 'text', label: 'Meta Description' },
          { name: 'og_image', slug: 'og_image', type: 'string', label: 'OG Image' },
          { name: 'h1', slug: 'h1', type: 'string', label: 'H1' },
          { name: 'head_extra', slug: 'head_extra', type: 'text', label: 'Extra Head HTML' },
          { name: 'body', slug: 'body', type: 'richtext', label: 'Body HTML' },
        ],
      },
    ],
    taxonomies: [],
    menus: [],
    entries,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(seed, null, 2), 'utf8');

  console.log('\n=== DONE ===');
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log('Counts by collection:');
  for (const [col, count] of Object.entries(countsByCollection)) {
    console.log(`  ${col.padEnd(25)} ${count}`);
  }
  console.log(`  ${'site_settings'.padEnd(25)} 1`);
  console.log(`Total entries: ${entries.length}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
