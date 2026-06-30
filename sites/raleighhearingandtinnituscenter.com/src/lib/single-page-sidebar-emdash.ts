import { getEmDashCollection, getEmDashEntry, type CacheHint, type PortableTextBlock } from "emdash";
import type { StaticPage } from "./static-html";

type CacheTarget = {
	set(cacheHint: CacheHint): void;
};

type SinglePageWithSidebar = {
	page_title?: string;
	brand_name?: string;
	post_title?: string;
	name?: string;
	job_title?: string;
	route?: string;
	meta_title?: string;
	meta_description?: string;
	body_content?: PortableTextBlock[] | string;
	bio?: PortableTextBlock[] | string;
	clinic_name?: PortableTextBlock[] | string;
	content_body?: PortableTextBlock[] | string;
	address?: string;
	address_url?: string;
	hours?: PortableTextBlock[] | string;
	phone_number?: PortableTextBlock[] | string;
	featured_image?: {
		id?: string;
		src?: string;
		alt?: string;
		provider?: string;
		meta?: {
			storageKey?: string;
		};
		asset?: {
			url?: string;
		};
	};
	section_featured_image?: SinglePageWithSidebar["featured_image"];
	category?: string;
};

type ContentEntry<T> = {
	id: string;
	slug: string | null;
	data: T;
};

type PortableTextMarkDef = {
	_key?: string;
	_type?: string;
	href?: string;
	blank?: boolean;
};

export async function wireSinglePageWithSidebar(page: StaticPage, cache: CacheTarget) {
	const slug = page.route.replace(/\/+$/g, "");
	if (!slug) return page;

	const staffSlug = slug.startsWith("audiologist/") ? slug.split("/").pop() : "";
	const contactEntry = await getEntry("contact_pages", slug, cache);
	if (contactEntry) {
		const officeInfo = await getFirstEntry("office_info_map_ctas", cache);
		return {
			...page,
			headHtml: wireHead(page.headHtml, contactEntry.data),
			contentHtml: wireContactContent(page.contentHtml, contactEntry.data, officeInfo?.data),
		};
	}
	const blogEntry = await getEntry("blogs", slug, cache);
	if (blogEntry) {
		return {
			...page,
			headHtml: wireHead(page.headHtml, blogEntry.data),
			contentHtml: wireContent(page.contentHtml, { ...blogEntry.data, page_title: blogEntry.data.post_title }),
		};
	}
	const sitemapEntry = await getEntry("sitemap_pages", slug, cache);
	if (sitemapEntry) {
		return {
			...page,
			headHtml: wireHead(page.headHtml, sitemapEntry.data),
			contentHtml: await wireSitemapContent(page.contentHtml, sitemapEntry.data, cache),
		};
	}
	const utilityEntry = await getEntry("utility_pages", slug, cache);
	if (utilityEntry) {
		return {
			...page,
			headHtml: wireHead(page.headHtml, utilityEntry.data),
			contentHtml: wireUtilityContent(page.contentHtml, utilityEntry.data),
		};
	}
	const entry = staffSlug
		? await getEntry("staff", staffSlug, cache)
		: await getEntry("hearing_aid_brands", slug, cache) ?? await getEntry("single_page_with_sidebar", slug, cache);
	if (!entry) return page;

	const data = entry.data;
	return {
		...page,
		headHtml: wireHead(page.headHtml, data),
		contentHtml: staffSlug ? wireStaffContent(page.contentHtml, data) : wireContent(page.contentHtml, data),
	};
}

async function getEntry(collection: "single_page_with_sidebar" | "hearing_aid_brands" | "staff" | "blogs" | "contact_pages" | "sitemap_pages" | "utility_pages", slug: string, cache: CacheTarget) {
	try {
		const result = await getEmDashEntry(collection as never, slug);
		cache.set(result.cacheHint);
		return result.entry as ContentEntry<SinglePageWithSidebar> | null;
	} catch {
		return null;
	}
}

async function getFirstEntry(collection: "office_info_map_ctas", cache: CacheTarget) {
	const result = await getEmDashCollection(collection as never, { limit: 1 });
	cache.set(result.cacheHint);
	return (result.entries?.[0] ?? null) as unknown as ContentEntry<SinglePageWithSidebar> | null;
}

