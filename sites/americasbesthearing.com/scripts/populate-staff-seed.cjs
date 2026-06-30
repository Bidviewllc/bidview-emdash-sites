const fs = require("fs");
const path = require("path");

const root = process.cwd();
const defaultsPath = path.join(root, "src", "data", "homepage-defaults.ts");
const seedPath = path.join(root, "seed", "seed.json");

const source = fs.readFileSync(defaultsPath, "utf8");
const match = source.match(/export const staffMembers = (\[[\s\S]*?\])\.map\(/);
if (!match) throw new Error("Could not find staffMembers source array.");

const staffRows = Function(`"use strict"; return (${match[1]});`)();

const locationSlugByLabel = new Map([
  ["Lansing, MI", "lansing-mi"],
  ["Portage, MI", "portage-mi"],
  ["Anoka, MN", "anoka-mn"],
  ["Eden Prairie, MN", "eden-prairie-mn"],
  ["Edina, MN", "edina-mn"],
  ["Maple Grove, MN", "maple-grove-mn"],
  ["Mendota Heights, MN", "mendota-heights-mn"],
  ["New Ulm, MN", "new-ulm-mn"],
  ["Roseville, MN", "roseville-mn"],
  ["Willmar, MN", "willmar-mn"],
  ["Lake Wales, FL", "lake-wales-fl"],
  ["Sebring, FL", "sebring-fl"],
  ["Winter Haven, FL", "winter-haven-fl"],
]);

function locationSlugs(labels) {
  return String(labels)
    .split("|")
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => {
      const slug = locationSlugByLabel.get(label);
      if (!slug) throw new Error(`Missing location slug mapping for ${label}`);
      return slug;
    });
}

const staff = staffRows.map(([id, name, role, locations, profileUrl, imageSrc, imageAlt], index) => ({
  id,
  slug: id,
  status: "published",
  data: {
    name,
    role,
    locations,
    location_slugs: locationSlugs(locations),
    profile_url: profileUrl,
    image: {
      src: imageSrc,
      alt: imageAlt,
    },
    sort_order: index + 1,
  },
}));

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
seed.content = seed.content || {};
seed.content.staff = staff;
fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
console.log(`Wrote ${staff.length} staff entries to ${path.relative(root, seedPath)}`);
