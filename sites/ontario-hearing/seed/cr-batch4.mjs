// ClickUp CR batch 4 — 20 pages of text/heading/CID-link fixes
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
// Remove a CID maps link but keep the anchor text
const removeCid = (page, text, cid) => {
  const from = `[${text}](https://www.google.com/maps?cid=${cid})`;
  rep(page, from, text, `remove CID link on "${text}"`);
};
// Tag a plain-text FAQ question as H3
const h3q = (page, question) => {
  rep(page, `\n\n${question}\n\n`, `\n\n### ${question}\n\n`, `H3: "${question.slice(0,50)}"`);
};

// ─── 1. what-are-the-types-of-hearing-tests (868jzh9h2) ───────────────────────
const wtt = get("what-are-the-types-of-hearing-tests");
// Remove CID link to closed Gates office on "hearing tests in Rochester, NY"
removeCid(wtt, "hearing tests in Rochester, NY", "4041293824026511859");
// Also fix URL-only CID link variant that ends with period inside parens
rep(wtt, "[hearing tests in Rochester, NY.](https://ontariohearing.com/hearing-test/)", "hearing tests in Rochester, NY.", "fix broken hearing-test link");

// ─── 2. are-cheap-hearing-aids-worth-buying (868jzjhzh) ─────────────────────
const achb = get("are-cheap-hearing-aids-worth-buying");
// Remove the sentence with CID link to closed Gates office
rep(achb,
  "[Ontario Hearing Center](https://www.google.com/maps?cid=4041293824026511859) carry the most well-known and trusted brands in the hearing aid market to make it easier for you to choose a device that is tailored-fit to your specific requirements.\n\n",
  "",
  "remove CID 'Ontario Hearing Center carry' sentence"
);

// ─── 3. hearing-aids-in-fairport-ny (868k0f69z) ─────────────────────────────
const haif = get("hearing-aids-in-fairport-ny");
// Replace Benefits section with new task-provided content
rep(haif,
  "## Benefits of Hearing Aids for Everyday Life\n\nHearing aids do much more than amplify sound. They enable individuals to engage in conversations, enjoy music, and appreciate the sounds of nature. Improved hearing contributes to enhanced emotional well-being and a more active social life.",
  `## Benefits of Hearing Aids for Everyday Life\n\nHearing aids do more than make sounds louder. They help you stay engaged, communicate with less effort, and feel more confident in everyday situations. From conversations at home to busy restaurants and phone calls, the right hearing aids can make daily life feel clearer and easier.\n\n- Hearing aids help you follow conversations more easily, whether you're talking one-on-one, joining a family dinner, or listening in a busy restaurant.\n- They make everyday sounds clearer, including doorbells, alarms, phone notifications, traffic sounds, and voices from another room.\n- Better hearing can reduce the strain of constantly asking people to repeat themselves, helping you feel more relaxed and confident in social settings.\n- Hearing aids can improve your connection with family, friends, and coworkers by making communication smoother and less frustrating.\n\nWith the right fitting and follow-up care, hearing aids support independence, safety, and a better overall quality of life.`,
  "replace Benefits section with new content"
);
// Remove bottom images + service links (scraping artifacts)
rep(haif,
  "\n\n![Custom ear molds for personalized comfort and superior hearing support.](/assets/img/woman-holding-two-hearing-aids-hands-r0ahjl8om30dbsgzz5z6sm1-bd021320.webp)\n\n![Person inserting small blue hearing aid into ear canal](/assets/img/650x350_in_ear_hearing_aid_other-r0ahk17xu9m8t5tsduvuh00mxcu-ff358c57.webp)\n\n![OTChearingAid-469123266-650x450-650x428](/assets/img/OTChearingAid-469123266-650x450-650x428-1-r0ahj59fdwehuf47kh-4ea987b4.webp)\n\n![Male audiologist fitting hearing aid into woman ear](/assets/img/smiling-focused-bearded-dark-haired-male-audiologist-putting-89194047.webp)\n\n- [Ear Molds](https://ontariohearing.com/custom-ear-molds/)\n- [Hearing Test](https://ontariohearing.com/hearing-test/)\n- [Tinnitus](https://ontariohearing.com/tinnitus/)\n- [Cochlear Implant](https://ontariohearing.com/cochlear-implant/)",
  "",
  "remove bottom images+service links"
);
// Also remove CID link
removeCid(haif, "hearing aids in Fairport, NY", "9213821493223506062");

