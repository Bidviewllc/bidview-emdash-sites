// Writes public/sitemap.xml so /sitemap.xml is served as a static asset.
// An app route through the Worker paid a 25-30 second cold start on every
// crawl (same cause as the robots.txt fix); a static asset skips the Worker.
// lastmod is the build date. middleware.ts keeps a dynamic fallback for builds
// that skip this step.
import fs from "node:fs";
import { createSitemap } from "../src/lib/sitemap.ts";

const shells = JSON.parse(fs.readFileSync(new URL("../src/data/shells.json", import.meta.url), "utf8"));
const xml = createSitemap(shells);
fs.writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(`gen-sitemap: wrote public/sitemap.xml (${(xml.match(/<url>/g) || []).length} URLs)`);
