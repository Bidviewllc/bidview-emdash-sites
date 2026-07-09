// ClickUp CRs: Insurance page (868jze6vv), How-to-Service spacing (868jzh6ek),
// + remove 4 nested pittsford pages (301 -> matching service page).
import { readFile, writeFile } from "node:fs/promises";
const PATH = "src/data/pages.json";
let d = JSON.parse(await readFile(PATH, "utf8"));
const log = [];

// ---------- 1. INSURANCE ----------
const ins = d.find((p) => p.slug === "insurance");
// hero photo (was the small QR code -> upscaled/pixelated). Use the real office photo.
ins.featured_image = "/assets/img/OntarioHearing30-e597bb0a.webp";
let c = ins.content_markdown;
// H2 -> paragraph
c = c.replace("## We keep up on the latest **insurance** programs and their changes so you don’t have to.",
              "We keep up on the latest insurance programs and their changes so you don’t have to.");
// "hearing aids in Rochester, NY" + "hearing aids" links -> /hearing-aids/
c = c.replace("[hearing aids in Rochester, NY](https://ontariohearing.com/)", "[hearing aids in Rochester, NY](/hearing-aids/)");
c = c.replace('[hearing aids](https://ontariohearing.com/ "hearing aids")', "[hearing aids](/hearing-aids/)");
// CTA jumps to top -> contact page
c = c.replace("[Schedule Your Hearing Test](https://ontariohearing.com/insurance/#)", "[Schedule Your Hearing Test](/contact-us/)");
ins.content_markdown = c;
log.push("insurance: hero=" + ins.featured_image + " | H2->p:" + !c.includes("## We keep up") + " | home-links fixed:" + !c.includes("](https://ontariohearing.com/)") + " | cta:" + c.includes("[Schedule Your Hearing Test](/contact-us/)"));

// ---------- 2. HOW TO SERVICE — rejoin broken battery paragraph ----------
const svc = d.find((p) => p.slug === "how-to-service-hearing-aids");
let s = svc.content_markdown;
s = s.replace("when you wake up\n\nin the morning.", "when you wake up in the morning.");
s = s.replace("a quick 15 minute\n\ncharge often gives", "a quick 15 minute charge often gives");
svc.content_markdown = s;
log.push("battery sentence one-line: " + s.includes("a quick 15 minute charge often gives 3-4 hours of usage."));

// ---------- 3. NESTED PITTSFORD: repoint links, then remove pages ----------
const NESTED = {
  "/audiologists-in-pittsford-ny/cochlear-implants/": "/cochlear-implant/",
  "/audiologists-in-pittsford-ny/custom-ear-molds/": "/custom-ear-molds/",
  "/audiologists-in-pittsford-ny/hearing-tests/": "/hearing-test/",
  "/audiologists-in-pittsford-ny/tinnitus-evaluation-treatment/": "/tinnitus/",
};
// repoint any links to the nested URLs across all content
for (const p of d) {
  if (!p.content_markdown) continue;
  for (const [from, to] of Object.entries(NESTED)) p.content_markdown = p.content_markdown.split(from).join(to);
}
// remove the 4 nested page objects
const before = d.length;
const nestedSlugs = new Set(d.filter((p) => Object.keys(NESTED).includes(p.url_path)).map((p) => p.slug));
d = d.filter((p) => !Object.keys(NESTED).includes(p.url_path));
log.push("removed nested pages: " + (before - d.length) + " (slugs: " + [...nestedSlugs].join(", ") + ") | total now: " + d.length);

await writeFile(PATH, JSON.stringify(d, null, 2));
log.forEach((l) => console.log(l));