function wireHead(headHtml: string, data: SinglePageWithSidebar) {
	let html = headHtml;
	if (data.meta_title) {
		html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(data.meta_title)}</title>`);
	}
	if (data.meta_description) {
		const metaTag = `<meta name="description" content="${escapeAttr(data.meta_description)}" />`;
		if (/<meta\s+name="description"[^>]*>/i.test(html)) {
			html = html.replace(/<meta\s+name="description"[^>]*>/i, metaTag);
		} else {
			html = html.replace(/<title>[\s\S]*?<\/title>/i, (titleTag) => `${titleTag}\n${metaTag}`);
		}
	}
	return html;
}

function wireContactContent(contentHtml: string, data: SinglePageWithSidebar, officeInfo?: SinglePageWithSidebar) {
	let html = contentHtml;
	if (data.page_title) html = replaceFirstHeading(html, data.page_title);
	if (officeInfo) {
		const mapLabel = [portableTextPlain(officeInfo.clinic_name), officeInfo.address].filter(Boolean).join(", ");
		html = replaceElementByDataId(html, "a3b8bf1", (section) => {
			let next = section;
			next = replaceWidgetHtmlById(next, "276f04a", `<h3 class="astro-heading-title astro-size-default">${portableTextInline(officeInfo.clinic_name)}</h3>`);
			next = replaceWidgetHtmlById(next, "5091d39", portableTextHtml(officeInfo.content_body));
			next = replaceWidgetHtmlById(next, "9711e00", `<h3 class="astro-heading-title astro-size-default"><a href="${escapeAttr(String(officeInfo.address_url ?? "#"))}" target="_blank" rel="noopener">${escapeHtml(String(officeInfo.address ?? ""))}</a></h3>`);
			next = replaceWidgetHtmlById(next, "613c815", `<h3 class="astro-heading-title astro-size-default">${officePhoneHtml(portableTextInline(officeInfo.phone_number))}</h3>`);
			next = replaceOfficeHours(next, normalizePortableText(officeInfo.hours));
			next = replaceIframeSrc(next, "c518cd8", googleMapEmbedUrl(mapLabel), mapLabel);
			return next;
		});
	}
	html = replaceBackgroundImageById(html, "a067c93", imageWithFallback(data.section_featured_image, "/assets/media/Lisa-Checking-In-a-Patient-DSC06331-bbe3bba898.jpg", "Lisa checking in a patient at Raleigh Hearing and Tinnitus Center"));
	html = wireContactForm(html);
	return html;
}

function wireContent(contentHtml: string, data: SinglePageWithSidebar) {
	let html = contentHtml;
	const title = data.page_title ?? data.brand_name;
	if (title) {
		html = hasHeroHeading(html) ? replaceFirstHeading(html, title) : addInternalHero(html, title);
	}
	const bodyBlocks = normalizePortableText(data.body_content);
	if (bodyBlocks.length) {
		html = replaceBodyRegion(html, renderBodyContent(bodyBlocks));
	}
	html = normalizeSidebarPhoneCta(html);
	html = ensureInternalAccordionScript(html);
	return html;
}

async function wireSitemapContent(contentHtml: string, data: SinglePageWithSidebar, cache: CacheTarget) {
	let html = contentHtml;
	if (data.page_title) html = replaceFirstHeading(html, data.page_title);
	html = replaceWidgetHtmlByType(html, "theme-post-content.default", await renderDynamicSitemap(cache));
	return html;
}

function wireUtilityContent(contentHtml: string, data: SinglePageWithSidebar) {
	let html = contentHtml;
	if (data.page_title) html = replaceFirstHeading(html, data.page_title);
	const bodyHtml = renderBlocks(normalizePortableText(data.body_content));
	const replaced = replaceWidgetHtmlByType(html, "theme-post-content.default", bodyHtml);
	html = replaced === html ? replaceWidgetHtmlByType(html, "text-editor.default", bodyHtml) : replaced;
	return html;
}

function wireStaffContent(contentHtml: string, data: SinglePageWithSidebar) {
	let html = contentHtml;
	if (data.name) {
		html = replaceFirstHeading(html, data.name);
	}
	if (data.job_title) {
		html = replaceWidgetHtmlById(html, "1959828", `<p class="astro-heading-title astro-size-default">${escapeHtml(data.job_title)}</p>`);
	}
	html = replaceWidgetHtmlByType(html, "theme-post-content.default", renderBlocks(normalizePortableText(data.bio)));
	if (data.featured_image) {
		html = replaceImageById(html, "2d69973", data.featured_image);
	} else {
		html = clearImageById(html, "2d69973");
	}
	return html;
}

