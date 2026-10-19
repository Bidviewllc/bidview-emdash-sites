// Writes SQL that adds the seed's menus to a site that was set up before the
// menus were in the seed (the seed only applies at setup). Menus that already
// exist by name are left alone. Content links are looked up by slug.
//
//   npx tsx scripts/menus-sql.ts > menus.sql
//   npx wrangler d1 execute DB --remote --file menus.sql
import { randomBytes } from "node:crypto";
import { menus } from "./build-seed";

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const id = () => "01" + [...randomBytes(24)].map((b) => B32[b % 32]).join("");
const q = (v: string | null | undefined) => (v == null ? "NULL" : `'${v.replace(/'/g, "''")}'`);
const slugFromRef = (ref: string) => ref.replace(/^[a-z]+-/, "");
const now = new Date().toISOString();

type Item = { type: string; label: string; url?: string; collection?: string; ref?: string; children?: Item[] };
const out: string[] = [];

for (const menu of menus) {
	const menuId = id();
	out.push(
		`INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group) SELECT ${q(menuId)}, ${q(menu.name)}, ${q(menu.label)}, ${q(now)}, ${q(now)}, 'en', ${q(menuId)} WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = ${q(menu.name)});`,
	);
	const add = (items: Item[], parent: string | null) =>
		items.forEach((it, i) => {
			const itemId = id();
			const refId = it.ref && it.collection ? `(SELECT id FROM ec_${it.collection} WHERE slug = ${q(slugFromRef(it.ref))} LIMIT 1)` : "NULL";
			out.push(
				`INSERT INTO _emdash_menu_items (id, menu_id, parent_id, sort_order, type, reference_collection, reference_id, custom_url, label, title_attr, target, css_classes, created_at, locale, translation_group) SELECT ${q(itemId)}, ${q(menuId)}, ${q(parent)}, ${i}, ${q(it.type)}, ${q(it.collection ?? null)}, ${refId}, ${q(it.url ?? null)}, ${q(it.label)}, NULL, NULL, NULL, ${q(now)}, 'en', ${q(itemId)} WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = ${q(menuId)});`,
			);
			if (it.children) add(it.children, itemId);
		});
	add(menu.items as Item[], null);
}
console.log(out.join("\n"));
