// Central, sitewide image alt-text resolver.
// Every <img> that renders a content image should route its alt through altFor()
// so the same image always gets the same (curated/recommended) alt text — in heroes,
// inline content, blog grids, related-article thumbnails, sidebars, everywhere.
import pagesData from "../data/pages.json";

// Authoritative SEO-recommended alt text (from the technical-SEO audit sheet,
// "images_missing_alt_text" tab). These take precedence over anything else.
const RECOMMENDED: Record<string, string> = {
  "Add-a-heading-18-78317c3f.webp": "Online shopping cart graphic asking if cheap hearing aids are worth buying",
  "doctor-conducts-medical-examination-ear-little-girl-73457d1a.webp": "Doctor examining a child’s ear with an otoscope",
  "Can-I-Buy-Hearing-Aids-Over-the-Counter-3139d97a.webp": "Over-the-counter health care sign with stethoscope for hearing aid information",
  "headphones-with-microphone-lying-laptop-keyboard-desktop-clo-66de452f.webp": "Headset with microphone resting on a laptop keyboard",
  "Can-Ear-Wax-Cause-Hearing-Loss--0cbc1fc9.webp": "Man cupping his ear to listen, representing earwax-related hearing loss",
  "Phonak-Virto-Infinio-avif-e848bbf5.webp": "Pair of Phonak Virto Infinio in-the-ear hearing aids",
};

const stemOf = (src: string): string => (src.split("/").pop() || "").split("?")[0];

// Build a sitewide map from every page's curated images[] alt, then layer the
// authoritative recommendations on top so they always win.
const MAP: Record<string, string> = {};
for (const p of pagesData as any[]) {
  for (const im of (p.images || [])) {
    if (im && im.src && im.alt) {
      const stem = stemOf(im.src);
      if (stem && !MAP[stem]) MAP[stem] = im.alt;
    }
  }
}
Object.assign(MAP, RECOMMENDED);

/** Return the curated alt for an image src, falling back to the supplied text. */
export function altFor(src?: string | null, fallback = ""): string {
  if (!src) return fallback;
  return MAP[stemOf(src)] ?? fallback;
}

/** Return only an authoritative SEO-recommended alt for a src, or undefined. */
export function recommendedAltFor(src?: string | null): string | undefined {
  if (!src) return undefined;
  return RECOMMENDED[stemOf(src)];
}

/** Rewrite <img> alt attributes in an HTML string to the recommended alt where one exists. */
export function enforceAltInHtml(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcM = tag.match(/\bsrc="([^"]*)"/i);
    if (!srcM) return tag;
    const rec = recommendedAltFor(srcM[1]);
    if (!rec) return tag;
    const safe = rec.replace(/"/g, "&quot;");
    return /\balt="/i.test(tag)
      ? tag.replace(/\balt="[^"]*"/i, `alt="${safe}"`)
      : tag.replace(/<img\b/i, `<img alt="${safe}"`);
  });
}
