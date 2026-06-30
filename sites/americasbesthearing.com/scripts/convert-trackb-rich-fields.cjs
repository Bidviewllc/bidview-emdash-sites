const fs = require('fs');
const path = 'seed/seed.json';
const seed = JSON.parse(fs.readFileSync(path, 'utf8'));

const portableFields = new Map([
  ['homepages', new Set(['intro_body', 'about_body', 'locations_body', 'faq_body', 'news_body'])],
  ['audiology_services', new Set(['body'])],
  ['hearing_aid_services', new Set(['body'])],
  ['faqs', new Set(['answer'])],
  ['testimonials', new Set(['quote'])],
]);

function textToPortableText(value) {
  if (!value || Array.isArray(value)) return value;
  return String(value)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      _type: 'block',
      _key: `block-${index + 1}`,
      style: 'normal',
      children: [{ _type: 'span', _key: `span-${index + 1}`, text: paragraph, marks: [] }],
      markDefs: [],
    }));
}

for (const collection of seed.collections || []) {
  const slug = collection.slug || collection.name;
  const names = portableFields.get(slug);
  if (!names) continue;
  for (const field of collection.fields || []) {
    const fieldSlug = field.slug || field.name;
    if (names.has(fieldSlug)) field.type = 'portableText';
  }
}

for (const [collectionSlug, entries] of Object.entries(seed.content || {})) {
  const names = portableFields.get(collectionSlug);
  if (!names || !Array.isArray(entries)) continue;
  for (const item of entries) {
    for (const name of names) {
      if (item.data && Object.prototype.hasOwnProperty.call(item.data, name)) {
        item.data[name] = textToPortableText(item.data[name]);
      }
    }
  }
}

const toServiceEntries = (rows) => rows.map(([slug, title, body], index) => ({
  id: slug,
  slug,
  status: 'published',
  data: {
    title,
    body: textToPortableText(body),
    sort_order: index + 1,
  },
}));

seed.content.audiology_services = seed.content.audiology_services || toServiceEntries([
  ['hearing-evaluations', 'Hearing Evaluations', "America's Best Hearing provides hearing evaluations to better understand your hearing and recommend the right next steps."],
  ['ear-wax-removal', 'Ear Wax Removal', 'We offer professional ear wax removal to help address buildup that may affect hearing or comfort.'],
  ['hearing-aid-services', 'Hearing Aid Services', 'Our team provides hearing aid maintenance, adjustments, and ongoing support.'],
  ['hearing-aid-fittings', 'Hearing Aid Fittings', 'Our specialists fit and program hearing aids so your devices support your everyday listening needs.'],
  ['hearing-aid-cleaning-and-repair', 'Hearing Aid Cleaning and Repair', 'We help keep hearing aids working their best with cleaning, troubleshooting, and repair support.'],
]);
seed.content.hearing_aid_services = seed.content.hearing_aid_services || toServiceEntries([
  ['hearing-protection', 'Hearing Protection', 'Protect your hearing with custom solutions for work, music, water, and recreational noise exposure.'],
  ['hearing-protection-for-musicians', 'Hearing Protection for Musicians', 'Musician hearing protection helps reduce volume while preserving the clarity of music.'],
  ['hearing-protection-for-hunters', 'Hearing Protection for Hunters', 'Hunter hearing protection helps reduce damaging impulse noise while supporting awareness outdoors.'],
  ['hearing-aids', 'Hearing Aids', 'We help patients compare hearing aid options and choose technology that fits their lifestyle.'],
  ['hearing-aid-batteries-and-accessories', 'Hearing Aid Batteries and Accessories', 'Find batteries, domes, filters, and accessories to keep hearing aids ready for daily use.'],
  ['assistive-listening-devices', 'Assistive Listening Devices', 'Assistive listening devices can improve communication in specific settings and pair well with hearing aids.'],
]);
delete seed.content.service_items;

fs.writeFileSync(path, JSON.stringify(seed, null, 2) + '\n');