// ─── 4. hearing-aid-fittings-in-rochester-ny (868k0wh2k + 868k14ncy) ─────────
const hafit = get("hearing-aid-fittings-in-rochester-ny");
// Remove duplicate title at very top
rep(hafit, "Hearing Aid Fittings\n\n# Hearing Aid Fittings", "# Hearing Aid Fittings", "remove dup title 'Hearing Aid Fittings'");
// Convert all #### to ###
hafit.content_markdown = hafit.content_markdown.replace(/^#### /gm, "### ");
log.push("hearing-aid-fittings-in-rochester-ny | #### -> ### throughout: done");
// Rename second duplicate "What to Expect When You First Start"
{
  const first = hafit.content_markdown.indexOf("### What to Expect When You First Start");
  const second = hafit.content_markdown.indexOf("### What to Expect When You First Start", first + 1);
  if (second >= 0) {
    hafit.content_markdown = hafit.content_markdown.slice(0, second) +
      "### Tips for a Successful Adjustment" +
      hafit.content_markdown.slice(second + "### What to Expect When You First Start".length);
    log.push("hearing-aid-fittings-in-rochester-ny | rename 2nd 'What to Expect' -> 'Tips for a Successful Adjustment': true");
  } else {
    log.push("hearing-aid-fittings-in-rochester-ny | rename 2nd 'What to Expect': NOT FOUND");
  }
}
// Tag FAQ questions as H3
h3q(hafit, "Why is a professional hearing aid fitting important?");
h3q(hafit, "What should I bring to my hearing aid fitting appointment?");
h3q(hafit, "How long do hearing aid fittings take?");

// ─── 5. what-helps-tinnitus-go-away (868k14uw8) ─────────────────────────────
const whtg = get("what-helps-tinnitus-go-away");
// Remove the H2 that duplicates the page title (appears right after TOC)
rep(whtg, "\n\n## What helps tinnitus go away?\n\nTinnitus is", "\n\nTinnitus is", "remove dup H2 'What helps tinnitus go away'");
// Remove CID link on "hearing aids for tinnitus in Rochester, NY"
removeCid(whtg, "hearing aids for tinnitus in Rochester, NY", "4041293824026511859");

// ─── 6. menieres-disease (868k221bb) ─────────────────────────────────────────
const men = get("menieres-disease");
// "Vestibular evoked myogenic potential (VEMP)" plain text → H3
rep(men, "\nVestibular evoked myogenic potential (VEMP)\n", "\n### Vestibular evoked myogenic potential (VEMP)\n", "H3 VEMP");
// "## Auditory brainstem response test (ABR)" → H3
rep(men, "## Auditory brainstem response test (ABR)", "### Auditory brainstem response test (ABR)", "H2->H3 ABR");
// "Imaging Tests" plain text → H3
rep(men, "\nImaging Tests\n", "\n### Imaging Tests\n", "H3 Imaging Tests");

// ─── 7. what-kind-of-hearing-aids-would-work-best-for-me (868k2237f) ─────────
const wkhab = get("what-kind-of-hearing-aids-would-work-best-for-me");
removeCid(wkhab, "audiologists and hearing aids in Rochester, NY", "4041293824026511859");

// ─── 8. cochlear-implant (868k2263a + 868k3hryd) ─────────────────────────────
const ci = get("cochlear-implant");
// H4 → H3 for subsections
rep(ci, "#### Cochlear Implants In Children", "### Cochlear Implants In Children", "H4->H3 children");
rep(ci, "#### Another Chance To Hear", "### Another Chance To Hear", "H4->H3 another chance");
// Tag FAQ questions as H3
h3q(ci, "How does a cochlear implant work?");
// First occurrence of "How does someone receive a cochlear implant?"
rep(ci, "\n\nHow does someone receive a cochlear implant?\n\nThe first step", "\n\n### How does someone receive a cochlear implant?\n\nThe first step", "H3 FAQ: how to receive");
// Second occurrence (step-by-step) — rename to avoid duplicate
rep(ci, "\n\nHow does someone receive a cochlear implant?\n\nStep 1:", "\n\n### What is the cochlear implant procedure?\n\nStep 1:", "rename dup FAQ to 'What is the procedure'");
h3q(ci, "Can you use a cochlear implant for moderate hearing loss?");

// ─── 9. how-long-will-my-hearing-aid-last (868k2fe37) ────────────────────────
const hlha = get("how-long-will-my-hearing-aid-last");
rep(hlha, "Ontario Hearing Center have expert", "Ontario Hearing Center has expert", "grammar: have->has");
removeCid(hlha, "audiologists in Rochester, NY", "4041293824026511859");

// ─── 10. unitron-hearing-aids (868k2fhfe) ────────────────────────────────────
const uha = get("unitron-hearing-aids");
rep(uha, "#### Unitron Udirect 3", "### Unitron Udirect 3", "H4->H3 uDirect 3");
rep(uha, "#### Unitron Utv3", "### Unitron Utv3", "H4->H3 uTV3");
rep(uha, "#### Unitron Ucontrol", "### Unitron Ucontrol", "H4->H3 uControl");
rep(uha, "#### Unitron Hearing Aids in Rochester, NY", "## Unitron Hearing Aids in Rochester, NY", "H4->H2 Rochester section");
rep(uha, "at our clinics located in [Brighton]", "at our clinic located in [Brighton]", "clinics->clinic");

// ─── 11. hearing-tests-in-brighton-ny (868k2fkze) ───────────────────────────
const htbn = get("hearing-tests-in-brighton-ny");
// "[hearing tests in Brighton](CID) and [Gates, NY](CID)" → "hearing tests in Brighton, NY"
rep(htbn,
  "[hearing tests in Brighton](https://www.google.com/maps?cid=9213821493223506062) and [Gates, NY](https://www.google.com/maps?cid=4041293824026511859)",
  "hearing tests in Brighton, NY",
  "remove Gates from Brighton hearing tests sentence"
);

// ─── 12. hearing-test (868k38tvq) ────────────────────────────────────────────
const ht = get("hearing-test");
// Remove the alt-text paragraph that bled into content after the image
rep(ht,
  "](/assets/img/OntarioHearingCenter-332-2-a7c21541.webp)An image of a hearing specialist performing a thorough hearing test at Ontario Hearing Center in Rochester, NY. This test evaluates hearing abilities to detect any degree of hearing loss, enabling tailored recommendations for hearing aids or other solutions. Ontario Hearing Center provides professional hearing test services to ensure residents of Rochester, NY receive accurate assessments and effective hearing support.",
  "](/assets/img/OntarioHearingCenter-332-2-a7c21541.webp)",
  "remove bleeding alt-text paragraph"
);
// Also remove the Brighton CID link (it's the active office but links to Google Maps — keep it? task doesn't mention. Leave it.)
// Tag FAQ questions as H3
h3q(ht, "What happens during a hearing test?");
h3q(ht, "Why would I need a hearing test?");
h3q(ht, "What happens after a hearing test?");
h3q(ht, "Where is a hearing test performed?");

// ─── 13. custom-ear-molds (868k3hn26) ────────────────────────────────────────
const cem = get("custom-ear-molds");
// Tag FAQ questions as H3 (first occurrence of each unique question)
h3q(cem, "Why use ear molds for hearing loss?");
h3q(cem, "Why do ear molds have different shapes and sizes?");
h3q(cem, "How does an ear mold work?");
h3q(cem, "What happens during an ear mold fitting?");
// Second "Why use ear molds for hearing loss?" (about feedback) — rename it
rep(cem,
  "### Why use ear molds for hearing loss?\n\nEar molds often help to keep the amplified sounds",
  "### How do ear molds prevent feedback?\n\nEar molds often help to keep the amplified sounds",
  "rename dup FAQ to 'How do ear molds prevent feedback'"
);
// Remove CID link (Brighton office link in body)
removeCid(cem, "custom ear molds in Rochester, NY", "9213821493223506062");

// ─── 14. sensorineural-hearing-loss (868k3hpfn) ──────────────────────────────
const snhl = get("sensorineural-hearing-loss");
// Fix Gates reference
rep(snhl, "our Ontario Hearing Center at Brighton or Gates for diagnosis", "our Ontario Hearing Center in Brighton for diagnosis", "remove 'or Gates' reference");
// Tag FAQ questions as H3
h3q(snhl, "Why Would I Need a Hearing Test?");
h3q(snhl, "How is sudden deafness treated?");
h3q(snhl, "Are steroids more effective in treating sensorineural hearing loss?");
h3q(snhl, "Is sensorineural hearing loss an emergency?");
h3q(snhl, "Does sensorineural hearing loss get better?");
h3q(snhl, "Can sensorineural hearing loss be corrected?");
h3q(snhl, "What is the difference between conductive hearing loss and sensorineural hearing loss?");
h3q(snhl, "Does sensorineural hearing loss get worse?");
h3q(snhl, "What happens if sensorineural hearing loss is not treated?");
h3q(snhl, "Do cochlear implants work for sensorineural hearing loss?");

// ─── 15. how-can-you-improve-your-hearing (868k3ht1n) ────────────────────────
const hciyh = get("how-can-you-improve-your-hearing");
// Remove plain-text "How can you improve your hearing?" that appears after the H2
rep(hciyh,
  "## How can you improve your hearing?\n\nHow can you improve your hearing?\n\nA crucial component",
  "## How can you improve your hearing?\n\nA crucial component",
  "remove dup plain-text 'How can you improve your hearing?'"
);
// Remove CID link to closed Gates office on "audiology services in Rochester, NY"
removeCid(hciyh, "audiology services in Rochester, NY", "4041293824026511859");

// ─── 16. what-are-the-first-signs-of-tinnitus (868k3ht94) ───────────────────
const wafst = get("what-are-the-first-signs-of-tinnitus");
removeCid(wafst, "tinnitus in Rochester, NY", "4041293824026511859");

// ─── 17. is-vertigo-a-hearing-disorder (868k3mxg4) ──────────────────────────
const ivhd = get("is-vertigo-a-hearing-disorder");
removeCid(ivhd, "audiologists in Rochester, NY", "4041293824026511859");

// ─── 18. costco-hearing-aids (868k3n0j4) ─────────────────────────────────────
const ctha = get("costco-hearing-aids");
// Remove duplicate title at top
rep(ctha, "# Costco Hearing Aids\n\nCostco Hearing Aids\n\n", "# Costco Hearing Aids\n\n", "remove dup title 'Costco Hearing Aids'");
// Tag FAQ questions as H3
h3q(ctha, "Can I try on and test Costco hearing aids before purchasing?");
h3q(ctha, "Is there a limited selection of hearing aid models available at Costco?");
h3q(ctha, "How effective are Costco hearing aids for people with different types of hearing loss?");
// Remove bottom modal/popup content (scraping artifact)
rep(ctha,
  "\n\n[Close](https://ontariohearing.com/costco-hearing-aids/#)\n\nHear better with personalized fitting, expert support, and follow-up care.\n\nCall today.\n\n[(585) 442-4180](tel:5854424180)\n\n### [(585) 442-4180](tel:5854424180)",
  "",
  "remove bottom popup modal content"
);

// ─── 19. what-are-the-five-signs-of-hearing-loss (868k3n6rn) ────────────────
const wafsl = get("what-are-the-five-signs-of-hearing-loss");
rep(wafsl, "Ontario Hearing offers comprehensive", "Ontario Hearing Center offers comprehensive", "Ontario Hearing -> Ontario Hearing Center");

// ─── 20. audiologist-in-pittsford-ny (868k38u0b) ────────────────────────────
const aipn = get("audiologist-in-pittsford-ny");
// Update dead link to deleted nested page
rep(aipn,
  "https://ontariohearing.com/audiologists-in-pittsford-ny/hearing-aid-fittings/",
  "https://ontariohearing.com/hearing-aid-fittings-in-rochester-ny/",
  "fix dead hearing-aid-fittings link"
);

// ─── Save ─────────────────────────────────────────────────────────────────────
await writeFile(PATH, JSON.stringify(d, null, 2));
log.forEach((l) => console.log(l));
console.log(`\nDone. ${log.filter(l => l.includes(": true")).length}/${log.length} replacements applied.`);
