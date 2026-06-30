const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('http://127.0.0.1:4321/audiology-services/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  const result = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        top: Math.round(box.top),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
        padding: style.padding,
        margin: style.margin,
        background: style.backgroundColor,
        border: style.border,
      };
    };
    return {
      pageScope: document.querySelector('.astro-element-69dc79d .astro-service-body')?.className || null,
      contentTopGap: Math.round((document.querySelector('.astro-element-69dc79d .astro-widget-text-editor')?.getBoundingClientRect().top || 0) - (document.querySelector('.astro-element-69dc79d')?.getBoundingClientRect().top || 0)),
      accordionCount: document.querySelectorAll('.astro-element-69dc79d details.e-n-accordion-item').length,
      firstAccordionTitle: document.querySelector('.astro-element-69dc79d .e-n-accordion-item-title')?.textContent?.replace(/\s+/g, ' ').trim(),
      firstAccordion: rect('.astro-element-69dc79d .e-n-accordion-item-title'),
      firstAnswer: rect('.astro-element-69dc79d details .e-con'),
      rawHtmlVisible: document.body.textContent.includes('<span') || document.body.textContent.includes('<div class='),
    };
  });
  console.log(JSON.stringify({ result, errors: errors.slice(0, 5) }, null, 2));
  await browser.close();
})();
