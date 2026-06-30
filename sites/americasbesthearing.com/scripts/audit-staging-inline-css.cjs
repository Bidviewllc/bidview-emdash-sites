const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = 'https://americas-best-hearing-staging.local-981.workers.dev';
const manifest = JSON.parse(fs.readFileSync('local-site/export-manifest.json', 'utf8'));
const routes = [...new Set(manifest.pages.map(p => p.route === '/' ? '/' : p.route.replace(/\/$/, '') + '/'))];
const priority = [
  '/', '/about/', '/all-locations/', '/contact/', '/our-team/', '/news/',
  '/audiologist-hearing-aids-lansing-mi/', '/audiologist/darren-duso/',
  '/audiology-services/hearing-tests/', '/audiology-services/',
  '/hearing-aids/phonak/', '/resources/insurance/', '/request-an-appointment/',
  '/privacy-policy/', '/terms-of-service/'
];
const ordered = [...new Set([...priority, ...routes])];
const norm = s => (s || '').replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const results = [];
  for (const route of ordered) {
    const url = base + route;
    const record = { route, url };
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      record.status = response?.status() || 0;
      const audit = await page.evaluate(() => {
        const norm = s => (s || '').replace(/\s+/g, ' ').trim();
        const headHtml = document.head.innerHTML;
        const styleTags = [...document.querySelectorAll('style')].map(style => ({
          id: style.id || '',
          attrs: [...style.attributes].map(a => `${a.name}=${JSON.stringify(a.value)}`).join(' '),
          length: style.textContent.length,
          preview: norm(style.textContent).slice(0, 180),
          inHead: document.head.contains(style)
        }));
        const bodyStyleEls = [...document.body.querySelectorAll('[style]')].map(el => ({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString?.() || '',
          id: el.id || '',
          style: el.getAttribute('style') || '',
          text: norm(el.textContent).slice(0, 80)
        }));
        return {
          title: document.title,
          styleTagCount: styleTags.length,
          headStyleTagCount: styleTags.filter(s => s.inHead).length,
          styleTags,
          globalStylesInlineCss: headHtml.includes('global-styles-inline-css'),
          astroFrontendInlineCss: headHtml.includes('astro-frontend-inline-css'),
          astroCustomCss: headHtml.includes('astro-custom-css'),
          astroImgAutoSizesInlineCss: headHtml.includes('astro-img-auto-sizes-contain-inline-css'),
          extractedInlineCssLinked: !!document.querySelector('link[href*="abh-extracted-inline-head.css"]'),
          bodyStyleAttrCount: bodyStyleEls.length,
          bodyStyleSamples: bodyStyleEls.slice(0, 10)
        };
      });
      Object.assign(record, audit);
    } catch (error) {
      record.error = error.message;
    }
    results.push(record);
    console.log(`${results.length}/${ordered.length} ${route} ${record.status || 'ERR'} styles=${record.styleTagCount ?? 'n/a'} bodyStyleAttrs=${record.bodyStyleAttrCount ?? 'n/a'}`);
  }
  await browser.close();

  const summary = {
    scannedAt: new Date().toISOString(),
    base,
    pageCount: results.length,
    non200: results.filter(r => r.status && r.status !== 200).map(r => ({ route: r.route, status: r.status })),
    errors: results.filter(r => r.error).map(r => ({ route: r.route, error: r.error })),
    pagesWithStyleTags: results.filter(r => (r.styleTagCount || 0) > 0).map(r => ({ route: r.route, status: r.status, styleTagCount: r.styleTagCount, styleTags: r.styleTags })),
    pagesWithNamedInlineCssMarkers: results.filter(r => r.globalStylesInlineCss || r.astroFrontendInlineCss || r.astroCustomCss || r.astroImgAutoSizesInlineCss).map(r => ({
      route: r.route,
      globalStylesInlineCss: r.globalStylesInlineCss,
      astroFrontendInlineCss: r.astroFrontendInlineCss,
      astroCustomCss: r.astroCustomCss,
      astroImgAutoSizesInlineCss: r.astroImgAutoSizesInlineCss
    })),
    extractedCssMissing: results.filter(r => r.status === 200 && !r.extractedInlineCssLinked).map(r => r.route),
    bodyStyleAttrStats: {
      pagesWithBodyStyleAttrs: results.filter(r => (r.bodyStyleAttrCount || 0) > 0).length,
      maxBodyStyleAttrs: Math.max(...results.map(r => r.bodyStyleAttrCount || 0)),
      topPages: results
        .filter(r => (r.bodyStyleAttrCount || 0) > 0)
        .sort((a,b) => b.bodyStyleAttrCount - a.bodyStyleAttrCount)
        .slice(0, 12)
        .map(r => ({ route: r.route, bodyStyleAttrCount: r.bodyStyleAttrCount, samples: r.bodyStyleSamples }))
    },
    results
  };
  fs.mkdirSync('audit', { recursive: true });
  fs.writeFileSync('audit/staging-inline-css-audit.json', JSON.stringify(summary, null, 2));
  fs.writeFileSync('audit/staging-inline-css-audit.md', renderMd(summary));
  console.log('\nSUMMARY');
  console.log(JSON.stringify({
    pageCount: summary.pageCount,
    non200: summary.non200.length,
    errors: summary.errors.length,
    pagesWithStyleTags: summary.pagesWithStyleTags.length,
    pagesWithNamedInlineCssMarkers: summary.pagesWithNamedInlineCssMarkers.length,
    extractedCssMissing: summary.extractedCssMissing.length,
    pagesWithBodyStyleAttrs: summary.bodyStyleAttrStats.pagesWithBodyStyleAttrs,
    maxBodyStyleAttrs: summary.bodyStyleAttrStats.maxBodyStyleAttrs
  }, null, 2));
})();

