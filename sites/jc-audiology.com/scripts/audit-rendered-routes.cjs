const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
function walk(dir, out=[]) { for (const f of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,f.name); if (f.isDirectory()) walk(p,out); else if (p.endsWith(path.join('index.html'))) out.push(p); } return out; }
function routeFromShell(file) { let rel = path.relative(path.join('src','shells','pages'), file).replace(/\\/g,'/'); if (rel === 'index.html') return '/'; return '/' + rel.replace(/\/index\.html$/,'').replace(/^\/+|\/+$/g,'') + '/'; }
(async () => {
  const browser = await chromium.launch({ headless: true });
  const routes = walk(path.join('src','shells','pages')).map(routeFromShell).sort();
  const results = [];
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    let status = null;
    let data = {};
    try {
      const res = await page.goto(`http://127.0.0.1:4321${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      status = res?.status() ?? null;
      data = await page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent?.trim() || '',
        hasUnreplacedToken: document.documentElement.innerHTML.includes('ASTRO_DYNAMIC_'),
        bodyLen: document.body?.innerText?.trim().length || 0,
      }));
    } catch (e) {
      errors.push(e.message);
    }
    results.push({ route, status, ...data, errorCount: errors.length, criticalErrors: errors.filter(e => !/astroProFrontend|supports|textContent/.test(e)).slice(0,3) });
    await page.close();
  }
  await browser.close();
  console.table(results);
  const failed = results.filter(r => r.status !== 200 || r.hasUnreplacedToken || r.bodyLen < 100 || r.criticalErrors.length);
  console.log('\nFailed/Needs review:', JSON.stringify(failed, null, 2));
})();
