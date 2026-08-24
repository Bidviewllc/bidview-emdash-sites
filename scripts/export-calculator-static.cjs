// Export a standalone calculator page from a local `astro dev` server into a
// static folder ready for `vercel --prod --yes`. See PRICE-CALCULATOR-PLAYBOOK.md.
//
// Usage:
//   node scripts/export-calculator-static.cjs <site-folder> <page-path> <out-folder> <live-domain> [dev-url]
//
// Example (New Leaf) — page path has NO leading slash (Git Bash mangles it):
//   node scripts/export-calculator-static.cjs sites/new-leaf-hearing-care hearing-aid-price-calculator/ \
//     ../TheCube/.vercel-deploy/new-leaf-price-calculator https://newleafhearing.com http://localhost:4322
//
// What it does, in order:
//   1. downloads the rendered page from the dev server
//   2. inlines the page CSS (dev serves it as a separate dev-only file)
//   3. strips Vite/Astro dev-only scripts (HMR client, dev toolbar)
//   4. rewrites internal links (href="/...") to the live domain so CTAs work
//   5. stubs the lead-form fetch — the preview shows the thank-you state but
//      sends nothing (requires the submit code to follow the playbook shape)
//   6. copies every /assets/* file the page references from the site's public/

const fs = require('fs');
const path = require('path');

const [, , siteDir, rawPagePath, outDir, liveDomain, devUrl = 'http://localhost:4322'] = process.argv;
if (!siteDir || !rawPagePath || !outDir || !liveDomain) {
  console.error('Usage: node scripts/export-calculator-static.cjs <site-folder> <page-path> <out-folder> <live-domain> [dev-url]');
  process.exit(1);
}
// Pass the page path WITHOUT a leading slash (Git Bash rewrites "/foo" into a
// Windows path). A leading slash is added here.
const pagePath = '/' + rawPagePath.replace(/^\/+/, '');

(async () => {
  const res = await fetch(devUrl + pagePath);
  if (!res.ok) throw new Error(`dev server returned ${res.status} for ${devUrl}${pagePath} — is astro dev running?`);
  let html = await res.text();

  // 2. Inline the page CSS
  const linkRe = /<link rel="stylesheet"[^>]*href="([^"]*astro&(?:amp;)?type=style[^"]*)"[^>]*>/g;
  for (const m of [...html.matchAll(linkRe)]) {
    const cssRes = await fetch(devUrl + m[1].replaceAll('&amp;', '&'));
    if (!cssRes.ok) throw new Error('css fetch failed: ' + m[1]);
    html = html.replace(m[0], '<style>' + (await cssRes.text()) + '</style>');
  }

  // 3. Strip dev-only scripts (HMR client, dev toolbar, CSS module import) and
  //    dev attributes that leak local file paths into the page source
  html = html.replace(/<script[^>]*src="[^"]*(?:@vite\/client|dev-toolbar|@id\/astro|\/src\/pages\/)[^"]*"[^>]*><\/script>/g, '');
  html = html.replace(/<script>window\.__astro_dev_toolbar__[\s\S]*?<\/script>/g, '');
  html = html.replace(/ data-vite-dev-id="[^"]*"/g, '');
  html = html.replace(/ data-astro-source-(?:file|loc)="[^"]*"/g, '');
  if (/@vite\/client|dev-toolbar|data-vite-dev-id/.test(html)) throw new Error('dev scripts still present after strip');

  // 4. Internal links → live domain (asset paths stay relative)
  html = html.replace(/href="\/(?!assets\/)([^"#][^"]*)"/g, `href="${liveDomain}/$1"`);

  // 5. Stub the lead-form send
  const fetchBlock = /const res = await fetch\('\/api\/[^']*',[\s\S]*?if \(!res\.ok\) throw new Error\(\);/;
  if (fetchBlock.test(html)) {
    html = html.replace(fetchBlock,
      "await new Promise(r => setTimeout(r, 600)); /* preview build: send simulated, no lead captured */");
    console.log('lead-form send stubbed (preview shows thank-you, sends nothing)');
  } else {
    console.log('NOTE: no lead-form fetch block found — nothing stubbed');
  }

  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);

  // 6. Copy referenced assets
  const assets = [...new Set([...html.matchAll(/["'(]\/assets\/([^"')?]+)/g)].map(m => m[1]))];
  for (const f of assets) {
    const src = path.join(siteDir, 'public/assets', f);
    if (!fs.existsSync(src)) throw new Error('referenced asset missing from site public/: ' + f);
    fs.copyFileSync(src, path.join(outDir, 'assets', f));
  }
  console.log(`exported ${pagePath} → ${outDir} (${assets.length} assets)`);
  console.log(`next: cd ${outDir} && vercel --prod --yes`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
