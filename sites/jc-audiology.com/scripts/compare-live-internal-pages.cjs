const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const routes = ['/judith-l-reese-ph-d/', '/about/', '/contact/', '/schedule-appointment/'];
  const results = [];
  for (const route of routes) {
    const live = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const local = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    let liveStatus = 'error';
    try {
      const r = await live.goto(`https://www.jc-audiology.com${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      liveStatus = r?.status();
    } catch (e) { liveStatus = e.message; }
    const lr = await local.goto(`http://127.0.0.1:4321${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const liveData = await live.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim(), header: document.querySelector('header')?.getBoundingClientRect().height, hero: document.querySelector('h1')?.closest('.e-con, .elementor, div')?.getBoundingClientRect().height })).catch(e => ({ error: e.message }));
    const localData = await local.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim(), header: document.querySelector('header')?.getBoundingClientRect().height, hero: document.querySelector('h1')?.closest('.e-con, .astro, div')?.getBoundingClientRect().height })).catch(e => ({ error: e.message }));
    results.push({ route, liveStatus, localStatus: lr?.status(), liveData, localData });
    await live.close(); await local.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
