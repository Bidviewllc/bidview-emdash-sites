const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'audit', 'firecrawl-2026-05-13');
const LIVE_ORIGIN = 'https://americasbesthearing.com';
const SITEMAP_INDEX = `${LIVE_ORIGIN}/sitemap_index.xml`;
const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v2';

function loadEnv() {
  const envPath = path.join(ROOT, '.env.firecrawl.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && val && !process.env[key]) process.env[key] = val;
  }
}
loadEnv();
const API_KEY = process.env.FIRECRAWL_API_KEY;
if (!API_KEY) throw new Error('FIRECRAWL_API_KEY not available');
fs.mkdirSync(OUT_DIR, { recursive: true });

function unique(arr) { return [...new Set(arr)]; }
function xmlUrls(xml) { return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1].trim()); }
function routeFromUrl(url) {
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname);
  if (p === '/') return 'index.html';
  return p.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
}
function family(url) {
  const r = routeFromUrl(url);
  if (r === 'index.html') return 'Homepage';
  if (/^audiologist-hearing-aids-[^/]+\/index\.html$/.test(r)) return 'Location Page Template Family';
  if (/^request-an-appointment(?:-[^/]+)?\/index\.html$/.test(r)) return 'Request Appointment Pages';
  if (/^hearing-aids\/[^/]+\/index\.html$/.test(r)) return 'Hearing Aid Brand Page Template Family';
  if (/^(audiology-services|hearing-aids-products|custom-hearing-protection)\/index\.html$/.test(r) || /^audiology-services\//.test(r) || /^hearing-aids-products\//.test(r)) return 'Service Page Template Families';
  if (/^(audiologist|hearing-instrument-specialist|hearing-instrument-specialist-trainee|audiology-assistant|patient-care-coordinator)\//.test(r)) return 'Staff Profile Template Families';
  if (/^(about|contact|all-locations|our-team|news|resources|sitemap|terms-of-service|privacy-policy|thank-you|thank-you-for-contacting-us)\/index\.html$/.test(r)) return 'Utility/Hub Pages';
  return 'Blog/News Post Template Family or Other';
}
function localExistsForUrl(url) {
  return fs.existsSync(path.join(ROOT, 'local-copy', routeFromUrl(url)));
}
function markdownStats(markdown='') {
  const headings = [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => m[1].trim()).slice(0, 30);
  return { chars: markdown.length, words: (markdown.match(/\S+/g)||[]).length, headings };
}
async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Codex Firecrawl readiness audit (read-only)' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
  return res.text();
}
async function firecrawl(endpoint, body) {
  const res = await fetch(`${FIRECRAWL_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok || json.success === false) {
    const err = new Error(`Firecrawl ${endpoint} failed: ${res.status} ${text.slice(0, 500)}`);
    err.status = res.status;
    err.response = json;
    throw err;
  }
  return json;
}
async function scrape(url) {
  return firecrawl('/scrape', {
    url,
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    removeBase64Images: true,
    blockAds: true,
    timeout: 60000,
    location: { country: 'US', languages: ['en-US'] }
  });
}
function chooseSampleUrls(urls) {
  const wanted = [
    '/',
    '/audiologist-hearing-aids-lansing-mi/',
    '/audiology-services/',
    '/hearing-aids/phonak/',
    '/hyperacusis-when-everyday-sounds-feel-too-loud/',
    '/about/',
    '/contact/',
    '/all-locations/',
    '/request-an-appointment/',
    '/our-team/'
  ];
  const byPath = new Map(urls.map(u => [new URL(u).pathname, u]));
  const picked = wanted.map(p => byPath.get(p)).filter(Boolean);
  for (const fam of ['Staff Profile Template Families','Service Page Template Families','Hearing Aid Brand Page Template Family','Blog/News Post Template Family or Other']) {
    const u = urls.find(x => family(x) === fam && !picked.includes(x));
    if (u) picked.push(u);
  }
  return unique(picked).slice(0, 14);
}

(async () => {
  const startedAt = new Date().toISOString();
  const sitemapIndexXml = await fetchText(SITEMAP_INDEX);
  const childSitemaps = xmlUrls(sitemapIndexXml).filter(u => /sitemap/i.test(u));
  const sitemapUrls = [];
  for (const sm of childSitemaps) sitemapUrls.push(...xmlUrls(await fetchText(sm)).filter(u => u.startsWith(LIVE_ORIGIN)));
  const liveSitemapUrls = unique(sitemapUrls).sort();

  let mapResult = null;
  let mapLinks = [];
  try {
    mapResult = await firecrawl('/map', {
      url: LIVE_ORIGIN,
      sitemap: 'include',
      includeSubdomains: false,
      ignoreQueryParameters: true,
      limit: 5000,
      timeout: 60000,
      location: { country: 'US', languages: ['en-US'] }
    });
    mapLinks = (mapResult.links || []).map(x => typeof x === 'string' ? x : x.url).filter(Boolean)
      .filter(u => {
        try { return new URL(u).hostname.replace(/^www\./,'') === 'americasbesthearing.com'; } catch { return false; }
      });
    mapLinks = unique(mapLinks).sort();
  } catch (err) {
    mapResult = { error: err.message, status: err.status, response: err.response };
  }

  const sitemapSet = new Set(liveSitemapUrls.map(routeFromUrl));
  const mapSet = new Set(mapLinks.map(routeFromUrl));
  const mapOnly = mapLinks.filter(u => !sitemapSet.has(routeFromUrl(u)));
  const sitemapOnly = liveSitemapUrls.filter(u => !mapSet.has(routeFromUrl(u)));

  const samples = chooseSampleUrls(liveSitemapUrls);
  const scrapeResults = [];
  for (const url of samples) {
    try {
      const result = await scrape(url);
      const data = result.data || {};
      scrapeResults.push({
        url,
        route: routeFromUrl(url),
        family: family(url),
        localExists: localExistsForUrl(url),
        success: true,
        metadata: {
          title: data.metadata?.title || '',
          description: data.metadata?.description || '',
          statusCode: data.metadata?.statusCode,
          sourceURL: data.metadata?.sourceURL || data.metadata?.url || ''
        },
        markdown: markdownStats(data.markdown || ''),
        linkCount: Array.isArray(data.links) ? data.links.length : 0
      });
      fs.writeFileSync(path.join(OUT_DIR, encodeURIComponent(routeFromUrl(url).replace(/\/index\.html$/, '') || 'home') + '.md'), data.markdown || '');
      await new Promise(r => setTimeout(r, 350));
    } catch (err) {
      scrapeResults.push({ url, route: routeFromUrl(url), family: family(url), localExists: localExistsForUrl(url), success: false, error: err.message });
    }
  }

  const familyCounts = {};
  for (const u of liveSitemapUrls) familyCounts[family(u)] = (familyCounts[family(u)] || 0) + 1;

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    source: 'Firecrawl v2 map + selected v2 scrape, plus live XML sitemap',
    readOnly: true,
    liveSitemap: { index: SITEMAP_INDEX, childSitemaps, urlCount: liveSitemapUrls.length, urls: liveSitemapUrls },
    firecrawlMap: { success: !mapResult?.error, discoveredCount: mapLinks.length, urls: mapLinks, error: mapResult?.error || null },
    comparison: {
      mapOnlyCount: mapOnly.length,
      mapOnly,
      sitemapOnlyCount: sitemapOnly.length,
      sitemapOnly,
      missingLocalFromSitemap: liveSitemapUrls.filter(u => !localExistsForUrl(u)).map(u => ({ url: u, route: routeFromUrl(u), family: family(u) })),
      missingLocalFromMap: mapLinks.filter(u => !localExistsForUrl(u)).map(u => ({ url: u, route: routeFromUrl(u), family: family(u) }))
    },
    collectionInventory: familyCounts,
    scrapedSamples: scrapeResults
  };
  fs.writeFileSync(path.join(OUT_DIR, 'firecrawl-inventory.json'), JSON.stringify(report, null, 2));

  const md = [];
  md.push('# Firecrawl Live Inventory Audit');
  md.push('');
  md.push(`Generated: ${report.generatedAt}`);
  md.push('');
  md.push('## Scope');
  md.push('- Read-only Firecrawl audit against the public live website.');
  md.push('- No local site HTML/CSS/JS/layout files were modified.');
  md.push('- Used Firecrawl `v2/map` plus selected `v2/scrape` calls for Markdown/metadata samples.');
  md.push('');
  md.push('## URL Discovery');
  md.push(`- XML sitemap URLs: ${liveSitemapUrls.length}`);
  md.push(`- Firecrawl map URLs: ${mapLinks.length}`);
  md.push(`- Firecrawl-only URLs not in XML sitemap: ${mapOnly.length}`);
  md.push(`- XML-sitemap-only URLs not returned by Firecrawl map: ${sitemapOnly.length}`);
  md.push('');
  md.push('## Collection Inventory From Live Sitemap');
  Object.entries(familyCounts).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => md.push(`- ${k}: ${v}`));
  md.push('');
  md.push('## Missing Local Coverage');
  md.push('### From XML Sitemap');
  if (report.comparison.missingLocalFromSitemap.length) report.comparison.missingLocalFromSitemap.forEach(x => md.push(`- ${x.route} (${x.family}) -> ${x.url}`)); else md.push('- None.');
  md.push('### From Firecrawl Map');
  if (report.comparison.missingLocalFromMap.length) report.comparison.missingLocalFromMap.slice(0,100).forEach(x => md.push(`- ${x.route} (${x.family}) -> ${x.url}`)); else md.push('- None.');
  if (report.comparison.missingLocalFromMap.length > 100) md.push(`- ...and ${report.comparison.missingLocalFromMap.length - 100} more in JSON.`);
  md.push('');
  md.push('## Firecrawl-Only URLs');
  if (mapOnly.length) mapOnly.slice(0,100).forEach(u => md.push(`- ${u}`)); else md.push('- None.');
  if (mapOnly.length > 100) md.push(`- ...and ${mapOnly.length - 100} more in JSON.`);
  md.push('');
  md.push('## Scraped Markdown/Metadata Samples');
  for (const s of scrapeResults) {
    md.push(`### ${s.route}`);
    md.push(`- Family: ${s.family}`);
    md.push(`- Local exists: ${s.localExists}`);
    md.push(`- Success: ${s.success}`);
    if (s.success) {
      md.push(`- Title: ${s.metadata.title}`);
      md.push(`- Description: ${s.metadata.description}`);
      md.push(`- Markdown words: ${s.markdown.words}`);
      md.push(`- Headings: ${s.markdown.headings.slice(0,8).join(' | ') || 'None detected'}`);
    } else {
      md.push(`- Error: ${s.error}`);
    }
    md.push('');
  }
  md.push('## Recommended Use For EmDash Wiring');
  md.push('1. Treat XML sitemap as the canonical public migration list unless Firecrawl-only URLs are intentionally public pages.');
  md.push('2. Use scraped Markdown samples to design collection fields and Portable Text migration rules, not as final visual HTML.');
  md.push('3. Keep existing templates; use this report to map content into locations, staff, services, brands, posts, utility pages, and appointment pages.');
  md.push('4. Re-run this after cleanup to confirm stale Dunedin/Viera pages are no longer in live sitemap if they are removed upstream.');
  fs.writeFileSync(path.join(OUT_DIR, 'FIRECRAWL-LIVE-INVENTORY.md'), md.join('\n'));

  console.log(JSON.stringify({
    outDir: path.relative(ROOT, OUT_DIR),
    sitemapUrls: liveSitemapUrls.length,
    firecrawlMapUrls: mapLinks.length,
    mapOnly: mapOnly.length,
    sitemapOnly: sitemapOnly.length,
    missingLocalFromSitemap: report.comparison.missingLocalFromSitemap.length,
    missingLocalFromMap: report.comparison.missingLocalFromMap.length,
    scrapedSamples: scrapeResults.length,
    scrapeFailures: scrapeResults.filter(s=>!s.success).length
  }, null, 2));
})();
