const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { load } = require('cheerio');

const BASE = 'https://americasbesthearing.com/';
const SITEMAPS = [
  'https://americasbesthearing.com/post-sitemap.xml',
  'https://americasbesthearing.com/page-sitemap.xml',
  'https://americasbesthearing.com/location-sitemap.xml',
  'https://americasbesthearing.com/local-sitemap.xml',
];
const OUT = path.resolve('local-copy');
const ASSETS = path.join(OUT, 'assets');
const DIRS = {
  media: path.join(ASSETS, 'media'),
  styles: path.join(ASSETS, 'styles'),
  js: path.join(ASSETS, 'js'),
  fonts: path.join(ASSETS, 'fonts'),
  other: path.join(ASSETS, 'other'),
};
for (const d of [OUT, ...Object.values(DIRS)]) fs.mkdirSync(d, { recursive: true });

const assetMap = new Map();
const pages = [];
const pageSet = new Set();

function norm(u) {
  const x = new URL(u, BASE);
  x.hash = '';
  x.search = '';
  x.hostname = x.hostname.toLowerCase();
  if (x.pathname !== '/' && x.pathname.endsWith('/')) x.pathname = x.pathname.slice(0, -1);
  return x.toString();
}
function internal(u) {
  const h = new URL(u).hostname.toLowerCase();
  return h === 'americasbesthearing.com' || h === 'www.americasbesthearing.com';
}
function pagePath(u) {
  const x = new URL(u);
  if (x.pathname === '/') return path.join(OUT, 'index.html');
  return path.join(OUT, x.pathname.replace(/^\/+|\/+$/g, ''), 'index.html');
}
function pickDir(assetUrl) {
  const ext = path.extname(new URL(assetUrl).pathname).toLowerCase();
  if (['.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.ico'].includes(ext)) return DIRS.media;
  if (ext === '.css') return DIRS.styles;
  if (['.js','.mjs'].includes(ext)) return DIRS.js;
  if (['.woff','.woff2','.ttf','.otf','.eot'].includes(ext)) return DIRS.fonts;
  return DIRS.other;
}
function fileForAsset(assetUrl) {
  if (assetMap.has(assetUrl)) return assetMap.get(assetUrl);
  const u = new URL(assetUrl);
  const base = path.basename(u.pathname) || 'file';
  const ext = path.extname(base);
  const stem = path.basename(base, ext).replace(/[^a-zA-Z0-9._-]/g, '-') || 'file';
  const h = crypto.createHash('md5').update(assetUrl).digest('hex').slice(0, 10);
  const fp = path.join(pickDir(assetUrl), `${stem}-${h}${ext}`);
  assetMap.set(assetUrl, fp);
  return fp;
}
function rel(fromFile, toFile) {
  return path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
}
async function fetchText(u) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25000);
  const r = await fetch(u, { headers: { 'user-agent': 'local-copy-exporter/1.0' }, signal: controller.signal });
  clearTimeout(t);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}
async function fetchBin(u) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25000);
    const r = await fetch(u, { headers: { 'user-agent': 'local-copy-exporter/1.0' }, signal: controller.signal });
    clearTimeout(t);
    if (!r.ok) return;
    const fp = fileForAsset(u);
    if (fs.existsSync(fp)) return;
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(fp, buf);
  } catch {}
}
function astroCleanName(s) {
  if (!s) return s;
  return s.replace(/^wp-/, 'astro-').replace(/wp_/g, 'astro_').replace(/elementor/g, 'astro');
}
async function localizeCss(cssAbsUrl) {
  await fetchBin(cssAbsUrl);
  const fp = fileForAsset(cssAbsUrl);
  if (!fs.existsSync(fp)) return;
  let txt = fs.readFileSync(fp, 'utf8');
  const urls = [...txt.matchAll(/url\(([^)]+)\)/g)];
  for (const m of urls) {
    const raw = m[1].trim().replace(/^['"]|['"]$/g, '');
    if (!raw || raw.startsWith('data:') || raw.startsWith('#')) continue;
    let abs;
    try { abs = norm(new URL(raw, cssAbsUrl).toString()); } catch { continue; }
    if (!internal(abs)) continue;
    await fetchBin(abs);
    const target = fileForAsset(abs);
    const rp = path.relative(path.dirname(fp), target).replace(/\\/g, '/');
    txt = txt.replace(m[0], `url('${rp}')`);
  }
  txt = txt.replace(/elementor/g, 'astro').replace(/\bwp-/g, 'astro-').replace(/wp_/g, 'astro_');
  fs.writeFileSync(fp, txt, 'utf8');
}

async function getPagesFromSitemaps() {
  const out = new Set([norm(BASE)]);
  for (const sm of SITEMAPS) {
    const xml = await fetchText(sm);
    const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1]);
    for (const u of matches) {
      const n = norm(u);
      if (internal(n)) out.add(n);
    }
  }
  return [...out];
}

