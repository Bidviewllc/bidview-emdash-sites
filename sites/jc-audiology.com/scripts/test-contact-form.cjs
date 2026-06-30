const { chromium } = require('playwright');
const Database = require('better-sqlite3');
(async () => {
  const beforeDb = new Database('data.db');
  const before = beforeDb.prepare('select count(*) as count from contact_submissions').get().count;
  beforeDb.close();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('http://127.0.0.1:4321/contact/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('#astro-contact-name', 'Codex Test');
  await page.fill('#astro-contact-email', 'codex-test@example.com');
  await page.fill('#astro-contact-subject', 'Local contact form test');
  await page.fill('#astro-contact-phone', '8135550100');
  await page.fill('#astro-contact-message', 'This is a local end-to-end test submission.');
  await page.click('.astro-contact-form__submit');
  await page.waitForSelector('.astro-contact-form__status--success', { timeout: 10000 });
  const statusText = await page.locator('.astro-contact-form__status').textContent();
  await browser.close();

  const afterDb = new Database('data.db');
  const after = afterDb.prepare('select count(*) as count from contact_submissions').get().count;
  const latest = afterDb.prepare('select name,email,subject,message from contact_submissions order by id desc limit 1').get();
  afterDb.close();
  console.log(JSON.stringify({ before, after, statusText, latest, criticalErrors: errors.filter(e => !/astroProFrontend|supports|textContent/.test(e)) }, null, 2));
})();
