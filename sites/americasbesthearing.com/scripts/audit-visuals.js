const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const outDir = path.resolve(__dirname, "..", "visual-audit");
fs.mkdirSync(outDir, { recursive: true });

const pairs = [
  ["hearing-aids/oticon/", "https://americasbesthearing.com/hearing-aids/oticon/"],
  ["hearing-aids/phonak/", "https://americasbesthearing.com/hearing-aids/phonak/"],
  ["hearing-aids/widex/", "https://americasbesthearing.com/hearing-aids/widex/"],
  ["hearing-aids/resound/", "https://americasbesthearing.com/hearing-aids/resound/"],
  ["hearing-aids/starkey/", "https://americasbesthearing.com/hearing-aids/starkey/"],
  ["hearing-aids/signia/", "https://americasbesthearing.com/hearing-aids/signia/"],
  ["hearing-aids/unitron/", "https://americasbesthearing.com/hearing-aids/unitron/"],
  ["hearing-instrument-specialist/darren-duso/", "https://americasbesthearing.com/hearing-instrument-specialist/darren-duso/"],
  ["patient-care-coordinator/tammy-mckay/", "https://americasbesthearing.com/patient-care-coordinator/tammy-mckay/"],
  ["audiologist/amelia-schuring/", "https://americasbesthearing.com/audiologist/amelia-schuring/"],
  ["audiology-assistant/kimberly-russel/", "https://americasbesthearing.com/audiology-assistant/kimberly-russel/"],
  ["hearing-instrument-specialist/melissa-miller/", "https://americasbesthearing.com/hearing-instrument-specialist/melissa-miller/"],
  ["patient-care-coordinator/gretchen-geyer/", "https://americasbesthearing.com/patient-care-coordinator/gretchen-geyer/"],
  ["hearing-instrument-specialist/eve-boaheng/", "https://americasbesthearing.com/hearing-instrument-specialist/eve-boaheng/"],
  ["patient-care-coordinator/corinne-johnson/", "https://americasbesthearing.com/patient-care-coordinator/corinne-johnson/"],
  ["audiologist/kylie-kasel/", "https://americasbesthearing.com/audiologist/kylie-kasel/"],
  ["hearing-instrument-specialist/joel-shanahan/", "https://americasbesthearing.com/hearing-instrument-specialist/joel-shanahan/"],
  ["patient-care-coordinator/stephanie-frankhouser/", "https://americasbesthearing.com/patient-care-coordinator/stephanie-frankhouser/"],
  ["hearing-instrument-specialist/allie-wagner/", "https://americasbesthearing.com/hearing-instrument-specialist/allie-wagner/"],
  ["patient-care-coordinator/lori-litchy/", "https://americasbesthearing.com/patient-care-coordinator/lori-litchy/"],
  ["audiologist/samantha-filzen-his/", "https://americasbesthearing.com/audiologist/samantha-filzen-his/"],
  ["patient-care-coordinator/chelsey-byro/", "https://americasbesthearing.com/patient-care-coordinator/chelsey-byro/"],
  ["hearing-instrument-specialist-trainee/shyanne-abbott/", "https://americasbesthearing.com/hearing-instrument-specialist-trainee/shyanne-abbott/"],
  ["hearing-instrument-specialist/matt-stephens/", "https://americasbesthearing.com/hearing-instrument-specialist/matt-stephens/"],
  ["patient-care-coordinator/mickey-fried/", "https://americasbesthearing.com/patient-care-coordinator/mickey-fried/"],
  ["hearing-instrument-specialist/suzanne-crowell/", "https://americasbesthearing.com/hearing-instrument-specialist/suzanne-crowell/"],
  ["patient-care-coordinator/wendy-whitlock/", "https://americasbesthearing.com/patient-care-coordinator/wendy-whitlock/"],
  ["patient-care-coordinator/pam-birch/", "https://americasbesthearing.com/patient-care-coordinator/pam-birch/"],
  ["hearing-instrument-specialist/marla-leger/", "https://americasbesthearing.com/hearing-instrument-specialist/marla-leger/"],
  ["patient-care-coordinator/carol-vollmar/", "https://americasbesthearing.com/patient-care-coordinator/carol-vollmar/"],
  ["sitemap/", "https://americasbesthearing.com/sitemap/"],
  ["request-an-appointment-willmar-mn/", "https://americasbesthearing.com/request-an-appointment-willmar-mn/"],
];

async function inspect(page, url, label) {
  const failed = [];
  page.on("requestfailed", (request) => failed.push(request.url()));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: true });

  return await page.evaluate(() => {
    const body = document.body;
    const firstContent =
      document.querySelector("[data-astro-type='single-page'], [data-astro-type='single'], main, article") ||
      document.querySelector("body > div:not(.skip-link)");
    const hero = document.querySelector("h1")?.closest(".e-con, .astro-element") || document.querySelector("h1");
    const styles = [...document.styleSheets].map((sheet) => {
      let rules = null;
      try {
        rules = sheet.cssRules ? sheet.cssRules.length : null;
      } catch {
        rules = "blocked";
      }
      return { href: sheet.href, rules };
    });
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };
    return {
      title: document.title,
      bodyClass: body.className,
      h1: document.querySelector("h1")?.textContent.trim() || null,
      bodyRect: rect(body),
      firstContentRect: rect(firstContent),
      heroRect: rect(hero),
      stylesheetCount: styles.length,
      zeroRuleStylesheets: styles.filter((s) => s.rules === 0).length,
      blockedStylesheets: styles.filter((s) => s.rules === "blocked").length,
      elementorClassCount: document.querySelectorAll('[class*="elementor"]').length,
      astroClassCount: document.querySelectorAll('[class*="astro"]').length,
      eConCount: document.querySelectorAll(".e-con").length,
    };
  }).then((info) => ({ ...info, failed: failed.slice(0, 20), failedCount: failed.length }));
}

(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const [localPath, liveUrl] of pairs) {
    const slug = localPath.replace(/\/$/, "").replace(/[\/]/g, "-");
    const localUrl = `http://127.0.0.1:4173/${localPath}`;
    const localPage = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    const livePage = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    const local = await inspect(localPage, localUrl, `${slug}-local`);
    const live = await inspect(livePage, liveUrl, `${slug}-live`);
    report.push({ localPath, localUrl, liveUrl, local, live });
    fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(`audited ${localPath}`);
    await localPage.close();
    await livePage.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})();
