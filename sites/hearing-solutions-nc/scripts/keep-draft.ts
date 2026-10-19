// Change fields on a live record without publishing someone's unpublished edits.
// Published record with a pending draft: the new fields go live on top of the
// live version, then the draft's own changes are put back as a draft. Record
// not published: only the draft changes. Otherwise: update and publish.
import type { EmDashClient } from "emdash/client";

export async function saveKeepingDraft(client: EmDashClient, collection: string, slug: string, data: Record<string, unknown>) {
	const e: any = await client.get(collection, slug);
	if (e.status !== "published") {
		await client.update(collection, e.id, { data });
		return "left as draft";
	}
	if (!e.draftRevisionId || !e.liveData) {
		await client.update(collection, e.id, { data });
		await client.publish(collection, e.id);
		return "published";
	}
	const pending = Object.fromEntries(
		Object.keys(e.data)
			.filter((k) => !(k in data) && JSON.stringify(e.data[k]) !== JSON.stringify(e.liveData[k]))
			.map((k) => [k, e.data[k]]),
	);
	const asLive = Object.fromEntries(Object.keys(pending).map((k) => [k, e.liveData[k] ?? null]));
	await client.update(collection, e.id, { data: { ...asLive, ...data } });
	await client.publish(collection, e.id);
	if (Object.keys(pending).length) await client.update(collection, e.id, { data: pending });
	return `published; unpublished edits kept as a draft (${Object.keys(pending).join(", ") || "none"})`;
}
