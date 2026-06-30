const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = process.cwd();
const LOCAL = path.join(ROOT, 'local-copy');
const LIVE_ORIGIN = 'https://americasbesthearing.com';
const SITEMAP_INDEX = `${LIVE_ORIGIN}/sitemap_index.xml`;
const NOW = new Date().toISOString();
const REPORT_MD = path.join(ROOT, 'EMDASH-READINESS-AUDIT-2026-05-13.md');
const REPORT_JSON = path.join(ROOT, 'EMDASH-READINESS-AUDIT-2026-05-13.json');

const SITE_EXCLUDE_DIRS = new Set(['assets', 'wp-includes', '_location-family-backup-20260513-065535', '_location-family-preclean-20260513-070441']);
const SKIP_PROTOCOLS = /^(mailto:|tel:|sms:|javascript:|data:|blob:)/i;
const INTENTIONAL_EXTERNAL_HINTS = [
  'maps.google.', 'google.com/maps', 'googletagmanager.com', 'google-analytics.com',
  'gstatic.com', 'googleapis.com', 'schema.org', 'facebook.com', 'youtube.com',
  'linkedin.com', 'instagram.com', 'elfsightcdn.com', 'cdn.jsdelivr.net'
];

function read(file) { return fs.readFileSync(file, 'utf8'); }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function toPosix(p) { return p.split(path.sep).join('/'); }
function rel(file) { return toPosix(path.relative(ROOT, file)); }
function unique(arr) { return [...new Set(arr)]; }
function sortObj(obj) { return Object.fromEntries(Object.entries(obj).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))); }
function countPush(map, key) { map[key] = (map[key] || 0) + 1; }
function clip(s, n=140) { return String(s).replace(/\s+/g, ' ').trim().slice(0, n); }
function xmlUrls(xml) { return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1].trim()); }
function routeFromLiveUrl(url) {
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname);
  if (p === '/') return 'index.html';
  p = p.replace(/^\//, '').replace(/\/$/, '');
  return `${p}/index.html`;
}
function routeToLivePathFromLocalIndex(file) {
  const r = toPosix(path.relative(LOCAL, file));
  if (r === 'index.html') return '/';
  return '/' + r.replace(/\/index\.html$/, '/') ;
}
function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (dir === LOCAL && SITE_EXCLUDE_DIRS.has(ent.name)) continue;
      walk(full, out);
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
  return out;
}
function pageFamily(route) {
  if (route === 'index.html') return 'Homepage';
  if (/^audiologist-hearing-aids-[^/]+\/index\.html$/.test(route)) return 'Location Page Template Family';
  if (/^request-an-appointment(?:-[^/]+)?\/index\.html$/.test(route)) return 'Request Appointment Pages';
  if (/^hearing-aids\/[^/]+\/index\.html$/.test(route)) return 'Hearing Aid Brand Page Template Family';
  if (/^(audiology-services|hearing-aids-products|custom-hearing-protection)\/index\.html$/.test(route)) return 'Service Page Template Families';
  if (/^(audiologist|hearing-instrument-specialist|hearing-instrument-specialist-trainee|audiology-assistant|patient-care-coordinator)\//.test(route)) return 'Staff Profile Template Families';
  if (/^(about|contact|all-locations|our-team|news|resources|sitemap|terms-of-service|privacy-policy|thank-you|thank-you-for-contacting-us)\/index\.html$/.test(route)) return 'Utility/Hub Pages';
  return 'Blog/News Post Template Family or Other';
}
function attrValues(html, attr) {
  return [...html.matchAll(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'gi'))].map(m => m[1]);
}
function srcsetUrls(srcset) {
  return srcset.split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean);
}
function cleanUrl(raw) {
  return raw.replace(/&amp;/g, '&').trim();
}
function isIntentionalExternal(url) {
  const lower = url.toLowerCase();
  return INTENTIONAL_EXTERNAL_HINTS.some(h => lower.includes(h));
}
function resolveLocalTarget(fromFile, rawHref) {
  let href = cleanUrl(rawHref);
  if (!href || href.startsWith('#') || SKIP_PROTOCOLS.test(href)) return { skipped: true };
  if (href.startsWith('//')) return { external: true, url: 'https:' + href };
  let targetPath;
  try {
    if (/^https?:\/\//i.test(href)) {
      const u = new URL(href);
      if (u.hostname.replace(/^www\./, '') !== 'americasbesthearing.com') return { external: true, url: href };
      href = decodeURIComponent(u.pathname + u.search + u.hash);
    }
  } catch {
    return { malformed: true, url: href };
  }
  href = href.split('#')[0].split('?')[0];
  if (!href) return { skipped: true };
  href = href.replace(/^\//, '');
  if (/^https?:\/\//i.test(href)) return { external: true, url: href };

  const baseDir = path.dirname(fromFile);
  const resolved = rawHref.startsWith('/') || /^https?:\/\//i.test(rawHref)
    ? path.join(LOCAL, href)
    : path.resolve(baseDir, href);

  const candidates = [];
  candidates.push(resolved);
  if (href.endsWith('/')) candidates.push(path.join(resolved, 'index.html'));
  if (!path.extname(resolved)) candidates.push(path.join(resolved, 'index.html'));
  if (path.basename(resolved) === '') candidates.push(path.join(resolved, 'index.html'));
  const ok = candidates.some(exists);
  return { ok, target: rel(candidates.find(exists) || candidates[candidates.length - 1]), sourceHref: rawHref };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Codex EmDash readiness audit (read-only)' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return await res.text();
}

async function main() {
  const sitemap = { indexUrl: SITEMAP_INDEX, childSitemaps: [], liveUrls: [], errors: [] };
  try {
    const indexXml = await fetchText(SITEMAP_INDEX);
    sitemap.childSitemaps = xmlUrls(indexXml).filter(u => /sitemap/i.test(u));
    for (const sm of sitemap.childSitemaps) {
      try {
        const xml = await fetchText(sm);
        sitemap.liveUrls.push(...xmlUrls(xml).filter(u => u.startsWith(LIVE_ORIGIN)));
      } catch (err) {
        sitemap.errors.push(`${sm}: ${err.message}`);
      }
    }
    sitemap.liveUrls = unique(sitemap.liveUrls).sort();
  } catch (err) {
    sitemap.errors.push(`${SITEMAP_INDEX}: ${err.message}`);
  }

  const allFiles = walk(LOCAL);
  const htmlFilesAll = allFiles.filter(f => f.toLowerCase().endsWith('.html'));
  const pageFiles = htmlFilesAll.filter(f => path.basename(f).toLowerCase() === 'index.html');
  const strayHtmlFiles = htmlFilesAll.filter(f => path.basename(f).toLowerCase() !== 'index.html');
  const localRoutes = pageFiles.map(f => toPosix(path.relative(LOCAL, f))).sort();
  const localRouteSet = new Set(localRoutes);
  const liveRoutes = sitemap.liveUrls.map(routeFromLiveUrl).sort();
  const liveRouteSet = new Set(liveRoutes);
  const missingLocalFromLive = liveRoutes.filter(r => !localRouteSet.has(r));
  const extraLocalNotInLive = localRoutes.filter(r => !liveRouteSet.has(r));

  const familyCounts = {};
  localRoutes.forEach(r => countPush(familyCounts, pageFamily(r)));

  const brokenLinks = [];
  const externalLinks = {};
  const malformedLinks = [];
  for (const file of pageFiles) {
    const html = read(file);
    for (const href of attrValues(html, 'href')) {
      const r = resolveLocalTarget(file, href);
      if (r.external) countPush(externalLinks, new URL(r.url).hostname);
      else if (r.malformed) malformedLinks.push({ file: rel(file), href: r.url });
      else if (!r.skipped && !r.ok) brokenLinks.push({ file: rel(file), href, target: r.target });
    }
  }

  const assetReport = {
    externalByHost: {},
    abhLiveAssetRefs: [],
    wpContentRefs: [],
    wpJsonRefs: [],
    externalNonIntentional: []
  };
  const assetAttrs = ['src', 'href', 'action'];
  for (const file of pageFiles) {
    const html = read(file);
    const vals = [];
    for (const a of assetAttrs) vals.push(...attrValues(html, a));
    for (const ss of attrValues(html, 'srcset')) vals.push(...srcsetUrls(ss));
    for (const m of html.matchAll(/url\(([^)]+)\)/gi)) vals.push(m[1].replace(/["']/g, '').trim());
    for (const raw of vals) {
      const v = cleanUrl(raw);
      if (!/^https?:\/\//i.test(v)) continue;
      let host = '';
      try { host = new URL(v).hostname; } catch { continue; }
      countPush(assetReport.externalByHost, host);
      if (host.replace(/^www\./, '') === 'americasbesthearing.com') assetReport.abhLiveAssetRefs.push({ file: rel(file), url: v });
      if (v.includes('/wp-content/')) assetReport.wpContentRefs.push({ file: rel(file), url: v });
      if (v.includes('/wp-json/')) assetReport.wpJsonRefs.push({ file: rel(file), url: v });
      if (!isIntentionalExternal(v) && host.replace(/^www\./, '') !== 'americasbesthearing.com') {
        assetReport.externalNonIntentional.push({ file: rel(file), url: v });
      }
    }
  }
  assetReport.externalByHost = sortObj(assetReport.externalByHost);
  assetReport.abhLiveAssetRefs = assetReport.abhLiveAssetRefs.slice(0, 200);
  assetReport.wpContentRefs = assetReport.wpContentRefs.slice(0, 200);
  assetReport.wpJsonRefs = assetReport.wpJsonRefs.slice(0, 200);
  assetReport.externalNonIntentional = assetReport.externalNonIntentional.slice(0, 200);

  const wpTerms = [
    'elementor-', 'data-elementor-', 'wp-content', 'wp-includes', 'wp-json', 'wp-admin',
    'wp-image-', 'wp-block-', 'wp-site-blocks', 'wordpress', 'woocommerce', 'plugins/',
    'uploads/', 'hello-elementor', 'call-us-selector', 'tcx-callus-js'
  ];
  const wpContext = {};
  const wpExamples = {};
  for (const term of wpTerms) { wpContext[term] = 0; wpExamples[term] = []; }
  for (const file of pageFiles) {
    const html = read(file);
    const lower = html.toLowerCase();
    for (const term of wpTerms) {
      const needle = term.toLowerCase();
      const count = lower.split(needle).length - 1;
      if (count > 0) {
        wpContext[term] += count;
        if (wpExamples[term].length < 5) wpExamples[term].push(rel(file));
      }
    }
  }

  const chrome = { headerMissing: [], footerMissing: [], headerCount: 0, footerCount: 0 };
  for (const file of pageFiles) {
    const html = read(file);
    if (html.includes('astro-location-header')) chrome.headerCount++;
    else chrome.headerMissing.push(rel(file));
    if (html.includes('astro-location-footer')) chrome.footerCount++;
    else chrome.footerMissing.push(rel(file));
  }

  const vieraRefs = [];
  const chatbotRefs = [];
  for (const file of pageFiles) {
    const html = read(file);
    if (/viera/i.test(html)) vieraRefs.push(rel(file));
    if (/call-us-selector|tcx-callus-js|LiveChat191212/i.test(html)) chatbotRefs.push(rel(file));
  }

  const report = {
    generatedAt: NOW,
    firecrawl: {
      usedHostedFirecrawl: false,
      note: 'Hosted Firecrawl was not invoked because no API key is configured in this workspace. This audit used the live XML sitemap plus local filesystem/Playwright-compatible checks, which is read-only and suitable for EmDash readiness inventory.'
    },
    sitemap,
    local: {
      pageCount: pageFiles.length,
      htmlFileCount: htmlFilesAll.length,
      strayHtmlFiles: strayHtmlFiles.map(rel).sort(),
      familyCounts: sortObj(familyCounts)
    },
    coverage: {
      liveUrlCount: sitemap.liveUrls.length,
      localRouteCount: localRoutes.length,
      missingLocalFromLive,
      extraLocalNotInLive: extraLocalNotInLive.filter(r => !r.startsWith('location/')).slice(0, 100),
      locationLegacyExtras: extraLocalNotInLive.filter(r => r.startsWith('location/')).slice(0, 100)
    },
    links: {
      brokenCount: brokenLinks.length,
      brokenLinks: brokenLinks.slice(0, 300),
      externalHosts: sortObj(externalLinks),
      malformedLinks: malformedLinks.slice(0, 100)
    },
    assets: assetReport,
    wordpressContext: { counts: sortObj(Object.fromEntries(Object.entries(wpContext).filter(([,v]) => v > 0))), examples: wpExamples },
    globalChrome: chrome,
    cleanupFlags: { vieraRefs, chatbotRefs }
  };

  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));

  function linesForItems(items, formatter, limit = 30) {
    if (!items.length) return ['- None found.'];
    const lines = items.slice(0, limit).map(formatter);
    if (items.length > limit) lines.push(`- ...and ${items.length - limit} more. See JSON report for full sample.`);
    return lines;
  }

  const md = [];
  md.push('# EmDash Readiness Audit');
  md.push('');
  md.push(`Generated: ${NOW}`);
  md.push('');
  md.push('## Scope');
  md.push('- Audit-only pass. No visual/design/layout files were changed by this script.');
  md.push('- Source inventory: live sitemap index and local `local-copy/` HTML.');
  md.push('- Firecrawl note: hosted Firecrawl was not invoked because no API key is configured here. The live XML sitemap was used directly for public URL discovery, which is read-only and reliable for this audit.');
  md.push('');
  md.push('## Executive Summary');
  md.push(`- Live sitemap URLs discovered: ${report.coverage.liveUrlCount}`);
  md.push(`- Local route pages found: ${report.local.pageCount}`);
  md.push(`- Live sitemap pages missing locally: ${report.coverage.missingLocalFromLive.length}`);
  md.push(`- Broken local internal hrefs found: ${report.links.brokenCount}`);
  md.push(`- Pages missing global header marker: ${report.globalChrome.headerMissing.length}`);
  md.push(`- Pages missing global footer marker: ${report.globalChrome.footerMissing.length}`);
  md.push(`- Location/stale Viera text still appears on ${report.cleanupFlags.vieraRefs.length} local route pages.`);
  md.push(`- 3CX chatbot leftovers found on ${report.cleanupFlags.chatbotRefs.length} local route pages.`);
  md.push('');
  md.push('## Template/Page Inventory');
  Object.entries(report.local.familyCounts).forEach(([family, count]) => md.push(`- ${family}: ${count}`));
  md.push('');
  md.push('## Live Sitemap Coverage');
  md.push('### Missing Local Routes From Live Sitemap');
  md.push(...linesForItems(report.coverage.missingLocalFromLive, r => `- ${r}`, 80));
  md.push('');
  md.push('### Local Routes Not In Live Sitemap');
  md.push('- These may be intentionally kept utility/thank-you pages, migrated pages not indexed, or stale copies.');
  md.push(...linesForItems(report.coverage.extraLocalNotInLive, r => `- ${r}`, 80));
  md.push('');
  md.push('### Legacy Location Extras');
  md.push(...linesForItems(report.coverage.locationLegacyExtras, r => `- ${r}`, 50));
  md.push('');
  md.push('## Broken Local Internal Links');
  md.push(...linesForItems(report.links.brokenLinks, x => `- ${x.file} -> ${x.href} (resolved: ${x.target})`, 100));
  md.push('');
  md.push('## External Asset / Dependency Audit');
  md.push('### External Hosts Referenced');
  Object.entries(report.assets.externalByHost).slice(0, 60).forEach(([host, count]) => md.push(`- ${host}: ${count}`));
  if (!Object.keys(report.assets.externalByHost).length) md.push('- None found.');
  md.push('');
  md.push('### Live ABH Domain Asset References');
  md.push('- These are the highest priority to localize or intentionally replace before EmDash deployment.');
  md.push(...linesForItems(report.assets.abhLiveAssetRefs, x => `- ${x.file} -> ${x.url}`, 60));
  md.push('');
  md.push('### WordPress wp-content References');
  md.push(...linesForItems(report.assets.wpContentRefs, x => `- ${x.file} -> ${x.url}`, 60));
  md.push('');
  md.push('## WordPress / Elementor / Plugin Context Markers');
  md.push('- Some Elementor-like markup has already been renamed to Astro-style and may remain as static layout scaffolding. Prioritize real runtime dependencies, live WP URLs, and plugin scripts.');
  Object.entries(report.wordpressContext.counts).forEach(([term, count]) => {
    const examples = (report.wordpressContext.examples[term] || []).join(', ');
    md.push(`- ${term}: ${count}${examples ? ` | examples: ${examples}` : ''}`);
  });
  if (!Object.keys(report.wordpressContext.counts).length) md.push('- None found.');
  md.push('');
  md.push('## Global Header/Footer Markers');
  md.push(`- Pages with global header marker: ${report.globalChrome.headerCount}/${report.local.pageCount}`);
  md.push(`- Pages with global footer marker: ${report.globalChrome.footerCount}/${report.local.pageCount}`);
  md.push('### Missing Header Marker');
  md.push(...linesForItems(report.globalChrome.headerMissing, x => `- ${x}`, 50));
  md.push('### Missing Footer Marker');
  md.push(...linesForItems(report.globalChrome.footerMissing, x => `- ${x}`, 50));
  md.push('');
  md.push('## Cleanup Flags');
  md.push('### Viera References');
  md.push(...linesForItems(report.cleanupFlags.vieraRefs, x => `- ${x}`, 80));
  md.push('### 3CX Chatbot References');
  md.push(...linesForItems(report.cleanupFlags.chatbotRefs, x => `- ${x}`, 50));
  md.push('');
  md.push('## Recommended Next Steps');
  md.push('1. Review missing live sitemap routes and decide whether each should exist locally or be intentionally excluded.');
  md.push('2. Fix broken local internal links, especially any links that resolve to missing local route folders.');
  md.push('3. Decide which external scripts/assets are intentional after EmDash deployment. Localize remaining ABH/wp-content media references.');
  md.push('4. Remove or replace real WordPress/plugin runtime leftovers that are not needed for static/EmDash pages.');
  md.push('5. Use this inventory to map EmDash collections: locations, staff, services, hearing aid brands, blog posts, appointments, and utility pages.');
  md.push('6. Run visual QA only after the audit issues above are triaged, using representative pages from each template family.');
  md.push('');
  md.push(`Full machine-readable details: ${path.basename(REPORT_JSON)}`);
  fs.writeFileSync(REPORT_MD, md.join('\n'));

  console.log(`Wrote ${rel(REPORT_MD)}`);
  console.log(`Wrote ${rel(REPORT_JSON)}`);
  console.log(JSON.stringify({
    liveUrls: report.coverage.liveUrlCount,
    localPages: report.local.pageCount,
    missingLocal: report.coverage.missingLocalFromLive.length,
    brokenLinks: report.links.brokenCount,
    abhLiveAssetRefs: report.assets.abhLiveAssetRefs.length,
    headerMissing: report.globalChrome.headerMissing.length,
    footerMissing: report.globalChrome.footerMissing.length,
    vieraPages: report.cleanupFlags.vieraRefs.length,
    chatbotPages: report.cleanupFlags.chatbotRefs.length
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