function wireContactForm(html: string) {
	let next = html;
	next = next.replace(/(<form\b[^>]*id="gform_2"[^>]*?)\saction="[^"]*"/i, `$1 action="/api/contact"`);
	next = next.replace(/(<form\b[^>]*id="gform_2"[^>]*?)\sonsubmit="[^"]*"/i, "$1");
	next = next.replace(/(<form\b[^>]*id="gform_2"[^>]*)(>)/i, (_match, open, close) => {
		let updated = open as string;
		if (!/\sdata-local-contact-form\b/i.test(updated)) updated += ` data-local-contact-form`;
		if (!/\saria-describedby=/i.test(updated)) updated += ` aria-describedby="local-contact-form-status"`;
		return `${updated}${close}`;
	});
	next = next.replace(/(<input\b[^>]*id="gform_submit_button_2"[^>]*?)\sonclick="[^"]*"/i, "$1");
	next = replaceTagById(next, "input", "input_2_3", (tag) => ensureBooleanAttr(setAttr(tag, "name", "name"), "required"));
	next = replaceTagById(next, "input", "input_2_5", (tag) => ensureBooleanAttr(setAttr(tag, "name", "email"), "required"));
	next = replaceTagById(next, "input", "input_2_11", (tag) => ensureBooleanAttr(setAttr(tag, "name", "phone"), "required"));
	next = replaceTagById(next, "textarea", "input_2_14", (tag) => ensureBooleanAttr(setAttr(tag, "name", "message"), "required"));
	next = replaceTagById(next, "input", "input_2_16", (tag) => setAttr(tag, "name", "honeypot"));
	next = next.replace(/(<div class="gform-footer gform_footer top_label">)/i, `$1<div id="local-contact-form-status" class="local-contact-form-status" role="status" aria-live="polite"></div>`);
	return ensureContactFormScript(next);
}

function replaceTagById(html: string, tagName: string, id: string, update: (tag: string) => string) {
	return html.replace(new RegExp(`<${tagName}\\b[^>]*\\sid=["']${escapeRegExp(id)}["'][^>]*>`, "i"), update);
}

function ensureBooleanAttr(tag: string, attribute: string) {
	if (new RegExp(`\\s${escapeRegExp(attribute)}(?:\\s|=|>|/)`, "i").test(tag)) return tag;
	return tag.replace(/\s*\/?>$/, (close) => ` ${attribute}${close}`);
}

function ensureContactFormScript(html: string) {
	if (html.includes("local-contact-form-script")) return html;
	return `${html}<script id="local-contact-form-script">
(() => {
	const form = document.querySelector("[data-local-contact-form]");
	if (!form || form.dataset.localContactReady) return;
	form.dataset.localContactReady = "true";

	const status = form.querySelector("#local-contact-form-status");
	const button = form.querySelector("#gform_submit_button_2");
	const buttonLabel = button ? button.value : "";

	function setStatus(message, tone) {
		if (!status) return;
		status.textContent = message || "";
		status.dataset.tone = tone || "";
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		setStatus("", "");
		if (!form.reportValidity()) return;

		const formData = new FormData(form);
		if ((formData.get("honeypot") || "").toString().trim()) {
			form.reset();
			setStatus("Thank you. Your message has been sent.", "success");
			return;
		}

		if (button) {
			button.disabled = true;
			button.value = "Sending...";
		}

		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formData.get("name"),
					email: formData.get("email"),
					phone: formData.get("phone"),
					message: formData.get("message"),
					honeypot: formData.get("honeypot"),
				}),
			});
			const result = await response.json().catch(() => ({ ok: false }));
			if (!response.ok || !result.ok) {
				throw new Error(result.error || "We couldn't send your message right now. Please try again or call (919) 505-0894.");
			}
			form.reset();
			setStatus("Thank you. Your message has been sent.", "success");
		} catch (error) {
			setStatus(error && error.message ? error.message : "We couldn't send your message right now. Please try again or call (919) 505-0894.", "error");
		} finally {
			if (button) {
				button.disabled = false;
				button.value = buttonLabel || "Submit";
			}
		}
	});
})();
</script>`;
}

function hasHeroHeading(html: string) {
	const headingIndex = html.search(/<h1\b/i);
	if (headingIndex < 0) return false;
	const tocOpen = findWidgetOpening(html, "table-of-contents");
	return tocOpen < 0 || headingIndex < tocOpen;
}

function replaceFirstHeading(html: string, value: string) {
	return html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${escapeHtml(value)}$2`);
}

function addInternalHero(html: string, title: string) {
	const hero = `<div class="astro-element astro-element-1d9010e1 local-internal-hero e-flex e-con-boxed e-con e-parent" data-id="1d9010e1" data-element_type="container" data-e-type="container" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}"><div class="e-con-inner"><div class="astro-element astro-element-5704bda9 astro-widget astro-widget-breadcrumbs" data-id="5704bda9" data-element_type="widget" data-e-type="widget" data-widget_type="breadcrumbs.default"><div class="astro-widget-container"><nav aria-label="breadcrumbs" class="rank-math-breadcrumb"><p><a href="/">Home</a><span class="separator"> &gt; </span><span class="last">${escapeHtml(title)}</span></p></nav></div></div><div class="astro-element astro-element-7a4fb2f5 astro-widget astro-widget-theme-post-title astro-page-title astro-widget-heading" data-id="7a4fb2f5" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default"><div class="astro-widget-container"><h1 class="astro-heading-title astro-size-default">${escapeHtml(title)}</h1></div></div></div></div>`;
	return `${hero}${html}`;
}

function ensureInternalAccordionScript(html: string) {
	if (html.includes("local-single-sidebar-accordion-script")) return html;
	return `${html}<script id="local-single-sidebar-accordion-script">
