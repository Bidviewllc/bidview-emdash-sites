const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "qa-screenshots");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 1200 },
];
const TARGETS = {
  live: "https://raleighhearingandtinnituscenter.com/",
  local: "http://127.0.0.1:4173/",
};

function safeName(value) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function sectionScreenshots(page, label, viewportName) {
  const handles = await page.$$("header, [data-astro-type='astro-page'] > .astro-element, footer");
  const sections = [];
  for (let i = 0; i < Math.min(handles.length, 18); i += 1) {
    const handle = handles[i];
    const box = await handle.boundingBox();
    if (!box || box.width < 10 || box.height < 10) continue;
    const className = await handle.evaluate((el) => el.className && String(el.className));
    const id = await handle.evaluate((el) => el.getAttribute("data-id") || el.tagName.toLowerCase());
    const file = `${label}-${viewportName}-section-${String(i + 1).padStart(2, "0")}-${safeName(id || "section")}.png`;
    const shotPath = path.join(OUT, file);
    await handle.screenshot({ path: shotPath });
    sections.push({ index: i + 1, id, className, screenshot: shotPath, width: box.width, height: box.height });
  }
  return sections;
}

async function inspect(page) {
  return page.evaluate(() => {
    const selectorList = [
      "body",
      ".astro-element-41a1dbf",
      ".astro-element-f8f905b .astro-heading-title",
      ".astro-element-f0f9ffe .astro-heading-title",
      ".astro-element-79cb618",
      ".astro-button",
      "footer",
    ];
    const computed = {};
    for (const selector of selectorList) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      computed[selector] = {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        backgroundImage: cs.backgroundImage,
        display: cs.display,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }

    const icons = [...document.querySelectorAll("i[class*='fa-'], i[class*='eicon-']")].slice(0, 80).map((el) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, "::before");
      return {
        className: String(el.className),
        fontFamily: cs.fontFamily,
        beforeContent: before.content,
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height),
      };
    });

    const brokenImages = [...document.images]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src);

    const localAssetLeaks = [...document.querySelectorAll("[src], [href]")]
      .map((el) => el.getAttribute("src") || el.getAttribute("href"))
      .filter((value) => value && /raleighhearingandtinnituscenter\.com\/.*\.(png|jpe?g|webp|gif|svg|css|js|woff2?)/i.test(value));

    const slideshow = document.querySelector(".astro-element-41a1dbf");
    const slideshowSettings = slideshow ? slideshow.getAttribute("data-settings") : "";

    return {
      title: document.title,
      computed,
      iconCount: icons.length,
      icons,
      brokenImages,
      localAssetLeaks,
      slideshowSettings,
    };
  });
}

async function wakeLazyAssets(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y <= max; y += 700) {
      window.scrollTo(0, y);
      await delay(80);
    }
    window.scrollTo(0, 0);
    await delay(250);
  });
}

async function runTarget(browser, label, url, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const errors = [];
  page.on("requestfailed", (request) => errors.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on("pageerror", (error) => errors.push({ pageError: error.message }));
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await wakeLazyAssets(page);
  await page.screenshot({ path: path.join(OUT, `${label}-${viewport.name}-full.png`), fullPage: true });
  const data = await inspect(page);
  const sections = await sectionScreenshots(page, label, viewport.name);
  await page.close();
  return { label, url, viewport, errors, data, sections };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const viewport of VIEWPORTS) {
      for (const [label, url] of Object.entries(TARGETS)) {
        report.push(await runTarget(browser, label, url, viewport));
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, "homepage-report.json"), JSON.stringify(report, null, 2));

  for (const item of report) {
    const hero = item.data.computed[".astro-element-41a1dbf"];
    const body = item.data.computed.body;
    const headline = item.data.computed[".astro-element-f8f905b .astro-heading-title"];
    console.log(`${item.label} ${item.viewport.name}:`);
    console.log(`  body font: ${body?.fontFamily || "missing"}`);
    console.log(`  headline font: ${headline?.fontFamily || "missing"}`);
    console.log(`  hero background: ${hero?.backgroundImage || "missing"}`);
    console.log(`  icons checked: ${item.data.iconCount}`);
    console.log(`  broken images: ${item.data.brokenImages.length}`);
    console.log(`  local asset leaks: ${item.data.localAssetLeaks.length}`);
    console.log(`  request/page errors: ${item.errors.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
