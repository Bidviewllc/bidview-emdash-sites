import { getEmDashCollection } from "emdash";

export const routeCollections = ["pages", "team_members", "posts", "internal_pages"] as const;

export type RouteCollection = (typeof routeCollections)[number];

export interface RouteContent {
	collection: RouteCollection;
	entry: any;
	data: Record<string, any>;
}

export function normalizeRoute(value: string | undefined | null): string {
	if (!value) return "/";
	let route = value.startsWith("/") ? value : `/${value}`;
	if (route !== "/" && !route.endsWith("/")) route += "/";
	return route;
}

export async function getAllRouteContent(): Promise<RouteContent[]> {
	const groups = await Promise.all(
		routeCollections.map(async (collection) => {
			const { entries } = await getEmDashCollection(collection as any);
			return entries.map((entry: any) => ({
				collection,
				entry,
				data: entry.data ?? {},
			}));
		}),
	);
	return groups.flat();
}

export async function findRouteContent(route: string): Promise<RouteContent | null> {
	const normalized = normalizeRoute(route);
	const all = await getAllRouteContent();
	return all.find((item) => normalizeRoute(item.data.route) === normalized) ?? null;
}

export async function getSitemapEntries(group: string): Promise<RouteContent[]> {
	const all = await getAllRouteContent();
	return all
		.filter((item) => item.data.include_in_sitemap)
		.filter((item) => item.data.sitemap_group === group)
		.sort((a, b) => {
			const left = Number(a.data.sort_order ?? 0);
			const right = Number(b.data.sort_order ?? 0);
			return left - right;
		});
}