(() => {
	function setOpen(item, open) {
		item.classList.toggle("is-open", open);
		const button = item.querySelector(".local-single-sidebar-accordion-summary");
		if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
	}
	function init(root) {
		const items = [...root.querySelectorAll(".local-single-sidebar-accordion-item")];
		if (!items.length) return;
		items.forEach((item) => {
			const button = item.querySelector(".local-single-sidebar-accordion-summary");
			if (!button || button.dataset.localAccordionReady) return;
			button.dataset.localAccordionReady = "true";
			button.addEventListener("click", () => {
				const shouldOpen = !item.classList.contains("is-open");
				items.forEach((candidate) => setOpen(candidate, shouldOpen && candidate === item));
			});
		});
	}
	document.querySelectorAll(".local-single-sidebar-accordion").forEach(init);
})();
</script>`;
}

function replaceBodyRegion(html: string, bodyHtml: string) {
	const tocOpen = findWidgetOpening(html, "table-of-contents");
	if (tocOpen < 0) return html;
	const tocEnd = findMatchingDivEnd(html, tocOpen);
	if (tocEnd < 0) return html;

	const sidebarStart = findSidebarStart(html, tocEnd);
	if (sidebarStart < 0) return html;
	const contentEnd = findContentColumnCloseStart(html, tocEnd, sidebarStart);

	return `${html.slice(0, tocEnd)}<div class="local-single-sidebar-content">${bodyHtml}</div>${html.slice(contentEnd)}`;
}

function normalizeSidebarPhoneCta(html: string) {
	const phoneLabel = "(919) 505-0894";
	const phoneHref = "tel:919-505-0894";
	const ctaHtml = `<p class="astro-heading-title astro-size-default"><a href="${phoneHref}">Or give us a call at: ${phoneLabel}</a></p>`;
	return html.replace(
		/(<div\b[^>]*data-widget_type="heading\.default"[^>]*>\s*<div class="astro-widget-container">)\s*<p class="astro-heading-title astro-size-default">(?:<a\b[^>]*>)?Or give us a call at:\s*(?:\(?\d{3}\)?[\s.-]*)?\d{3}[\s.-]*\d{4}(?:<\/a>)?<\/p>\s*(<\/div>\s*<\/div>)/gi,
		`$1${ctaHtml}$2`,
	);
}

function findSidebarStart(html: string, contentStart: number) {
	const sidebarMarker = ["Are you ready to hear and be heard?", "Or give us a call at:", "Recent News"]
		.map((needle) => html.indexOf(needle, contentStart))
		.filter((index) => index >= 0)
		.sort((a, b) => a - b)[0];
	if (sidebarMarker === undefined) return -1;

	const starts: number[] = [];
	const divRe = /<div\b[^>]*>/gi;
	let match: RegExpExecArray | null;
	while ((match = divRe.exec(html)) && match.index < sidebarMarker) {
		if (match.index <= contentStart) continue;
		const end = findMatchingDivEnd(html, match.index);
		if (end > sidebarMarker) starts.push(match.index);
	}
	return starts[0] ?? -1;
}

function findContentColumnCloseStart(html: string, contentStart: number, sidebarStart: number) {
	const closeStart = html.lastIndexOf("</div>", sidebarStart);
	if (closeStart > contentStart) return closeStart;
	return sidebarStart;
}

function findWidgetOpening(html: string, widgetType: string) {
	const attrIndex = html.search(new RegExp(`data-widget_type=["']${escapeRegExp(widgetType)}\\.default["']`, "i"));
	if (attrIndex < 0) return -1;
	return html.lastIndexOf("<div", attrIndex);
}

function replaceWidgetHtmlById(html: string, dataId: string, innerHtml: string) {
	const widget = findElementByDataId(html, dataId);
	if (!widget) return html;
	return replaceWidgetContainer(html, widget, innerHtml);
}

function replaceWidgetHtmlByType(html: string, widgetType: string, innerHtml: string) {
	const widget = findElementByWidgetType(html, widgetType);
	if (!widget) return html;
	return replaceWidgetContainer(html, widget, innerHtml);
}

