const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { load } = require('cheerio');

const ROOT = path.resolve('local-copy');
const ASSETS = path.join(ROOT, 'assets');
const BASE = 'https://americasbesthearing.com/';
const LOCATION_URLS = [
  'https://americasbesthearing.com/audiologist-hearing-aids-anoka-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-eden-prairie-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-edina-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-lake-wales-fl/',
  'https://americasbesthearing.com/audiologist-hearing-aids-lansing-mi/',
  'https://americasbesthearing.com/audiologist-hearing-aids-maple-grove-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-mendota-heights-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-new-ulm-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-portage-mi/',
  'https://americasbesthearing.com/audiologist-hearing-aids-roseville-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-sebring-fl/',
  'https://americasbesthearing.com/audiologist-hearing-aids-willmar-mn/',
  'https://americasbesthearing.com/audiologist-hearing-aids-winter-haven-fl/',
];

const DIRS = {
  media: path.join(ASSETS, 'media'),
  styles: path.join(ASSETS, 'styles'),
  js: path.join(ASSETS, 'js'),
  fonts: path.join(ASSETS, 'fonts'),
  other: path.join(ASSETS, 'other'),
};

for (const d of Object.values(DIRS)) {
  fs.mkdirSync(d, { recursive: true });
}

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 10);
}

function norm(url) {
  const x = new URL(url, BASE);
  x.hash = '';
  x.search = '';
  x.hostname = x.hostname.toLowerCase();
  if (x.pathname !== '/' && x.pathname.endsWith('/')) x.pathname = x.pathname.slice(0, -1);
  return x.toString();
}

function internal(url) {
  const host = new URL(url).hostname.toLowerCase();
  return host === 'americasbesthearing.com' || host === 'www.americasbesthearing.com';
}

function pagePath(url) {
  const x = new URL(url);
  if (x.pathname === '/') return path.join(ROOT, 'index.html');
  return path.join(ROOT, x.pathname.replace(/^\/+|\/+$/g, ''), 'index.html');
}

function rel(fromFile, toFile) {
  return path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
}

function astroCleanName(value) {
  if (!value) return value;
  return value.replace(/^wp-/, 'astro-').replace(/wp_/g, 'astro_').replace(/elementor/g, 'astro');
}

function pickDir(assetUrl) {
  const ext = path.extname(new URL(assetUrl).pathname).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'].includes(ext)) return DIRS.media;
  if (ext === '.css') return DIRS.styles;
  if (['.js', '.mjs'].includes(ext)) return DIRS.js;
  if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) return DIRS.fonts;
  return DIRS.other;
}

function fileForAsset(assetUrl) {
  const u = new URL(assetUrl);
  const base = path.basename(u.pathname) || 'file';
  const ext = path.extname(base);
  const stem = path.basename(base, ext).replace(/[^a-zA-Z0-9._-]/g, '-') || 'file';
  return path.join(pickDir(assetUrl), `${stem}-${md5(u.origin + u.pathname)}${ext}`);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'local-copy-exporter/1.0' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return await response.text();
}

async function fetchBin(url) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'local-copy-exporter/1.0' } });
    if (!response.ok) return;
    const target = fileForAsset(url);
    if (fs.existsSync(target)) return;
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  } catch {
    // Keep the page build going if a non-critical asset fails.
  }
}

async function localizeCss(cssAbsUrl) {
  await fetchBin(cssAbsUrl);
  const target = fileForAsset(cssAbsUrl);
  if (!fs.existsSync(target)) return;

  let css = fs.readFileSync(target, 'utf8');
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)];
  for (const match of urls) {
    const raw = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (!raw || raw.startsWith('data:') || raw.startsWith('#')) continue;
    let abs;
    try {
      abs = norm(new URL(raw, cssAbsUrl).toString());
    } catch {
      continue;
    }
    if (!internal(abs)) continue;
    await fetchBin(abs);
    const assetTarget = fileForAsset(abs);
    const assetRel = path.relative(path.dirname(target), assetTarget).replace(/\\/g, '/');
    css = css.replace(match[0], `url('${assetRel}')`);
  }

  css = css.replace(/elementor/g, 'astro').replace(/\bwp-/g, 'astro-').replace(/wp_/g, 'astro_');
  fs.writeFileSync(target, css, 'utf8');
}

function loadAllPageUrls() {
  const manifestPath = path.join(ROOT, 'export-manifest.json');
  const urls = new Set(LOCATION_URLS.map((url) => norm(url)));
  if (!fs.existsSync(manifestPath)) return urls;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const page of manifest.pages || []) {
    if (page.url) urls.add(norm(page.url));
  }
  return urls;
}

function removeVieraItems($) {
  $('a[href*="location/viera-fl"], a[href*="/audiologist-hearing-aids-viera-fl/"]').each((_, link) => {
    $(link).closest('li').remove();
  });
}

