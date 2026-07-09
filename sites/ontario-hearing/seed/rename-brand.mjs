// 1) Fix the two thank-you pages (remove duplicated H2/title + lead echo).
// 2) Rename "Ontario Hearing Centers" -> "Ontario Hearing Center" sitewide
//    (incl. possessive "Centers'" -> "Center's"). Scoped to the exact phrase,
//    so "Oracle Hearing Centers" and other businesses are untouched.
import { readFile, writeFile } from "node:fs/promises";

// --- 1. thank-you content fixes (operate on raw pages.json JSON) ---
const pagesPath = "src/data/pages.json";
const pages = JSON.parse(await readFile(pagesPath, "utf8"));
const ty = pages.find((p) => p.slug === "thank-you-for-contacting-us");
if (ty) ty.content_markdown = "# Thank you for contacting us\n\nOur team will respond to your request as soon as we are able. If you need to reach us sooner, please call (585) 442-4180.";
const ty2 = pages.find((p) => p.slug === "thank-you");
if (ty2) ty2.content_markdown = "# Thank You\n\nThank you for contacting Ontario Hearing Center. Our team will respond to your request as soon as we are able.";
await writeFile(pagesPath, JSON.stringify(pages, null, 2));
console.log("thank-you pages fixed:", !!ty, !!ty2);

// --- 2. sitewide brand rename across source + data + seed files ---
const files = [
  "src/data/pages.json",
  "src/data/team.ts",
  "src/layouts/Base.astro",
  "src/pages/about-us.astro",
  "src/pages/blog/index.astro",
  "src/pages/contact-us.astro",
  "src/pages/index.astro",
  "src/pages/[...slug].astro",
  "seed/generate-setup.mjs",
  "seed/generate-seed.mjs",
];

const apply = (s) => s
  .split("Ontario Hearing Centers'").join("Ontario Hearing Center's")   // straight possessive
  .split("Ontario Hearing Centers’").join("Ontario Hearing Center’s") // curly possessive
  .split("Ontario Hearing Centers").join("Ontario Hearing Center");     // remaining plural

let totalBefore = 0;
for (const f of files) {
  let txt;
  try { txt = await readFile(f, "utf8"); } catch { console.log("skip (missing):", f); continue; }
  const before = (txt.match(/Ontario Hearing Centers/g) || []).length;
  const out = apply(txt);
  await writeFile(f, out);
  const after = (out.match(/Ontario Hearing Centers/g) || []).length;
  totalBefore += before;
  console.log(`${f}: ${before} -> ${after}`);
}
console.log("Total plural occurrences replaced:", totalBefore);
