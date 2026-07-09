// ClickUp CR batch 5 — NAP/hours footer, resources, lyric, giving-back, starkey,
//   what-kind-of-hearing-loss, hearing-loss, greece reviews
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

// ─── 1. resources (868k22hfm) ──────────────────────────────────────────────
const res = get("resources");
// Fix broken /4220-2/ link → correct renamed URL
rep(res, "https://ontariohearing.com/4220-2/", "https://ontariohearing.com/can-i-buy-hearing-aids-over-the-counter/", "fix /4220-2/ link");
// Fix Schedule button linking to # at bottom
rep(res, "[Schedule An Appointment](https://ontariohearing.com/resources/#)", "[Schedule An Appointment](/contact-us/)", "fix Schedule # link");
// Fix wrong description on Rechargeable Hearing Aids card
rep(res,
  "#### [Rechargeable Hearing Aids…](https://ontariohearing.com/rechargeable-hearing-aids/)\n\nBest Way To Clean Ears Cleaning your ears is important for the health of your",
  "#### [Rechargeable Hearing Aids](https://ontariohearing.com/rechargeable-hearing-aids/)\n\nEverything you need to know about rechargeable hearing aids, from how they work to",
  "fix Rechargeable card description"
);
// Remove the scraped "Recent Posts" section at the bottom (duplicate blog listing)
{
  const cut = res.content_markdown.indexOf("\n\n[![Hearing aid being fitted");
  if (cut >= 0) {
    res.content_markdown = res.content_markdown.slice(0, cut).trimEnd();
    log.push("resources | remove scraped Recent Posts + Categories tail: true");
  } else {
    log.push("resources | remove scraped Recent Posts tail: NOT FOUND");
  }
}

// ─── 2. lyric-hearing-aids (868k227nz) ────────────────────────────────────
const lyric = get("lyric-hearing-aids");
// "How much do Lyric hearing aids cost?" plain bold → H2
rep(lyric, "\n\n**How much do Lyric hearing aids cost?**\n\n", "\n\n## How much do Lyric hearing aids cost?\n\n", "plain bold -> H2 cost section");
// Fix "two clinics in Gates and Brighton" → "a clinic in Brighton" (Gates closed)
rep(lyric, "We have two clinics located in Gates and Brighton", "We have a clinic located in Brighton", "remove Gates clinic reference");
// Remove the two stray photos that appear after the subscription section (unrelated images)
rep(lyric,
  "\n\n![Female doctor in white coat giving thumbs up](/assets/img/pretty-young-general-practitioner-fd8eae2a.webp)\n\n![Young boy in orange shirt giving thumbs up at community space](/assets/img/OntarioHearingCenter-332-2-1-ae20443a.webp)\n\n## How do I get help",
  "\n\n## How do I get help",
  "remove stray photos after subscription section"
);
// Fix "preferredchoice" typo
rep(lyric, "are the preferredchoice when it", "are the preferred choice when it", "fix 'preferredchoice' typo");

// ─── 3. giving-back (868k235gf) ─────────────────────────────────────────────
const gb = get("giving-back");
// Remove first YouTube embed artifact block (Hearing the Call video)
rep(gb,
  "Hearing the Call - The Hearing Smile - YouTube\n\nTap to unmute\n\n[Hearing the Call - The Hearing Smile](https://www.youtube.com/watch?v=RTm_1NgRb_8) Entheos Audiology Cooperative, Inc\n\n![thumbnail-image](/assets/img/Nm7HKSntNrk8w3pBgaoPxDh-cYCUsc6rvZvoSEH3K6OrivT3xm5QOY4e-0UO-ca3a9855.webp)\n\nEntheos Audiology Cooperative, Inc103 subscribers\n\n[Watch on](https://www.youtube.com/watch?v=RTm_1NgRb_8)",
  "[Watch: Hearing the Call — The Hearing Smile](https://www.youtube.com/watch?v=RTm_1NgRb_8)",
  "replace YouTube embed #1 with clean link"
);
// Remove second YouTube embed artifact block (Zambia college video)
rep(gb,
  "Ontario Hearing Center Helps Bring New Audiology College to Life in Zambia! - YouTube\n\nTap to unmute\n\n[Ontario Hearing Center Helps Bring New Audiology College to Life in Zambia!](https://www.youtube.com/watch?v=rXUnnTlnwnU) Ontario Hearing Center\n\n![thumbnail-image](/assets/img/AIdro_nLDRFkW4-H3DXefKqVCiv64nSX1pCGNxxB-s1JqQGZT_lalhc7_7Oc-79575e8f.webp)\n\nOntario Hearing Center 1 subscriber\n\n[Watch on](https://www.youtube.com/watch?v=rXUnnTlnwnU)",
  "[Watch: Ontario Hearing Center Helps Bring New Audiology College to Life in Zambia!](https://www.youtube.com/watch?v=rXUnnTlnwnU)",
  "replace YouTube embed #2 with clean link"
);
// Remove stray plain-text "How You Can Help" section header that has no H# markup
rep(gb,
  "\n\nHow You Can Help\n\nJoin **[Ontario Hearing Center](https://ontariohearing.com/)** in Helping Others",
  "\n\n## How You Can Help\n\nJoin **[Ontario Hearing Center](https://ontariohearing.com/)** in Helping Others",
  "promote 'How You Can Help' to H2"
);

