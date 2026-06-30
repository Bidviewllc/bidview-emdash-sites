import seed from "../seed/seed.json";
export type Entry = { collection: string; slug: string; status: string; data: Record<string, string> };
const map = new Map<string, Entry>();
for (const e of (seed as any).entries as Entry[]) map.set(e.slug, e);
export function getEntry(slug: string): Entry | null { return map.get(slug) ?? null; }
export const allSlugs = [...map.keys()];