async function processPage(u, allPages) {
  const html = await fetchText(u);
  const $ = load(html, { decodeEntities: false });
  const out = pagePath(u);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  $('script[src]').each((_, el) => {
    const src = ($(el).attr('src') || '').toLowerCase();
    if (src.includes('wp-json') || src.includes('elementor') || src.includes('wp-content/plugins') || src.includes('emoji') || src.includes('jetpack') || src.includes('wpcf7')) {
      $(el).remove();
    }
  });

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs;
    try { abs = norm(new URL(href, u).toString()); } catch { return; }
    if (!internal(abs)) return;
    if (!allPages.has(abs)) return;
    const target = pagePath(abs);
    let r = rel(out, target);
    if (r.endsWith('index.html')) r = r.slice(0, -10);
    if (!r) r = './';
    if (!r.endsWith('/')) r += '/';
    $(el).attr('href', r);
  });

  for (const el of $('[src], [poster]').toArray()) {
    for (const a of ['src','poster']) {
      const v = $(el).attr(a);
      if (!v) continue;
      let abs;
      try { abs = norm(new URL(v, u).toString()); } catch { continue; }
      if (!internal(abs)) continue;
      await fetchBin(abs);
      $(el).attr(a, rel(out, fileForAsset(abs)));
    }
  }

  for (const el of $('link[href]').toArray()) {
    const href = $(el).attr('href');
    if (!href) continue;
    let abs;
    try { abs = norm(new URL(href, u).toString()); } catch { continue; }
    if (!internal(abs)) continue;
    await fetchBin(abs);
    const relp = rel(out, fileForAsset(abs));
    $(el).attr('href', relp);
    const relAttr = ($(el).attr('rel') || '').toLowerCase();
    if (relAttr.includes('stylesheet')) await localizeCss(abs);
  }

  for (const el of $('[srcset]').toArray()) {
    const val = $(el).attr('srcset') || '';
    const items = val.split(',').map(s => s.trim()).filter(Boolean);
    const outItems = [];
    for (const item of items) {
      const bits = item.split(/\s+/);
      let abs;
      try { abs = norm(new URL(bits[0], u).toString()); } catch { outItems.push(item); continue; }
      if (internal(abs)) {
        await fetchBin(abs);
        bits[0] = rel(out, fileForAsset(abs));
      }
      outItems.push(bits.join(' '));
    }
    $(el).attr('srcset', outItems.join(', '));
  }

  $('form').each((_, form) => {
    $(form).attr('action', 'javascript:void(0)');
    $(form).attr('method', 'get');
    $(form).attr('onsubmit', 'return false;');
  });

  $('*').each((_, el) => {
    const cls = ($(el).attr('class') || '').split(/\s+/).filter(Boolean).map(astroCleanName);
    if (cls.length) $(el).attr('class', cls.join(' '));
    const id = $(el).attr('id');
    if (id) $(el).attr('id', astroCleanName(id));

    const at = el.attribs || {};
    for (const k of Object.keys(at)) {
      let nk = k;
      if (nk.includes('elementor')) nk = nk.replace(/elementor/g, 'astro');
      if (nk.startsWith('data-wp-')) nk = nk.replace(/^data-wp-/, 'data-astro-');
      if (nk !== k) {
        const v = $(el).attr(k);
        $(el).removeAttr(k);
        $(el).attr(nk, v);
      }
    }
  });

  fs.writeFileSync(out, $.html(), 'utf8');
  pages.push({ url: u, file: path.relative(OUT, out).replace(/\\/g, '/') });
  console.log('saved', u);
}

(async () => {
  for (const d of [OUT, ...Object.values(DIRS)]) fs.mkdirSync(d, { recursive: true });

  const all = await getPagesFromSitemaps();
  const allSet = new Set(all);
  for (const p of all) pageSet.add(p);

  for (const p of all) {
    const existing = pagePath(p);
    if (fs.existsSync(existing)) {
      pages.push({ url: p, file: path.relative(OUT, existing).replace(/\\\\/g, '/') });
      continue;
    }
    try {
      await processPage(p, allSet);
    } catch (e) {
      console.log('skip', p, e.message);
    }
    fs.writeFileSync(path.join(OUT, 'export-manifest.json'), JSON.stringify({
      base: BASE,
      page_count: pages.length,
      discovered_page_count: all.length,
      asset_count: assetMap.size,
      pages,
    }, null, 2));
  }

  fs.writeFileSync(path.join(OUT, 'export-manifest.json'), JSON.stringify({
    base: BASE,
    page_count: pages.length,
    discovered_page_count: all.length,
    asset_count: assetMap.size,
    pages,
  }, null, 2));

  console.log(`done pages=${pages.length}/${all.length} assets=${assetMap.size}`);
})();
