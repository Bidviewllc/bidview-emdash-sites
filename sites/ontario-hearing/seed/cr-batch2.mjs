// ClickUp CR batch: nano, audiology, services, diet→earwax, what-to-expect,
// how-to-talk, hearing-aid-batteries.
import { readFile, writeFile } from "node:fs/promises";
const PATH = "src/data/pages.json";
const d = JSON.parse(await readFile(PATH, "utf8"));
const log = [];
const get = (slug) => d.find((p) => p.slug === slug);
const rep = (page, from, to, label) => {
  const had = page.content_markdown.includes(from);
  if (had) page.content_markdown = page.content_markdown.split(from).join(to);
  log.push(`${page.slug} | ${label}: ${had}`);
};

// ---------- 1. NANO ----------
const nano = get("nano-hearing-aids");
rep(nano, "#### Are Nano Hearing Aids Any Good?", "## Are Nano Hearing Aids Any Good?", "b) H4->H2 'Are Nano…'");
rep(nano, "\nAudiologists and Hearing Aids in Rochester, NY\n", "\n## Audiologists and Hearing Aids in Rochester, NY\n", "c) plain->H2 location");
rep(nano,
  "best [audiologists in Rochester, NY](https://ontariohearing.com/). [Contact Ontario Hearing Center](https://ontariohearing.com/contact-us/) to schedule an appointment!",
  "best audiologists in Rochester, NY.",
  "d) trim CTA sentence + home link");

// ---------- 2. AUDIOLOGY ----------
const aud = get("audiology");
rep(aud,
  "They provide a variety of hearing treatments, such as [fitting hearing aids](https://ontariohearing.com/hearing-aid-fittings-in-rochester-ny/), programming [hearing implants](https://ontariohearing.com/cochlear-implant/), customizing sound protection, aural rehabilitation, and counseling.",
  "They provide a variety of services, such as hearing aid fittings, customizing sound protection, providing aural rehabilitation, and counseling.",
  "services sentence");
rep(aud,
  "The audiologists of Ontario Hearing Center are dedicated to providing quality [hearing services in Rochester, NY](https://www.google.com/maps?cid=9213821493223506062). We provide the world’s most advanced hearing technologies, personalized audiological care, and solutions for your hearing loss.",
  "The audiologists at Ontario Hearing Center are dedicated to providing quality hearing services in Rochester, NY. We provide advanced hearing technologies, personalized audiological care, and world-class solutions for your hearing needs.",
  "expert audiologists sentence");
// remove broken "our audiologist x3" block
const audBefore = aud.content_markdown.length;
aud.content_markdown = aud.content_markdown.replace(/(\n#### our audiologist\n\nAudiologist\n?)+/g, "\n");
log.push(`audiology | removed 'our audiologist' block: ${aud.content_markdown.length < audBefore}`);

// ---------- 3. SERVICES ----------
const svc = get("services");
rep(svc, "\nHearing Services in Rochester, NY\n", "\n### Hearing Services in Rochester, NY\n", "H3 'Hearing Services…'");

// ---------- 4. DIET -> EAR WAX (title + slug + url + remove header) ----------
const diet = get("understanding-the-impact-of-diet-on-ear-health");
const NEW_TITLE = "Understanding Ear Wax: Causes, Care, and When to See an Audiologist";
diet.title = NEW_TITLE + " | Ontario Hearing Center";
diet.meta_title = NEW_TITLE + " | Ontario Hearing Center";
if (diet.h1) diet.h1 = NEW_TITLE;
diet.slug = "understanding-ear-wax-causes-care-when-to-see-an-audiologist";
diet.url_path = "/understanding-ear-wax-causes-care-when-to-see-an-audiologist/";
rep(diet, "# Tinnitus: Understanding the Impact of Diet on Ear Health", "# " + NEW_TITLE, "H1 rename");
rep(diet, "## Tinnitus: Understanding the Impact of Diet on Ear Health\n\n", "", "remove stray H2 header");
log.push(`diet | new slug: ${diet.slug}`);

// ---------- 5. WHAT TO EXPECT (H4 -> H2 x2) ----------
const wte = get("what-to-expect");
rep(wte, "#### Audiologists and Hearing Aids in Rochester, NY", "## Audiologists and Hearing Aids in Rochester, NY", "H4->H2 location");
rep(wte, "#### **Audiology** Clinic You Can Trust - Ontario Hearing Center, Rochester, NY", "## **Audiology** Clinic You Can Trust - Ontario Hearing Center, Rochester, NY", "H4->H2 clinic");

// ---------- 6. HOW TO TALK (condense intro) ----------
const ht = get("how-to-talk-with-loved-ones-about-hearing-loss");
{
  const c = ht.content_markdown;
  const start = c.indexOf("You may be wondering how to talk");
  const endMarker = "quality of life for both of you.";
  const end = c.indexOf(endMarker, start);
  if (start !== -1 && end !== -1) {
    const NEW = "You may be wondering how to talk with your loved ones about hearing loss without starting a fight or hurting feelings. Learning gentle, smart ways to start this conversation can make a real difference. It’s not just about hearing; it’s about safety, connection, and quality of life for both of you.";
    ht.content_markdown = c.slice(0, start) + NEW + c.slice(end + endMarker.length);
    log.push("how-to-talk | intro condensed: true");
  } else log.push(`how-to-talk | intro condensed: FAILED (start=${start} end=${end})`);
}

// ---------- 7. HEARING AID BATTERIES ----------
const bat = get("hearing-aid-batteries");
rep(bat, "# Hearing Aid Batteries\n\nHearing Aid Batteries\n", "# Hearing Aid Batteries\n", "remove duplicate title line");
rep(bat, "#### Rechargeable batteries", "### Rechargeable batteries", "H4->H3 rechargeable");
rep(bat, "#### Standard disposable batteries", "### Standard disposable batteries", "H4->H3 disposable");
const batBefore = bat.content_markdown.length;
bat.content_markdown = bat.content_markdown.replace(/\n*We have two offices conveniently located in Brighton\.\s*/g, "\n\n").replace(/\n{3,}/g, "\n\n");
log.push(`batteries | removed 'two offices': ${bat.content_markdown.length < batBefore}`);

await writeFile(PATH, JSON.stringify(d, null, 2));
log.forEach((l) => console.log(l));