function replaceOfficeHours(html: string, hours: PortableTextBlock[]) {
	const hourLines = hours
		.map((block) => block._type === "block" ? portableTextBlockInline(block) : "")
		.filter((line) => line.trim());
	if (!hourLines.length) return html;
	const [mondayThursday = "", friday = "", weekend = ""] = hourLines;

	return replaceElementByDataId(html, "ddbbf91", (section) => {
		let next = section;
		next = replaceWidgetHtmlById(next, "81e5ee9", mondayThursday ? `<h3 class="astro-heading-title astro-size-default">${officeHourHtml(mondayThursday)}</h3>` : "");
		next = replaceWidgetHtmlById(next, "5653119", friday ? `<p class="astro-heading-title astro-size-default">${officeHourHtml(friday)}</p>` : "");
		next = replaceWidgetHtmlById(next, "29f417f", weekend ? `<p class="astro-heading-title astro-size-default">${officeHourHtml(weekend)}</p>` : "");
		return next;
	});
}

function officeHourHtml(line: string) {
	if (/<(?:br|b|strong|em|i)\b/i.test(line)) return line;
	const match = line.match(/^(Monday-Thursday|Friday)\s+(.+)$/i);
	if (match) return `<b>${escapeHtml(match[1] ?? "")} </b><br> ${escapeHtml(match[2] ?? "")}`;
	return line;
}

function officePhoneHtml(html: string) {
	const normalized = html.replace(/\bCall\s+:/i, "Call:");
	if (/<a\b/i.test(normalized)) return normalized;
	const numberMatch = normalized.match(/(?:\+?1[\s.-]*)?\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})/);
	if (!numberMatch) return normalized;
	const tel = `${numberMatch[1]}-${numberMatch[2]}-${numberMatch[3]}`;
	const display = normalized.replace(numberMatch[0], `<u>${tel}</u>`);
	return `<a href="tel:${tel}">${display}</a>`;
}

function replaceElementByDataId(html: string, dataId: string, replacement: (element: string) => string) {
	const element = findElementByDataId(html, dataId);
	if (!element) return html;
	return `${html.slice(0, element.start)}${replacement(element.html)}${html.slice(element.end)}`;
}

function replaceWidgetContainer(html: string, widget: HtmlElement, innerHtml: string) {
	const containerMatch = /<div class="astro-widget-container">/i.exec(widget.html);
	if (!containerMatch) return html;
	const containerStart = widget.start + containerMatch.index;
	const containerOpenEnd = containerStart + containerMatch[0].length;
	const containerEnd = findMatchingDivEnd(html, containerStart);
	if (containerEnd < containerOpenEnd) return html;
	return `${html.slice(0, containerOpenEnd)}${innerHtml}${html.slice(containerEnd - "</div>".length)}`;
}

