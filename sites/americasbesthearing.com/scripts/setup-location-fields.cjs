const fs = require('fs');
const { load } = require('cheerio');

function extractLocations() {
  const html = fs.readFileSync('src/components/raw-pages/index.html', 'utf8');
  const $ = load(html, { decodeEntities: false });
  const rows = [];
  $('.astro-element-dd08e84 [role="tabpanel"]').each((index, panel) => {
    const p = $(panel);
    const tabId = p.attr('aria-labelledby');
    const name = $(`#${tabId}`).find('.e-n-tab-title-text').text().trim() || p.find('.astro-element-b4da925 h2').first().text().trim();
    const address = p.find('.astro-element-ff4b181 h3').first().text().replace(/\s+/g, ' ').trim();
    const phoneRaw = p.find('.astro-element-a8ef483 h3').first().text().replace(/\s+/g, ' ').trim();
    const phone = (phoneRaw.match(/(\d{3}[-.\s]\d{3}[-.\s]\d{4}|\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/) || [])[1] || phoneRaw.replace(/^Text or call:\s*/i, '').trim();
    const appointmentUrl = p.find('.astro-element-62dc465 a').first().attr('href') || '';
    const directionsUrl = p.find('.astro-element-b977eb5 a').first().attr('href') || p.find('.astro-element-6d13856').first().attr('href') || '';
    const mapTitle = p.find('iframe').first().attr('title') || `America's Best Hearing ${address}`;
    const slug = (appointmentUrl.match(/request-an-appointment-(.*?)\//) || [])[1] || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (name && address) rows.push({ slug, name, address, phone, appointmentUrl, directionsUrl, googleMapsQuery: mapTitle, sortOrder: index + 1 });
  });
  return rows;
}

const rows = extractLocations();
if (!rows.length) throw new Error('No homepage locations found.');

const seedPath = 'seed/seed.json';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const collection = seed.collections.find((item) => item.slug === 'locations');
if (!collection) throw new Error('Locations collection not found.');
if (!collection.fields.some((field) => field.slug === 'google_maps_query')) {
  const index = collection.fields.findIndex((field) => field.slug === 'directions_url');
  collection.fields.splice(index >= 0 ? index + 1 : collection.fields.length, 0, {
    slug: 'google_maps_query',
    label: 'Google Maps Query',
    type: 'text'
  });
}
seed.content.locations = rows.map((row) => ({
  id: row.slug,
  slug: row.slug,
  status: 'published',
  data: {
    name: row.name,
    address: row.address,
    phone: row.phone,
    appointment_url: row.appointmentUrl,
    directions_url: row.directionsUrl,
    google_maps_query: row.googleMapsQuery,
    sort_order: row.sortOrder
  }
}));
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');

const defaultsPath = 'src/data/homepage-defaults.ts';
let defaults = fs.readFileSync(defaultsPath, 'utf8');
const start = defaults.indexOf('export const locations = [');
const end = defaults.indexOf('export const faqs = [');
if (start === -1 || end === -1) throw new Error('Could not find locations block in homepage defaults.');
const block = `export const locations = [\n${rows.map((row) => `\t${JSON.stringify([row.slug, row.name, row.address, row.phone, row.appointmentUrl, row.directionsUrl, row.googleMapsQuery])},`).join('\n')}\n].map(([id, name, address, phone, appointmentUrl, directionsUrl, googleMapsQuery], index) => ({\n\tid,\n\tname,\n\taddress,\n\tphone,\n\tappointmentUrl,\n\tdirectionsUrl,\n\tgoogleMapsQuery,\n\tsortOrder: index + 1,\n}));\n\n`;
defaults = defaults.slice(0, start) + block + defaults.slice(end);
fs.writeFileSync(defaultsPath, defaults);
console.log(`Configured ${rows.length} location entries with google_maps_query.`);
