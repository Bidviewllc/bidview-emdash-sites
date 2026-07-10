import type { RouteContent } from "./content-routes";
import { normalizeRoute } from "./content-routes";

const PLACEHOLDER = "<!--EMDASH_CONTENT-->";

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setAttr(tag: string, attr: string, value: string): string {
	const attrPattern = new RegExp(`${attr}\\s*=\\s*(['"])[\\s\\S]*?\\1`, "i");
	const next = `${attr}="${escapeHtml(value)}"`;
	if (attrPattern.test(tag)) return tag.replace(attrPattern, next);
	return tag.replace(/\s*\/?>$/, ` ${next}>`);
}

function upsertMeta(html: string, attr: "name" | "property", key: string, content: string): string {
	const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=['"]${escapeRegExp(key)}['"])[^>]*>`, "i");
	if (pattern.test(html)) return html.replace(pattern, (tag) => setAttr(tag, "content", content));
	return html.replace(/<\/head>/i, `\t<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}">\n</head>`);
}

function upsertCanonical(html: string, href: string): string {
	const pattern = /<link\b(?=[^>]*\brel=['"]canonical['"])[^>]*>/i;
	if (pattern.test(html)) return html.replace(pattern, (tag) => setAttr(tag, "href", href));
	return html.replace(/<\/head>/i, `\t<link rel="canonical" href="${escapeHtml(href)}">\n</head>`);
}

function replaceTitle(html: string, title: string): string {
	const next = `<title>${escapeHtml(title)}</title>`;
	if (/<title>[\s\S]*?<\/title>/i.test(html)) {
		return html.replace(/<title>[\s\S]*?<\/title>/i, next);
	}
	return html.replace(/<\/head>/i, `\t${next}\n</head>`);
}

function replaceSchema(html: string, schemaJson: string): string {
	if (!schemaJson.trim()) return html;
	const safeSchema = schemaJson.replace(/<\/script/gi, "<\\/script");
	const pattern = /(<script\b(?=[^>]*\bclass=['"][^'"]*rank-math-schema-pro[^'"]*['"])[^>]*>)[\s\S]*?(<\/script>)/i;
	if (pattern.test(html)) return html.replace(pattern, `$1${safeSchema}$2`);
	return html.replace(
		/<\/head>/i,
		`\t<script class="rank-math-schema-pro" type="application/ld+json">${safeSchema}</script>\n</head>`,
	);
}

function normalizeRouteHref(rawHref: string, currentRoute: string): string {
	if (!/index\.html/i.test(rawHref)) return rawHref;
	if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(rawHref)) return rawHref;
	try {
		const base = new URL(currentRoute, "http://local");
		const resolved = new URL(rawHref, base);
		let pathname = resolved.pathname.replace(/\/index\.html$/i, "/");
		if (pathname === "/index.html") pathname = "/";
		return `${pathname}${resolved.search}${resolved.hash}`;
	} catch {
		return rawHref;
	}
}

function normalizeInternalLinks(html: string, currentRoute: string): string {
	return html.replace(/\bhref=(['"])([^'"]*index\.html[^'"]*)\1/gi, (_match, quote: string, href: string) => {
		return `href=${quote}${escapeHtml(normalizeRouteHref(href, currentRoute))}${quote}`;
	});
}

// Seeded body_html is a static scrape of the old WordPress/Gravity Forms markup: the <form> tags
// still carry novalidate + onsubmit="return false" (leftover AJAX-postback wiring with no WP backend
// behind it), which disables both browser validation and submission entirely. Point them at the
// real Worker endpoint and let native validation run.
function fixGravityFormMarkup(html: string): string {
	html = html.replace(/<form\b([^>]*\bid=["']gform_\d+["'][^>]*)>/gi, (_match, attrs: string) => {
		const cleaned = attrs
			.replace(/\s*novalidate\s*=\s*["'][^"']*["']/i, "")
			.replace(/\s*onsubmit\s*=\s*["'][^"']*["']/i, "")
			.replace(/\s*action\s*=\s*["'][^"']*["']/i, "");
		return `<form${cleaned} action="/api/contact">`;
	});

	// Gravity Forms marks required fields with aria-required="true" only; add the native `required`
	// attribute so the browser actually blocks submission on empty/invalid fields.
	html = html.replace(
		/<(input|select|textarea)\b([^>]*?\baria-required=["']true["'][^>]*?)\s*(\/?)>/gi,
		(match, tagName: string, attrs: string, slash: string) => {
			if (/(?:^|\s)required(?=[\s>=]|$)/i.test(attrs)) return match;
			return `<${tagName}${attrs} required${slash ? " /" : ""}>`;
		},
	);

	return html;
}

function renderMarks(text: string, marks: unknown): string {
	if (!Array.isArray(marks) || marks.length === 0) return text;
	let output = text;
	for (const mark of marks) {
		if (mark === "strong") output = `<strong>${output}</strong>`;
		if (mark === "em") output = `<em>${output}</em>`;
		if (mark === "underline") output = `<u>${output}</u>`;
	}
	return output;
}

function blockText(block: any): string {
	return (block.children ?? [])
		.map((child: any) => renderMarks(escapeHtml(child.text ?? ""), child.marks))
		.join("");
}

export function portableTextToHtml(value: unknown): string {
	if (!Array.isArray(value)) return "";
	const html: string[] = [];
	let listOpen = false;
	for (const block of value) {
		if (!block || block._type !== "block") continue;
		const text = blockText(block);
		if (!text.trim()) continue;
		if (block.listItem) {
			if (!listOpen) {
				html.push("<ul>");
				listOpen = true;
			}
			html.push(`<li>${text}</li>`);
			continue;
		}
		if (listOpen) {
			html.push("</ul>");
			listOpen = false;
		}
		const style = String(block.style ?? "normal").toLowerCase();
		if (/^h[1-6]$/.test(style)) html.push(`<${style}>${text}</${style}>`);
		else html.push(`<p>${text}</p>`);
	}
	if (listOpen) html.push("</ul>");
	return html.join("\n");
}

function fallbackBody(data: Record<string, any>): string {
	const body = portableTextToHtml(data.content);
	return [
		'<main class="site-main astro-dynamic-content" id="content">',
		'<div class="astro-dynamic-content__inner">',
		data.title ? `<h1>${escapeHtml(data.title)}</h1>` : "",
		body,
		"</div>",
		"</main>",
	].join("\n");
}

function schemaToString(value: unknown): string {
	if (typeof value === "string") return value;
	if (value == null) return "";
	try {
		return JSON.stringify(value);
	} catch {
		return "";
	}
}

export function renderShell(shell: string, content: RouteContent, origin: string): string {
	const data = content.data;
	const route = normalizeRoute(data.route);
	const canonical = `${origin}${route}`;
	const title = data.meta_title || data.title || "Roberts Hearing Clinic";
	const description = data.meta_description || data.excerpt || "";
	const body = String(data.body_html ?? "").trim() || fallbackBody(data);

	let html = shell.includes(PLACEHOLDER) ? shell.replace(PLACEHOLDER, body) : `${shell}${body}`;
	html = replaceTitle(html, title);
	html = upsertCanonical(html, canonical);
	if (description) {
		html = upsertMeta(html, "name", "description", description);
		html = upsertMeta(html, "property", "og:description", description);
		html = upsertMeta(html, "name", "twitter:description", description);
	}
	html = upsertMeta(html, "property", "og:title", title);
	html = upsertMeta(html, "name", "twitter:title", title);
	html = upsertMeta(html, "property", "og:url", canonical);
	html = replaceSchema(html, schemaToString(data.schema_json));
	html = normalizeInternalLinks(html, route);
	html = fixGravityFormMarkup(html);
	return html;
}
