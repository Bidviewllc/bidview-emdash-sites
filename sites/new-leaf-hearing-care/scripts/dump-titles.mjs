import { readFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve(".");
const seed = JSON.parse(readFileSync(path.join(root, "seed", "seed.json"), "utf8"));
const want = new Set([
  "hearing-aids-products/choosing-a-hearing-aid","audiology-services/communication-training-program",
  "give-back/hearing-the-call","give-back/hear-it-forward","hearing-aids-products/hearing-aid-accessories",
  "hearing-aids-products/hearing-aid-fittings","hearing-aids-products/hearing-aid-repairs-maintenance",
  "hearing-aids-products/hearing-aid-styles","patient-resources/hearing-loss-association-of-america",
  "hearing-loss/hearing-loss-facts","hearing-loss","hearing-loss/how-we-hear","online-hearing-tests",
  "hearing-loss/protecting-your-hearing","research-linking-untreated-hearing-loss-to-dementia-risk-and-falls",
  "audiology-services/tinnitus-evaluation-management",
  "oticon-hearing-aids","phonak-hearing-aids","resound-hearing-aids","signia-hearing-aids",
  "starkey-hearing-aids","unitron-hearing-aids","widex-hearing-aids",
  "patient-care-coordinator/rose-young","privacy-policy",
]);
for (const c of Object.keys(seed.content)) {
  for (const e of seed.content[c]) {
    if (!want.has(e.slug)) continue;
    const t = e.data.meta_title || e.data.page_title || e.data.title || "";
    const d = e.data.meta_description || "";
    console.log(`[${c}] ${e.slug}`);
    console.log(`   TITLE(${t.length}): ${t}`);
    console.log(`   DESC(${d.length}): ${d || "(MISSING)"}`);
  }
}
