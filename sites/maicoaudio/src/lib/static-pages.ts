import { staticPageShells } from "../generated/static-page-manifest";

const pageShells = import.meta.glob("../shells/pages/*.html", {
	eager: true,
	import: "default",
	query: "?raw",
}) as Record<string, string>;

export function getStaticPageHtml(route: string): string | undefined {
	const normalizedRoute = route === "" ? "/" : route;
	const shellPath = staticPageShells[normalizedRoute as keyof typeof staticPageShells];
	if (!shellPath) return undefined;
	return pageShells[shellPath];
}

export function normalizeStaticRoute(slug: string | undefined): string {
	if (!slug) return "/";
	const clean = slug.replace(/^\/+|\/+$/g, "");
	return clean ? `/${clean}/` : "/";
}
