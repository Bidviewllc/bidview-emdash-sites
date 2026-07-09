// Apply Vince's recommended alt text (from the SEO sheet "images_missing_alt_text" tab)
// to pages.json — both images[].alt arrays and inline ![alt](src) markdown.
import { readFile, writeFile } from "node:fs/promises";

const PATH = "src/data/pages.json";
const d = JSON.parse(await readFile(PATH, "utf8"));

// filename-substring -> recommended alt text (verbatim from the sheet, column B)
const MAP = [
  ["Add-a-heading-18-78317c3f", "Online shopping cart graphic asking if cheap hearing aids are worth buying"],
  ["doctor-conducts-medical-examination-ear-little-girl-73457d1a", "Doctor examining a child’s ear with an otoscope"],
  ["Can-I-Buy-Hearing-Aids-Over-the-Counter-3139d97a", "Over-the-counter health care sign with stethoscope for hearing aid information"],
  ["headphones-with-microphone-lying-laptop-keyboard-desktop-clo-66de452f", "Headset with microphone resting on a laptop keyboard"],
  ["Can-Ear-Wax-Cause-Hearing-Loss--0cbc1fc9", "Man cupping his ear to listen, representing earwax-related hearing loss"],
  ["Phonak-Virto-Infinio-avif-e848bbf5", "Pair of Phonak Virto Infinio in-the-ear hearing aids"],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const changes = [];

for (const [needle, newAlt] of MAP) {
  for (const p of d) {
    // images[] array
    if (Array.isArray(p.images)) {
      for (const im of p.images) {
        if (im.src && im.src.includes(needle) && im.alt !== newAlt) {
          changes.push(`[${p.slug}] images[]: ${JSON.stringify(im.alt)} -> ${JSON.stringify(newAlt)}`);
          im.alt = newAlt;
        }
      }
    }
    // inline ![alt](...needle...)
    if (p.content_markdown) {
      const re = new RegExp("(!\\[)([^\\]]*)(\\]\\([^)]*" + escapeRe(needle) + "[^)]*\\))", "g");
      p.content_markdown = p.content_markdown.replace(re, (full, pre, oldAlt, post) => {
        if (oldAlt !== newAlt) changes.push(`[${p.slug}] inline: ${JSON.stringify(oldAlt)} -> ${JSON.stringify(newAlt)}`);
        return pre + newAlt + post;
      });
    }
  }
}

await writeFile(PATH, JSON.stringify(d, null, 2));
console.log("Applied " + changes.length + " alt-text changes:");
changes.forEach((c) => console.log("  " + c));
