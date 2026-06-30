const htmlPages = import.meta.glob("../../local-copy/**/index.html", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

export interface StaticPage {
	route: string;
	headHtml: string;
	bodyClass: string;
	contentHtml: string;
}

export interface HeaderStaffItem {
	name?: string;
	route?: string;
	slug?: string | null;
}

export function normalizeRoute(route = "") {
	const clean = route.replace(/^\/+|\/+$/g, "");
	return clean ? `${clean}/` : "";
}

function htmlKeyFor(route = "") {
	const normalized = normalizeRoute(route);
	return normalized
		? `../../local-copy/${normalized}index.html`
		: "../../local-copy/index.html";
}

export function getStaticHtml(route = "") {
	return htmlPages[htmlKeyFor(route)] ?? null;
}

function extractFirst(html: string, pattern: RegExp) {
	return html.match(pattern)?.[1] ?? "";
}

function stripFirst(html: string, pattern: RegExp) {
	return html.replace(pattern, "");
}

function routeHref(route = "") {
	const normalized = normalizeRoute(route);
	return normalized ? `/${normalized}` : "/";
}

export function wireCanonicalHeadUrls(headHtml: string, route = "", origin: string) {
	const href = `${origin.replace(/\/+$/g, "")}${routeHref(route)}`;
	let html = headHtml;
	const canonicalTag = `<link rel="canonical" href="${escapeHtmlAttr(href)}">`;
	if (/<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
		html = html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i, canonicalTag);
	} else {
		html = html.replace(/<title>[\s\S]*?<\/title>/i, (title) => `${title}${canonicalTag}`);
	}

	const ogUrlTag = `<meta property="og:url" content="${escapeHtmlAttr(href)}" />`;
	if (/<meta\b[^>]*property=["']og:url["'][^>]*>/i.test(html)) {
		html = html.replace(/<meta\b[^>]*property=["']og:url["'][^>]*>/i, ogUrlTag);
	}
	return html;
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteLocalHref(value: string) {
	if (
		value.startsWith("/") ||
		value.startsWith("#") ||
		value.startsWith("http://") ||
		value.startsWith("https://") ||
		value.startsWith("mailto:") ||
		value.startsWith("tel:")
	) {
		return value;
	}

	const withoutTraversal = value.replace(/^(\.\.\/)+/, "");
	if (withoutTraversal === "index.html") return "/";
	if (withoutTraversal.startsWith("assets/")) return `/${withoutTraversal}`;

	return `/${withoutTraversal.replace(/index\.html$/, "")}`;
}

function rewriteSharedShellUrls(html: string) {
	return html
		.replace(/\b(href|src)="([^"]*)"/g, (_match, attr, value) => {
			return `${attr}="${rewriteLocalHref(value)}"`;
		})
		.replace(/(?:\.\.\/)*assets\//g, "/assets/");
}

function markCurrentNavItem(html: string, route = "") {
	const href = escapeRegExp(routeHref(route));
	const clean = html
		.replace(/\s(current-menu-item|current_page_item|current_page_parent|page_item|page-item-\d+)/g, "")
		.replace(/\sastro-item-active/g, "")
		.replace(/\saria-current="page"/g, "");

	return clean.replace(
		new RegExp(
			`(<li class=")([^"]*)(">\\s*<a href="${href}")([^>]*?class=")([^"]*)(")`,
			"g"
		),
		"$1$2 current-menu-item current_page_item$3 aria-current=\"page\"$4$5 astro-item-active$6"
	);
}

function getBodyInnerHtml(html: string) {
	const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
	return bodyMatch?.[1] ?? "";
}

export function getSharedHeaderHtml(route = "", staff: HeaderStaffItem[] = []) {
	const html = getStaticHtml("");
	if (!html) return "";

	const headerHtml = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? "";
	return markCurrentNavItem(wireHeaderStaffMenu(rewriteSharedShellUrls(headerHtml), staff), route);
}

export function getSharedFooterHtml() {
	const html = getStaticHtml("");
	if (!html) return "";

	const footerHtml = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? "";
	return rewriteSharedShellUrls(footerHtml);
}

export function getStaticPage(route = ""): StaticPage | null {
	const html = getStaticHtml(route);
	if (!html) return null;

	const headHtml = extractFirst(html, /<head\b[^>]*>([\s\S]*?)<\/head>/i);
	const bodyClass = extractFirst(html, /<body\b[^>]*class="([^"]*)"/i);
	let contentHtml = getBodyInnerHtml(html);

	contentHtml = stripFirst(
		contentHtml,
		/<a\b[^>]*class="skip-link screen-reader-text"[\s\S]*?<\/a>/i
	);
	contentHtml = stripFirst(contentHtml, /<header\b[\s\S]*?<\/header>/i);
	contentHtml = stripFirst(contentHtml, /<footer\b[\s\S]*?<\/footer>/i);

	return {
		route: normalizeRoute(route),
		headHtml,
		bodyClass,
		contentHtml: contentHtml.trim(),
	};
}

export function getStaffTemplatePage(route = ""): StaticPage | null {
	const page = getStaticPage("audiologist/dr-danielle-jenkins/");
	if (!page) return null;
	return {
		...page,
		route: normalizeRoute(route),
	};
}

function wireHeaderStaffMenu(html: string, staff: HeaderStaffItem[]) {
	const items = sortHeaderStaff(staff)
		.filter((item) => item.name)
		.map((item, index) => {
			const href = normalizeStaffHref(item);
			const id = 90000 + index;
			return `<li class="menu-item menu-item-type-post_type menu-item-object-audiologist menu-item-${id}"><a href="${escapeHtmlAttr(href)}" class="astro-sub-item">${escapeHtml(item.name ?? "")}</a></li>`;
		});

	if (items.length === 0) return html;

	const submenuHtml = `<ul class="sub-menu astro-nav-menu--dropdown">${items.join("")}</ul>`;

	return html.replace(
		/(<li\b[^>]*menu-item-74[^>]*>\s*<a\b[^>]*href="\/about\/"[^>]*>About<\/a>)<ul class="sub-menu astro-nav-menu--dropdown">[\s\S]*?<\/ul>(<\/li>)/g,
		`$1${submenuHtml}$2`,
	);
}

function sortHeaderStaff(staff: HeaderStaffItem[]) {
	const liveOrder = new Map([
		["dr. michelle miller", 0],
		["dr. katherine baker", 1],
		["dr. danielle jenkins", 2],
		["lisa rummel", 3],
		["sam edwards", 4],
	]);

	return staff.slice().sort((a, b) => {
		const aOrder = liveOrder.get(String(a.name ?? "").trim().toLowerCase());
		const bOrder = liveOrder.get(String(b.name ?? "").trim().toLowerCase());
		if (aOrder != null || bOrder != null) return (aOrder ?? 999) - (bOrder ?? 999);
		return String(a.name ?? "").localeCompare(String(b.name ?? ""));
	});
}

function normalizeStaffHref(item: HeaderStaffItem) {
	if (item.route) return rewriteLocalHref(item.route);
	const slug = normalizeRoute(item.slug ?? "");
	return slug ? `/audiologist/${slug}` : "#";
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function escapeHtmlAttr(value: string) {
	return escapeHtml(value).replace(/'/g, "&#39;");
}

export function staticHtmlResponse(route = "", init?: ResponseInit) {
	const html = getStaticHtml(route);
	if (!html) {
		return new Response("Not found", {
			status: 404,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	return new Response(html, {
		...init,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			...(init?.headers ?? {}),
		},
	});
}
