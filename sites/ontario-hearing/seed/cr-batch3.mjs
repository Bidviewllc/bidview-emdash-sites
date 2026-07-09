// ClickUp CR batch 3: real-ear-measurement, walmart-hearing-aids, oticon, types-of-hearing-aids
import { readFile, writeFile } from "node:fs/promises";
const PATH = "src/data/pages.json";
const d = JSON.parse(await readFile(PATH, "utf8"));
const log = [];
const get = (s) => d.find((p) => p.slug === s);
const rep = (page, from, to, label) => {
  const had = page.content_markdown.includes(from);
  if (had) page.content_markdown = page.content_markdown.split(from).join(to);
  log.push(`${page.slug} | ${label}: ${had}`);
};

// ---------- REAL EAR MEASUREMENT ----------
const re = get("real-ear-measurement");
rep(re, "# Real Ear Measurement\n\nReal Ear Measurement\n\n", "# Real Ear Measurement\n\n", "remove duplicate title line");
// duplicate "Are real ear measurements necessary?" block (appears twice back-to-back)
{
  const block = "## Are real ear measurements necessary?\n\nReal ear measurement is greatly important because it is used to verify the gain (volume added) provided by the hearing aids based on the volume of the sounds and pitch that they pick up.\n\n";
  const dbl = block + block;
  const had = re.content_markdown.includes(dbl);
  if (had) re.content_markdown = re.content_markdown.replace(dbl, block);
  log.push(`real-ear | dedupe 'Are real ear measurements necessary?': ${had}`);
}
rep(re, " We have clinics located in [Brighton and Gates](https://www.google.com/maps?cid=9213821493223506062).", "", "remove Gates clinics sentence");

// ---------- WALMART ----------
const wm = get("walmart-hearing-aids");
rep(wm, "# Walmart Hearing Aids\n\nWalmart Hearing Aids\n\n", "# Walmart Hearing Aids\n\n", "remove duplicate title line");
const NEW_INTRO = "The chances of buying Walmart hearing aids that can help with hearing loss and purchasing a pair that makes no difference is the same. Buying hearing aids without getting a hearing test or being checked by an audiologist is most likely going to end as a hit-or-miss experience.";
rep(wm, "Hearing aids were created to make sounds easier to hear for people diagnosed with hearing loss. Currently, most of the modern hearing aids are powered by digital technology that not only aims to amplify sound but also to enhance speech clarity and reduce feedback.", NEW_INTRO, "replace intro with neutral text");
// remove the now-duplicate occurrence later in the page (keep the lead-in question)
rep(wm, "So, are Walmart hearing aids any good? Probably.\n\n" + NEW_INTRO, "So, are Walmart hearing aids any good? Probably.", "remove duplicate of new intro");
rep(wm, "#### What are over-the-counter (OTC) hearing aids?", "## What are over-the-counter (OTC) hearing aids?", "H4->H2 OTC #1");
rep(wm, "#### Are over the counter hearing aids any good?", "## Are over the counter hearing aids any good?", "H4->H2 OTC #2");

// ---------- OTICON ----------
const ot = get("oticon-hearing-aids");
rep(ot, "mayincrease", "may increase", "fix 'mayincrease' spacing");
rep(ot, "[schedule an appointmen](https://ontariohearing.com/contact-us/) t with", "[schedule an appointment](https://ontariohearing.com/contact-us/) with", "fix 'appointment' link spacing");

// ---------- TYPES OF HEARING AIDS ----------
const ty = get("types-of-hearing-aids");
rep(ty, "#### Types of hearing aid styles", "## Types of hearing aid styles", "H4->H2 styles");

await writeFile(PATH, JSON.stringify(d, null, 2));
log.forEach((l) => console.log(l));