function applyLocationMenuFixes($) {
  $('body, .astro-icon-list-text, .elementor-icon-list-text').each((_, el) => {
    const html = $(el).html();
    if (!html) return;
    $(el).html(
      html
        .replaceAll('14 Locations in Michigan, Minnesota, &amp; Florida', '13 Locations in Michigan, Minnesota, &amp; Florida')
        .replaceAll('14 Locations in Michigan, Minnesota, & Florida', '13 Locations in Michigan, Minnesota, & Florida')
    );
  });
  removeVieraItems($);
}

async function cleanLocationPage(url, allPages) {
  const html = await fetchText(url);
  const $ = load(html, { decodeEntities: false });
  const out = pagePath(url);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  $('script[src]').each((_, el) => {
    const src = ($(el).attr('src') || '').toLowerCase();
    if (
      src.includes('wp-json') ||
      src.includes('elementor') ||
      src.includes('wp-content/plugins') ||
      src.includes('emoji') ||
      src.includes('jetpack') ||
      src.includes('wpcf7')
    ) {
      $(el).remove();
    }
  });

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs;
    try {
      abs = norm(new URL(href, url).toString());
    } catch {
      return;
    }
    if (!internal(abs)) return;
    if (!allPages.has(abs)) return;

    const target = pagePath(abs);
    let nextHref = rel(out, target);
    if (nextHref.endsWith('index.html')) nextHref = nextHref.slice(0, -10);
    if (!nextHref) nextHref = './';
    if (!nextHref.endsWith('/')) nextHref += '/';
    $(el).attr('href', nextHref);
  });

  for (const el of $('[src], [poster]').toArray()) {
    for (const attr of ['src', 'poster']) {
      const value = $(el).attr(attr);
      if (!value) continue;
      let abs;
      try {
        abs = norm(new URL(value, url).toString());
      } catch {
        continue;
      }
      if (!internal(abs)) continue;
      await fetchBin(abs);
      $(el).attr(attr, rel(out, fileForAsset(abs)));
    }
  }

  for (const el of $('link[href]').toArray()) {
    const href = $(el).attr('href');
    if (!href) continue;
    let abs;
    try {
      abs = norm(new URL(href, url).toString());
    } catch {
      continue;
    }
    if (!internal(abs)) continue;
    await fetchBin(abs);
    const nextHref = rel(out, fileForAsset(abs));
    $(el).attr('href', nextHref);
    const relAttr = ($(el).attr('rel') || '').toLowerCase();
    if (relAttr.includes('stylesheet')) await localizeCss(abs);
  }

  for (const el of $('[srcset]').toArray()) {
    const parts = ($(el).attr('srcset') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const nextParts = [];
    for (const part of parts) {
      const bits = part.split(/\s+/);
      let abs;
      try {
        abs = norm(new URL(bits[0], url).toString());
      } catch {
        nextParts.push(part);
        continue;
      }
      if (internal(abs)) {
        await fetchBin(abs);
        bits[0] = rel(out, fileForAsset(abs));
      }
      nextParts.push(bits.join(' '));
    }
    $(el).attr('srcset', nextParts.join(', '));
  }

  $('form').each((_, form) => {
    $(form).attr('action', 'javascript:void(0)');
    $(form).attr('method', 'get');
    $(form).attr('onsubmit', 'return false;');
  });

  $('*').each((_, el) => {
    const classList = ($(el).attr('class') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map(astroCleanName);
    if (classList.length) $(el).attr('class', classList.join(' '));

    const id = $(el).attr('id');
    if (id) $(el).attr('id', astroCleanName(id));

    const attrs = el.attribs || {};
    for (const key of Object.keys(attrs)) {
      let nextKey = key;
      if (nextKey.includes('elementor')) nextKey = nextKey.replace(/elementor/g, 'astro');
      if (nextKey.startsWith('data-wp-')) nextKey = nextKey.replace(/^data-wp-/, 'data-astro-');
      if (nextKey !== key) {
        const value = $(el).attr(key);
        $(el).removeAttr(key);
        $(el).attr(nextKey, value);
      }
    }
  });

  applyLocationMenuFixes($);

  let output = $.html();
  if (!/^<!doctype/i.test(output.trim())) {
    output = `<!doctype html>${output}`;
  }
  fs.writeFileSync(out, output, 'utf8');
  console.log(`cleaned ${url}`);
}

function needsCleaning(url) {
  const out = pagePath(url);
  if (!fs.existsSync(out)) return true;
  const html = fs.readFileSync(out, 'utf8');
  return !(
    html.includes('astro-location-header') &&
    html.includes('13 Locations in Michigan, Minnesota') &&
    !html.includes('Viera, FL') &&
    !html.includes('elementor-location-header')
  );
}

async function main() {
  const allPages = loadAllPageUrls();
  for (const url of LOCATION_URLS) {
    if (!needsCleaning(url)) {
      console.log(`skipped ${url}`);
      continue;
    }
    await cleanLocationPage(url, allPages);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