function replaceImageById(html: string, dataId: string, image: NonNullable<SinglePageWithSidebar["featured_image"]>) {
	const widget = findElementByDataId(html, dataId);
	const src = image.asset?.url ?? image.src ?? (image.meta?.storageKey ? `/_emdash/api/media/file/${image.meta.storageKey}` : "");
	if (!widget || !src) return html;
	const alt = image.alt ?? "";
	return html.slice(0, widget.start) + widget.html.replace(/<img\b[^>]*>/i, (tag) => {
		let next = tag
			.replace(/\ssrc="[^"]*"/i, ` src="${escapeAttr(src)}"`)
			.replace(/\salt="[^"]*"/i, ` alt="${escapeAttr(alt)}"`)
			.replace(/\ssrcset="[^"]*"/i, "")
			.replace(/\ssizes="[^"]*"/i, "");
		if (!/\ssrc="/i.test(next)) next = next.replace(/<img/i, `<img src="${escapeAttr(src)}"`);
		if (!/\salt="/i.test(next)) next = next.replace(/<img/i, `<img alt="${escapeAttr(alt)}"`);
		return next;
	}) + html.slice(widget.end);
}

function clearImageById(html: string, dataId: string) {
	const widget = findElementByDataId(html, dataId);
	if (!widget) return html;
	return html.slice(0, widget.start) + widget.html.replace(/<img\b[^>]*>/i, "") + html.slice(widget.end);
}

function replaceBackgroundImageById(html: string, dataId: string, image: NonNullable<SinglePageWithSidebar["featured_image"]>) {
	const src = image.asset?.url ?? image.src ?? (image.meta?.storageKey ? `/_emdash/api/media/file/${image.meta.storageKey}` : "");
	if (!src) return html;
	const style = `background-image:url('${escapeAttr(src)}') !important;background-position:center center !important;background-repeat:no-repeat !important;background-size:cover !important`;
	return replaceElementByDataId(html, dataId, (element) => {
		if (/\sstyle="/i.test(element)) return element.replace(/\sstyle="[^"]*"/i, ` style="${style}"`);
		return element.replace(/(<div\b[^>]*)(>)/i, `$1 style="${style}"$2`);
	});
}

function replaceIframeSrc(html: string, widgetDataId: string, src: string, title?: string) {
	return replaceElementByDataId(html, widgetDataId, (widget) => widget.replace(/<iframe\b[^>]*><\/iframe>/i, (iframe) => {
		let next = setAttr(iframe, "src", src);
		if (title) {
			next = setAttr(next, "title", title);
			next = setAttr(next, "aria-label", title);
		}
		return next;
	}));
}

function setAttr(tag: string, attr: string, value: string) {
	const escaped = escapeAttr(value);
	const pattern = new RegExp(`\\s${attr}="[^"]*"`, "i");
	if (pattern.test(tag)) return tag.replace(pattern, ` ${attr}="${escaped}"`);
	return tag.replace(/\/?>$/, ` ${attr}="${escaped}"$&`);
}

type HtmlElement = {
	start: number;
	end: number;
	openEnd: number;
	html: string;
};

function findElementByDataId(html: string, dataId: string, fromIndex = 0): HtmlElement | null {
	const dataIndex = html.indexOf(`data-id="${dataId}"`, fromIndex);
	if (dataIndex < 0) return null;
	const start = html.lastIndexOf("<div", dataIndex);
	if (start < 0) return null;
	const end = findMatchingDivEnd(html, start);
	if (end < 0) return null;
	const openEnd = html.indexOf(">", start) + 1;
	return { start, end, openEnd, html: html.slice(start, end) };
}

function findElementByWidgetType(html: string, widgetType: string): HtmlElement | null {
	const attrIndex = html.indexOf(`data-widget_type="${widgetType}"`);
	if (attrIndex < 0) return null;
	const start = html.lastIndexOf("<div", attrIndex);
	if (start < 0) return null;
	const end = findMatchingDivEnd(html, start);
	if (end < 0) return null;
	const openEnd = html.indexOf(">", start) + 1;
	return { start, end, openEnd, html: html.slice(start, end) };
}

function findMatchingDivEnd(html: string, startIndex: number) {
	const tagRe = /<\/?div\b[^>]*>/gi;
	tagRe.lastIndex = startIndex;
	let depth = 0;
	let match: RegExpExecArray | null;
	while ((match = tagRe.exec(html))) {
		if (match[0][1] === "/") {
			depth -= 1;
			if (depth === 0) return tagRe.lastIndex;
		} else {
			depth += 1;
		}
	}
	return -1;
}

function renderBodyContent(blocks: PortableTextBlock[]) {
	return renderH2Sections(blocks).join("");
}

function normalizePortableText(value?: PortableTextBlock[] | string) {
	if (Array.isArray(value)) return value;
	if (typeof value === "string") return markdownToPortableText(value);
	return [];
}

function markdownToPortableText(markdown: string) {
	const blocks: PortableTextBlock[] = [];
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	let paragraph: string[] = [];

	const flushParagraph = () => {
		const text = paragraph.join(" ").trim();
		if (text) blocks.push(textBlock(text, "normal"));
		paragraph = [];
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			flushParagraph();
			continue;
		}
		const heading = /^(#{2,4})\s+(.+)$/.exec(trimmed);
		if (heading) {
			flushParagraph();
			blocks.push(textBlock(heading[2] ?? "", `h${heading[1]!.length}`));
			continue;
		}
		const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
		if (bullet) {
			flushParagraph();
			blocks.push(textBlock(bullet[1] ?? "", "normal", "bullet"));
			continue;
		}
		paragraph.push(trimmed);
	}
	flushParagraph();
	return blocks;
}

function textBlock(text: string, style = "normal", listItem?: "bullet") {
	const { children, markDefs } = markdownInlineToPortableText(text);
	return {
		_type: "block",
		style,
		children,
		markDefs,
		...(listItem ? { listItem, level: 1 } : {}),
	} as unknown as PortableTextBlock;
}

function markdownInlineToPortableText(value: string) {
	const children: Array<{ _type: "span"; text: string; marks: string[] }> = [];
	const markDefs: PortableTextMarkDef[] = [];
	const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([\s\S]+?)\*\*|_([^_]+)_)/g;
	let lastIndex = 0;
	let linkIndex = 0;
	let match: RegExpExecArray | null;

	const pushText = (text: string, marks: string[] = []) => {
		if (!text) return;
		children.push({ _type: "span", text, marks });
	};

	while ((match = pattern.exec(value))) {
		pushText(value.slice(lastIndex, match.index));
		if (match[2] && match[3]) {
			const key = `link-${linkIndex++}`;
			markDefs.push({ _key: key, _type: "link", href: match[3], blank: /^https?:\/\//i.test(match[3]) });
			pushText(match[2], [key]);
		} else if (match[4]) {
			pushText(match[4], ["strong"]);
		} else if (match[5]) {
			pushText(match[5], ["em"]);
		}
		lastIndex = pattern.lastIndex;
	}
	pushText(value.slice(lastIndex));

	return {
		children: children.length ? children : [{ _type: "span" as const, text: value, marks: [] }],
		markDefs,
	};
}

function renderH2Sections(blocks: PortableTextBlock[]) {
	const output: string[] = [];
	let current: PortableTextBlock[] = [];

	for (const block of blocks) {
		if (isHeading(block, "h2") && current.length) {
			output.push(renderH2Section(current));
			current = [block];
		} else {
			current.push(block);
		}
	}
	if (current.length) output.push(renderH2Section(current));
	return output;
}

function renderH2Section(blocks: PortableTextBlock[]) {
	const h3Groups = splitByHeading(blocks, "h3");
	if (h3Groups.length === 0) return renderBlocks(blocks);

	const leading = blocks.slice(0, blocks.indexOf(h3Groups[0][0]));
	const h3GroupsWithH4 = h3Groups.filter((group) => splitByHeading(group, "h4").length > 0);
	let html = renderBlocks(leading);

	if (h3Groups.length >= 2 && h3GroupsWithH4.length < h3Groups.length) {
		return `${html}${renderAccordion(h3Groups, "h3")}`;
	}

	for (const group of h3Groups) {
		html += renderH3Section(group);
	}
	return html;
}

function renderH3Section(blocks: PortableTextBlock[]) {
	const h4Groups = splitByHeading(blocks, "h4");
	if (h4Groups.length === 0) return renderBlocks(blocks);

	const leading = blocks.slice(0, blocks.indexOf(h4Groups[0][0]));
	return `${renderBlocks(leading)}${renderAccordion(h4Groups, "h4")}`;
}

function splitByHeading(blocks: PortableTextBlock[], style: "h3" | "h4") {
	const groups: PortableTextBlock[][] = [];
	let current: PortableTextBlock[] = [];
	for (const block of blocks) {
		if (isHeading(block, style)) {
			if (current.length) groups.push(current);
			current = [block];
		} else if (current.length) {
			current.push(block);
		}
	}
	if (current.length) groups.push(current);
	return groups;
}

function renderAccordion(groups: PortableTextBlock[][], headingStyle: "h3" | "h4") {
	const items = groups
		.map((group) => {
			const heading = group[0];
			const body = group.slice(1);
			const tag = headingStyle;
			const headingId = `local-accordion-${Math.random().toString(36).slice(2)}`;
			const openClass = "";
			const expanded = "false";
			const bodyHtml = headingStyle === "h3" ? renderH3SectionBody(body) : renderBlocks(body);
			return `<div class="local-single-sidebar-accordion-item${openClass}"><button class="local-single-sidebar-accordion-summary" type="button" aria-expanded="${expanded}" aria-labelledby="${headingId}"><${tag} id="${headingId}">${portableTextBlockInline(heading)}</${tag}></button><div class="local-single-sidebar-accordion-panel"><div class="local-single-sidebar-accordion-panel-inner">${bodyHtml}</div></div></div>`;
		})
		.join("");
	return `<div class="local-single-sidebar-accordion">${items}</div>`;
}

function renderH3SectionBody(blocks: PortableTextBlock[]) {
	return renderBlocks(blocks);
}

function renderBlocks(blocks: PortableTextBlock[]) {
	let html = "";
	let list: { type: string; items: string[] } | null = null;

	const flushList = () => {
		if (!list) return;
		const tag = list.type === "number" ? "ol" : "ul";
		html += `<${tag}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${tag}>`;
		list = null;
	};

	for (const block of blocks) {
		if (block._type === "image") {
			flushList();
			const image = block as PortableTextBlock & {
				src?: string;
				alt?: string;
				asset?: {
					url?: string;
				};
			};
			const src = image.asset?.url ?? image.src;
			if (src) {
				html += `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(image.alt ?? "")}" loading="lazy"></figure>`;
			}
			continue;
		}
		if (block._type !== "block") continue;
		const listItem = "listItem" in block ? block.listItem : null;
		if (listItem) {
			const type = listItem === "number" ? "number" : "bullet";
			if (!list || list.type !== type) {
				flushList();
				list = { type, items: [] };
			}
			list.items.push(portableTextBlockInline(block));
			continue;
		}
		flushList();
		const style = "style" in block ? block.style : "normal";
		const inline = portableTextBlockInline(block);
		if (!inline.trim()) continue;
		if (["h2", "h3", "h4", "h5", "h6"].includes(String(style))) {
			html += `<${style}>${inline}</${style}>`;
		} else {
			html += `<p>${inline}</p>`;
		}
	}
	flushList();
	return html;
}

function isHeading(block: PortableTextBlock, style: string) {
	return block._type === "block" && "style" in block && block.style === style;
}

function portableTextBlockInline(block: PortableTextBlock) {
	if (block._type !== "block") return "";
	const markDefs = (("markDefs" in block ? block.markDefs : []) ?? []) as PortableTextMarkDef[];
	const children = ("children" in block && Array.isArray(block.children))
		? (block.children as Array<{ text?: string; marks?: string[] }>)
		: [];
	return (
		children
			.map((child) => {
				const text = escapeHtml(child.text ?? "");
				if (!text) return "";
				const marks = ("marks" in child ? child.marks : []) ?? [];
				return applyPortableTextMarks(text, marks as string[], markDefs);
			})
			.join("")
	);
}

function portableTextHtml(blocks?: PortableTextBlock[] | string) {
	return normalizePortableText(blocks)
		.map((block) => block._type === "block" ? `<p>${portableTextBlockInline(block)}</p>` : "")
		.filter(Boolean)
		.join("");
}

function portableTextInline(blocks?: PortableTextBlock[] | string) {
	return normalizePortableText(blocks)
		.map((block) => block._type === "block" ? portableTextBlockInline(block) : "")
		.filter(Boolean)
		.join("<br>");
}

function portableTextPlain(blocks?: PortableTextBlock[] | string) {
	return normalizePortableText(blocks)
		.map((block) => {
			if (block._type !== "block") return "";
			const children = ("children" in block && Array.isArray(block.children))
				? (block.children as Array<{ text?: string }>)
				: [];
			return children.map((child) => child.text ?? "").join("");
		})
		.filter(Boolean)
		.join(" ");
}

function imageWithFallback(image: SinglePageWithSidebar["featured_image"], src: string, alt: string) {
	if (image?.asset?.url || image?.src || image?.meta?.storageKey) return image;
	return { ...(image ?? {}), src, alt: image?.alt || alt };
}

function googleMapEmbedUrl(address: string) {
	const query = encodeURIComponent(address || "Raleigh Hearing and Tinnitus Center");
	return `https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near`;
}

async function renderDynamicSitemap(cache: CacheTarget) {
	const [singlePages, brands, blogs, staff, utility] = await Promise.all([
		getCollectionEntries("single_page_with_sidebar", cache),
		getCollectionEntries("hearing_aid_brands", cache),
		getCollectionEntries("blogs", cache),
		getCollectionEntries("staff", cache),
		getCollectionEntries("utility_pages", cache),
	]);
	const items = [
		{ title: "Home", href: "/" },
		...singlePages.map((entry) => ({ title: entry.data.page_title ?? entry.id, href: `/${entry.id}/` })),
		...brands.map((entry) => ({ title: entry.data.brand_name ?? entry.id, href: `/${entry.id}/` })),
		...blogs.map((entry) => ({ title: entry.data.post_title ?? entry.id, href: `/${entry.id}/` })),
		...staff.map((entry) => ({ title: entry.data.name ?? entry.id, href: `/audiologist/${entry.id}/` })),
		...utility.map((entry) => ({ title: entry.data.page_title ?? entry.id, href: `/${entry.id}/` })),
		{ title: "Contact Us", href: "/contact-us/" },
		{ title: "Blog", href: "/blog/" },
		{ title: "Sitemap", href: "/sitemap/" },
	];
	return `<h2>Pages</h2><ul>${items.map((item) => `<li><a href="${escapeAttr(item.href)}">${escapeHtml(item.title)}</a></li>`).join("")}</ul>`;
}

async function getCollectionEntries(collection: string, cache: CacheTarget) {
	const result = await getEmDashCollection(collection as never, { limit: 100 });
	cache.set(result.cacheHint);
	return (result.entries ?? []) as unknown as ContentEntry<SinglePageWithSidebar>[];
}

function applyPortableTextMarks(html: string, marks: string[], markDefs: PortableTextMarkDef[]) {
	return marks.reduce((next, mark) => {
		if (mark === "strong") return `<strong>${next}</strong>`;
		if (mark === "em") return `<em>${next}</em>`;
		if (mark === "code") return `<code>${next}</code>`;
		if (mark === "underline") return `<u>${next}</u>`;
		if (mark === "strike-through") return `<s>${next}</s>`;
		const def = markDefs.find((item) => item._key === mark);
		if (def?._type === "link" && def.href) {
			const target = def.blank ? ` target="_blank" rel="noopener"` : "";
			return `<a href="${escapeAttr(def.href)}"${target}>${next}</a>`;
		}
		return next;
	}, html);
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
	return escapeHtml(value).replace(/'/g, "&#39;");
}