function renderMd(summary) {
  const lines = [];
  lines.push('# Staging Inline CSS Audit');
  lines.push('');
  lines.push(`- Base URL: ${summary.base}`);
  lines.push(`- Scanned at: ${summary.scannedAt}`);
  lines.push(`- Pages scanned: ${summary.pageCount}`);
  lines.push(`- Non-200 pages: ${summary.non200.length}`);
  lines.push(`- Browser errors/timeouts: ${summary.errors.length}`);
  lines.push(`- Pages with any <style> tags: ${summary.pagesWithStyleTags.length}`);
  lines.push(`- Pages with named WordPress/Astro inline CSS markers: ${summary.pagesWithNamedInlineCssMarkers.length}`);
  lines.push(`- Pages missing extracted CSS link: ${summary.extractedCssMissing.length}`);
  lines.push(`- Pages with body style attributes: ${summary.bodyStyleAttrStats.pagesWithBodyStyleAttrs}`);
  lines.push('');
  lines.push('## Named Inline CSS Markers');
  if (!summary.pagesWithNamedInlineCssMarkers.length) lines.push('- None found.');
  else summary.pagesWithNamedInlineCssMarkers.forEach(r => lines.push(`- ${r.route}: ${JSON.stringify(r)}`));
  lines.push('');
  lines.push('## Style Tags');
  if (!summary.pagesWithStyleTags.length) lines.push('- None found.');
  else summary.pagesWithStyleTags.forEach(r => {
    lines.push(`- ${r.route}: ${r.styleTagCount}`);
    r.styleTags.slice(0, 5).forEach(s => lines.push(`  - id=${s.id || '(none)'} inHead=${s.inHead} length=${s.length} preview=${s.preview}`));
  });
  lines.push('');
  lines.push('## Body Style Attribute Notes');
  lines.push('Body style attributes remain on dynamic/runtime elements such as tabs, accordions, swiper transforms, and Elementor/Astro layout variables. These are not the `global-styles-inline-css` head block Vince called out, and removing them blindly previously broke layout behavior.');
  summary.bodyStyleAttrStats.topPages.forEach(r => lines.push(`- ${r.route}: ${r.bodyStyleAttrCount}`));
  lines.push('');
  return lines.join('\n');
}