// ─── 4. starkey-hearing-aids (868k3hnkq) ────────────────────────────────────
const sk = get("starkey-hearing-aids");
// Remove duplicate "## Starkey Hearing Aids" H2 right after H1
rep(sk,
  "# Starkey Hearing Aids\n\n## Starkey Hearing Aids\n\n",
  "# Starkey Hearing Aids\n\n",
  "remove dup ## Starkey Hearing Aids H2"
);
// "#### Starkey Evolv AI" → "## Starkey Evolv AI"
sk.content_markdown = sk.content_markdown.replace(/^#### Starkey Evolv AI$/gm, "## Starkey Evolv AI");
log.push("starkey-hearing-aids | #### -> ## Starkey Evolv AI: done");
// Move "## Starkey Hearing Aids Technology" section to just before Rochester CTA
// Extract the section first, then re-insert it later
{
  const techStart = "\n\n## Starkey Hearing Aids Technology\n\n";
  const afterTech = "\n\n## Starkey Edge AI\n\n";
  const chargerStart = "\n\n## Starkey Hearing Aid Chargers\n\n";
  const rochesterStart = "\n\n## Starkey Hearing Aids in Rochester, NY\n\n";

  const si = sk.content_markdown.indexOf(techStart);
  const ei = sk.content_markdown.indexOf(afterTech, si);
  if (si >= 0 && ei >= 0) {
    const techSection = sk.content_markdown.slice(si, ei); // includes leading \n\n
    // Remove section from current location
    let md = sk.content_markdown.slice(0, si) + "\n\n" + sk.content_markdown.slice(ei + 2);
    // Re-insert before Rochester CTA
    const ri = md.indexOf(rochesterStart);
    if (ri >= 0) {
      md = md.slice(0, ri) + techSection + md.slice(ri);
      sk.content_markdown = md;
      log.push("starkey-hearing-aids | move 'Starkey Hearing Aids Technology' before Rochester CTA: true");
    } else {
      log.push("starkey-hearing-aids | move section: Rochester CTA NOT FOUND");
    }
  } else {
    log.push(`starkey-hearing-aids | move 'Starkey Hearing Aids Technology': start=${si} end=${ei}`);
  }
}

// ─── 5. what-kind-of-hearing-loss-do-i-have (868k3hkwh) ────────────────────
const wklh = get("what-kind-of-hearing-loss-do-i-have");
// Fix "S chedule" typo → "Schedule" (also remove CID Gates link on "audiologist in Rochester, NY")
rep(wklh,
  "[S](https://ontariohearing.com/hearing-aids/) chedule an appointment with an [audiologist in Rochester, NY](https://www.google.com/maps?cid=4041293824026511859), today!",
  "Schedule an appointment with an audiologist in Rochester, NY today!",
  "fix 'S chedule' typo + remove CID Gates link"
);
// Remove "## Ready to Get Started?" tail section (scraped WP widget)
{
  const cut = wklh.content_markdown.indexOf("\n\n## Ready to Get Started?");
  if (cut >= 0) {
    wklh.content_markdown = wklh.content_markdown.slice(0, cut).trimEnd();
    log.push("what-kind-of-hearing-loss-do-i-have | remove 'Ready to Get Started' tail: true");
  } else {
    log.push("what-kind-of-hearing-loss-do-i-have | remove tail: NOT FOUND");
  }
}

// ─── 6. hearing-loss (868k3hmfb) ────────────────────────────────────────────
const hl = get("hearing-loss");
// H4 → H3 for both hearing loss type sections
rep(hl, "#### Sensorineural Hearing Loss", "### Sensorineural Hearing Loss", "H4->H3 Sensorineural");
rep(hl, "#### Conductive Hearing Loss", "### Conductive Hearing Loss", "H4->H3 Conductive");
// Fix Schedule link that goes to top of same page
rep(hl,
  "[Schedule Your Hearing Test](https://ontariohearing.com/hearing-loss/#)",
  "[Schedule Your Hearing Test](/hearing-test/)",
  "fix broken Schedule link → /hearing-test/"
);
// Fix "Hearing aids" link that goes to homepage instead of /hearing-aids/
rep(hl,
  '[Hearing aids](https://ontariohearing.com/ "Hearing aids")',
  "[Hearing aids](/hearing-aids/)",
  "fix 'Hearing aids' link to /hearing-aids/"
);

// ─── 7. audiologists-in-greece-ny (868k14j34) ────────────────────────────────
const gr = get("audiologists-in-greece-ny");
// Remove duplicate Matt review (appears twice — keep first occurrence)
rep(gr,
  '\n\n"Our experience has been incredible…"\n\nMy entire family (3 generations) have been going to Ontario Hearing Instruments for almost 20 years. Every aspect of our experience has been incredible. The staff is amazing. Dr. Segmund is almost like a family member to us. She truly understands our challenges and is ALWAYS looking for the best possible solutions for our hearing loss. I can\'t even count the number of times she has said something to the effect of: "I was at this conference and saw this and thought specifically of you and your dad - I think this would really help". My hearing loss has been in the "profound" range for years. I do not know how I could have managed this more effectively than I have with the help of Ontario Hearing. I have recommended their services many times for many people and will continue to do so. Definitely worth looking into. They truly provide amazing service to all their patients.\n\n[Matt](https://goo.gl/maps/diVvEsthapL9dr2X8)\n\n"I can\'t believe how much better I can hear now…"\n\nWell, I just turned 60 and decided to have my hearing tested. The good news is I needed hearing aids. I say good news because I can\'t believe how much better I can hear now. our audiologist was so knowledgeable and helped me select the proper hearing aids for my hearing loss. No more saying "What?", and I can finally hear the TV at a normal volume. Fantastic service and support from a well run office.\n\n[Dave](https://goo.gl/maps/G9wDNqBsqBmuYLeM6)\n\n5.0\n\n100 reviews on',
  "\n\n5.0 stars — 100 reviews on Google",
  "remove duplicate Matt+Dave reviews and fix rating header"
);
// Clean up the long Google review data URLs — keep name as plain text, remove dates
const googleReviewers = [
  ["[Monty Wright](https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2pBMWR6bDFPVk14WVdWa2RIUjVNREZ5YWtsNWRWRRAB!2m1!1s0x0:0x7fde11d4c772408e!3m1!1s2@1:CAIQACodChtycF9oOjA1dzl1OVMxYWVkdHR5MDFyakl5dVE%7C%7C)\n\n7 days ago", "**Monty Wright**"],
  ["[Liz Scagliozzi](https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2psc2IzZHBVMEZzTFhkRmNtUlhRNVprcGlaRkVSQUIRAB!2m1!1s0x0:0x7fde11d4c772408e!3m1!1s2@1:CAIQACodChtycF9oOjlsb3dpU0FsLXdFcmE1ZkpnZG12bUE%7C%7C)\n\n2 months ago", "**Liz Scagliozzi**"],
  ["[William Reigelsperger](https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2t0VFNuZzVUbEp6VlhwM05FOWtWRVZXT0RWdVIzYxAB!2m1!1s0x0:0x7fde11d4c772408e!3m1!1s2@1:CAIQACodChtycF9oOktTSng1TlJzVXp3NE9kVEVWODVuR3c%7C%7C)\n\n2 months ago", "**William Reigelsperger**"],
  ["[Lorraine Tyra](https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2pOSmNWbDZibEJNU2tWS05rUjJNMlZ6WVRoUmVHYxAB!2m1!1s0x0:0x7fde11d4c772408e!3m1!1s2@1:CAIQACodChtycF9oOjNJcVl6blBMSkVKNkR2M2VzYThReGc%7C%7C)\n\n4 months ago", "**Lorraine Tyra**"],
  ["[everett charette](https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChdDSUhNMG9nS0VJQ0FnSUN5NGEyZS13RRAB!2m1!1s0x0:0x7fde11d4c772408e!3m1!1s2@1:CIHM0ogKEICAgICy4a2e-wE%7C%7C)\n\n4 months ago", "**Everett Charette**"],
  ["[Michael Moellering](https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2tweGVEQlhibGh0YzFaR1ZuQXdZVTlQYzBOS1dHYxAB!2m1!1s0x0:0x7fde11d4c772408e!3m1!1s2@1:CAIQACodChtycF9oOkkxeDBXblhtc1ZGVnAwYU9Pc0NKWGc%7C%7C)\n\n5 months ago", "**Michael Moellering**"],
];
for (const [from, to] of googleReviewers) {
  rep(gr, from, to, `clean Google review: ${to}`);
}

// ─── Save ─────────────────────────────────────────────────────────────────────
await writeFile(PATH, JSON.stringify(d, null, 2));
log.forEach((l) => console.log(l));
console.log(`\nDone. ${log.filter(l => l.includes(": true") || l.includes(": done")).length}/${log.length} applied.`);
