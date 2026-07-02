// Full render sweep of the deployed CF preview. For each of the 41 entries:
// HTTP status, kit color resolves (styled), logo loads, stylesheet count,
// broken <img> count, non-external console errors. Plus the ear-candling redirect.
import { chromium } from "../../../../emdash/floridamedicalhearingaids.com/../../github-organization/bidview-emdash-sites/sites/lakeside-lactation/node_modules/playwright/index.mjs";
import fs from "fs";

const BASE = "https://floridamedicalhearingaids.cameron-239.workers.dev";
const slugs = fs.readFileSync(process.argv[2], "utf-8").split("\n").map((s) => s.trim()).filter(Boolean);
const EXT = /prohear|3cx|fontawesome|Font Awesome|googletagmanager|google-analytics|gtag|bugherd|elfsight|CONNECTION_RESET|ERR_FAILED|CORS|fonts\.g/i;

const browser = await chromium.launch();
let bad = 0;
const rows = [];
let n = 0;
for (const slug of slugs) {
  const url = slug === "home" ? `${BASE}/?v=${Date.now()}` : `${BASE}/${slug}/?v=${Date.now()}`;
  const page = await browser.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error" && !EXT.test(m.text())) errs.push(m.text().slice(0, 80)); });
  page.on("pageerror", (e) => { if (!EXT.test(String(e))) errs.push("PAGEERR " + String(e).slice(0, 80)); });
  let r = {};
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    r.status = resp.status();
    r = { ...r, ...(await page.evaluate(() => {
      const kit = getComputedStyle(document.body).getPropertyValue("--e-global-color-primary").trim();
      const logo = document.querySelector('header img');
      const css = document.querySelectorAll('link[rel="stylesheet"]').length;
      const broken = [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0).length;
      const h1 = document.querySelector("h1");
      return { kit, logoOk: !!logo && logo.naturalWidth > 0, css, broken, h1: h1 ? h1.textContent.trim().slice(0, 30) : null };
    })) };
  } catch (e) { r.status = "NAVFAIL"; r.err = String(e).slice(0, 60); }
  const styled = r.kit === "#1056B3";
  const ok = r.status === 200 && styled && r.logoOk && r.css > 0 && r.broken === 0 && (!errs.length);
  if (!ok) bad++;
  rows.push({ slug, ...r, errs: errs.slice(0, 2), ok });
  n++;
  console.log(`${ok ? "OK  " : "FAIL"} [${n}/${slugs.length}] ${slug.padEnd(52)} ${r.status} kit=${styled ? "y" : "N"} logo=${r.logoOk ? "y" : "N"} css=${r.css} broken=${r.broken}${errs.length ? " ERR:" + errs[0] : ""}`);
  await page.close();
}
// ear-candling redirect
const cp = await browser.newPage();
const rr = await cp.goto(`${BASE}/ear-candling/?v=${Date.now()}`, { waitUntil: "domcontentloaded" });
console.log(`\near-candling redirect -> ${cp.url().replace(BASE, "")} (final status ${rr.status()})`);
await browser.close();
console.log(`\n===== ${slugs.length} pages, ${bad} FAIL =====`);
if (bad) rows.filter((r) => !r.ok).forEach((r) => console.log(`  FAIL ${r.slug}: status=${r.status} kit=${r.kit} logo=${r.logoOk} css=${r.css} broken=${r.broken} ${r.errs.join("|")}`));
