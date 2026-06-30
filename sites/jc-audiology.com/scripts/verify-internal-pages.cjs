const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const pages = ['/', '/judith-l-reese-ph-d/', '/about/', '/contact/', '/schedule-appointment/'];
  const results = [];
  for (const route of pages) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const url = `http://127.0.0.1:4321${route}`;
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const data = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      staffIntro: !!document.querySelector('.astro-staff-profile-intro'),
      aboutMain: !!document.querySelector('.astro-element-9e5204b .astro-element-35a7487'),
      contactInfo: !!document.querySelector('.astro-element-3d6215e[data-source-section="homepage:a14cb86"]'),
      scheduleFrame: !!document.querySelector('#ceschedule'),
      contactForm: !!document.querySelector('.astro-contact-form'),
      officeMap: document.querySelector('.astro-element-60997f4 iframe, .astro-element-e07fe11 iframe')?.getAttribute('src') || '',
      staffIntroPaddingBottom: getComputedStyle(document.querySelector('.astro-staff-profile-intro > .e-con-inner') || document.body).paddingBottom,
    }));
    await page.screenshot({ path: `tmp-${route === '/' ? 'home' : route.replace(/^\/+|\/+$/g,'').replace(/\//g,'-')}.png`, fullPage: false });
    results.push({ route, status: response?.status(), errors, data });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
