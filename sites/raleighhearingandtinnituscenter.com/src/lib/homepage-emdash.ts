import { getEmDashCollection, type CacheHint, type PortableTextBlock } from "emdash";

type CacheTarget = {
	set(cacheHint: CacheHint): void;
};

type ImageValue = {
	id?: string;
	src?: string;
	alt?: string;
	filename?: string;
	mimeType?: string;
	provider?: string;
	meta?: {
		storageKey?: string;
		[key: string]: unknown;
	};
};

type RepeaterItem = Record<string, unknown>;

type ContentEntry<T> = {
	id: string;
	slug: string | null;
	data: T;
};

type OfficeInfoMapCta = {
	clinic_name?: PortableTextBlock[];
	content_body?: PortableTextBlock[];
	address?: string;
	address_url?: string;
	hours?: PortableTextBlock[];
	phone_number?: PortableTextBlock[];
};

type Staff = {
	cmsSlug?: string;
	name?: string;
	route?: string;
	job_title?: string;
	featured_image?: ImageValue;
};

type AudiologyServicesSection = {
	h2_section_title?: string;
	content_body?: PortableTextBlock[];
	section_featured_image?: ImageValue;
	service_cards?: RepeaterItem[];
};

type TinnitusCta = {
	h2_section_title?: string;
	content_body?: PortableTextBlock[];
	section_featured_image?: ImageValue;
	accordion_items?: RepeaterItem[];
};

type HearingAidsSection = {
	h2_section_title?: string;
	section_subheading?: string;
	service_cards?: RepeaterItem[];
};

type HearingAidServicesSection = {
	section_featured_image?: ImageValue;
	h2_section_title?: string;
	content_body?: PortableTextBlock[];
	learn_more_url?: string;
	accordion_items?: RepeaterItem[];
};

type Homepage = {
	page_title?: string;
	route?: string;
	meta_title?: string;
	meta_description?: string;
	hero_title?: string;
	hero_subtext?: string;
	schedule_appointment_url?: string;
	cta_text?: PortableTextBlock[];
	trust_badge_1?: ImageValue;
	trust_badge_2?: ImageValue;
	trust_badge_3?: ImageValue;
	trust_badge_4?: ImageValue;
	trust_badge_5?: ImageValue;
	trust_badge_6?: ImageValue;
	trust_badge_7?: ImageValue;
	trust_badge_8?: ImageValue;
	about_featured_image?: ImageValue;
	about_h1_section_title?: string;
	about_h2_section_title?: string;
	about_content_body?: PortableTextBlock[];
	about_us_url?: string;
	testimonials_subheading?: string;
	testimonials_h2_section_title?: string;
	faq_h2_section_title?: string;
	faq_body_content?: PortableTextBlock[];
	faq_items?: RepeaterItem[];
};

export async function wireHomepageEmDashContent(contentHtml: string, cache: CacheTarget) {
	const [
		homepage,
		officeInfo,
		staff,
		audiologyServices,
		tinnitusCta,
		hearingAids,
		hearingAidServices,
	] = await Promise.all([
		getSingleEntry<Homepage>("homepage", cache),
		getSingleEntry<OfficeInfoMapCta>("office_info_map_ctas", cache),
		getEntries<Staff>("staff", cache),
		getSingleEntry<AudiologyServicesSection>("audiology_services_sections", cache),
		getSingleEntry<TinnitusCta>("tinnitus_ctas", cache),
		getSingleEntry<HearingAidsSection>("hearing_aids_sections", cache),
		getSingleEntry<HearingAidServicesSection>("hearing_aid_services_sections", cache),
	]);

	let html = contentHtml;
	html = ensureLocalCmsStyles(html);
	if (homepage) html = wireHomepageSections(html, homepage.data);
	if (officeInfo) html = wireOfficeInfo(html, officeInfo.data);
	if (staff.length > 0) {
		html = wireStaffCards(html, staff.map((entry) => ({ ...entry.data, cmsSlug: entry.id })));
	}
	if (audiologyServices) html = wireAudiologyServices(html, audiologyServices.data);
	if (tinnitusCta) html = wireTinnitusCta(html, tinnitusCta.data);
	if (hearingAids) html = wireHearingAids(html, hearingAids.data);
	if (hearingAidServices) html = wireHearingAidServices(html, hearingAidServices.data);
	return html;
}

export async function wireHomepageEmDashHead(headHtml: string, cache: CacheTarget) {
	const homepage = await getSingleEntry<Homepage>("homepage", cache);
	if (!homepage) return headHtml;

	const { meta_title: metaTitle, meta_description: metaDescription } = homepage.data;
	let html = headHtml;
	if (metaTitle) {
		html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metaTitle)}</title>`);
	}
	if (metaDescription) {
		const metaTag = `<meta name="description" content="${escapeAttr(metaDescription)}" />`;
		if (/<meta\s+name="description"[^>]*>/i.test(html)) {
			html = html.replace(/<meta\s+name="description"[^>]*>/i, metaTag);
		} else {
			html = html.replace(/<title>[\s\S]*?<\/title>/i, (titleTag) => `${titleTag}\n${metaTag}`);
		}
	}
	return html;
}

async function getEntries<T>(collection: string, cache: CacheTarget) {
	const result = await getEmDashCollection(collection as never, { limit: 50 });
	cache.set(result.cacheHint);
	return (result.entries ?? []) as unknown as ContentEntry<T>[];
}

async function getSingleEntry<T>(collection: string, cache: CacheTarget) {
	return (await getEntries<T>(collection, cache))[0] ?? null;
}

function ensureLocalCmsStyles(html: string) {
	if (html.includes("local-cms-wiring-styles")) return html;

	return `<style id="local-cms-wiring-styles">
.local-staff-card-clickable{position:relative}
.local-staff-card-clickable.local-staff-card-clickable .e-con-inner .astro-element.astro-element-f22df11:not(.astro-motion-effects-element-type-background),
.local-staff-card-clickable.local-staff-card-clickable .e-con-inner .astro-element.astro-element-f22df11>.astro-motion-effects-container>.astro-motion-effects-layer{background-image:var(--local-staff-image)!important;background-position:center top!important;background-repeat:no-repeat!important;background-size:cover!important}
.local-staff-card-overlay{position:absolute;inset:0;z-index:9999;display:block}
.local-staff-card-clickable .astro-widget-heading a{position:relative;z-index:10000}
.local-accordion-heading{margin:0;font:inherit;color:inherit}
</style><script id="local-cms-wiring-script">
(() => {
	let scheduled = false;
	function applyStaffCards() {
		scheduled = false;
		document.querySelectorAll(".local-staff-card-clickable").forEach((card) => {
			const imageValue = getComputedStyle(card).getPropertyValue("--local-staff-image").trim();
			const image = card.querySelector(".astro-element-f22df11");
			if (imageValue && image instanceof HTMLElement) {
				if (image.style.getPropertyValue("background-image") !== imageValue) {
					image.style.setProperty("background-image", imageValue, "important");
				}
				image.style.setProperty("background-position", "center top", "important");
				image.style.setProperty("background-repeat", "no-repeat", "important");
				image.style.setProperty("background-size", "cover", "important");
			}
			if (card instanceof HTMLElement) {
				card.style.setProperty("position", "relative");
			}
			const overlay = card.querySelector(".local-staff-card-overlay");
			if (overlay instanceof HTMLElement) {
				overlay.style.setProperty("position", "absolute");
				overlay.style.setProperty("inset", "0");
				overlay.style.setProperty("display", "block");
				overlay.style.setProperty("z-index", "2147483647");
				if (!overlay.dataset.localStaffClick) {
					overlay.dataset.localStaffClick = "true";
					let pointerStartX = 0;
					let pointerStartY = 0;
					let pointerTimer = 0;
					const clearPointerTimer = () => {
						if (!pointerTimer) return;
						window.clearTimeout(pointerTimer);
						pointerTimer = 0;
					};
					const goToHref = () => {
						const href = overlay.getAttribute("href");
						if (!href) return;
						window.location.href = href;
					};
					const followLink = (event) => {
						clearPointerTimer();
						event.preventDefault();
						event.stopPropagation();
						goToHref();
					};
					overlay.addEventListener("pointerdown", (event) => {
						if (event.button > 0) return;
						pointerStartX = event.clientX;
						pointerStartY = event.clientY;
						clearPointerTimer();
						const cancelOnMove = (moveEvent) => {
							if (Math.abs(moveEvent.clientX - pointerStartX) <= 8 && Math.abs(moveEvent.clientY - pointerStartY) <= 8) return;
							clearPointerTimer();
							window.removeEventListener("pointermove", cancelOnMove, true);
						};
						window.addEventListener("pointermove", cancelOnMove, true);
						window.addEventListener("pointercancel", clearPointerTimer, { once: true, capture: true });
						pointerTimer = window.setTimeout(() => {
							window.removeEventListener("pointermove", cancelOnMove, true);
							goToHref();
						}, 120);
					}, { capture: true });
					overlay.addEventListener("pointerup", (event) => {
						if (Math.abs(event.clientX - pointerStartX) > 8 || Math.abs(event.clientY - pointerStartY) > 8) return;
						followLink(event);
					}, { capture: true });
					overlay.addEventListener("click", followLink, { capture: true });
				}
			}
		});
	}
	function schedule() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(applyStaffCards);
	}
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", schedule, { once: true });
	} else {
		schedule();
	}
	window.addEventListener("load", schedule, { once: true });
	[100, 500, 1500, 3000].forEach((delay) => setTimeout(schedule, delay));
	new MutationObserver(schedule).observe(document.documentElement, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ["class", "style"],
	});
})();
</script>${html}`;
}

function wireOfficeInfo(html: string, data: OfficeInfoMapCta) {
	return replaceElementByDataId(html, "4990644", (section) => {
		let next = section;
		const mapLabel = [portableTextPlain(data.clinic_name), data.address].filter(Boolean).join(", ");
		next = replaceWidgetHtml(next, "c042720", `<h3 class="astro-heading-title astro-size-default">${portableTextInline(data.clinic_name)}</h3>`);
		next = replaceWidgetHtml(next, "69591dc", portableTextHtml(data.content_body));
		next = replaceWidgetHtml(
			next,
			"df6221a",
			`<h3 class="astro-heading-title astro-size-default"><a href="${escapeAttr(data.address_url ?? "#")}" target="_blank" rel="noopener">${escapeHtml(data.address ?? "")}</a></h3>`,
		);
		next = replaceWidgetHtml(next, "fc9fc05", `<h3 class="astro-heading-title astro-size-default">${officePhoneHtml(portableTextInline(data.phone_number))}</h3>`);
		next = replaceOfficeInfoHours(next, data.hours ?? []);
		next = replaceIframeSrc(next, "99a8a53", googleMapEmbedUrl(mapLabel), mapLabel);
		return next;
	});
}

function wireHomepageSections(html: string, data: Homepage) {
	let next = html;
	next = wireHeroSection(next, data);
	next = wireTrustBadges(next, data);
	next = wireAboutSection(next, data);
	next = wireTestimonialsSection(next, data);
	next = wireFaqSection(next, data);
	return next;
}

function wireHeroSection(html: string, data: Homepage) {
	return replaceElementByDataId(html, "41a1dbf", (section) => {
		let next = section;
		next = replaceWidgetHtml(next, "f8f905b", `<div class="astro-heading-title astro-size-default">${lineBreakText(data.hero_title ?? "")}</div>`);
		next = replaceWidgetHtml(next, "f0f9ffe", `<p class="astro-heading-title astro-size-default">${escapeHtml(data.hero_subtext ?? "")}</p>`);
		next = replaceWidgetLink(next, "d4a373d", data.schedule_appointment_url ?? "/contact-us/");
		next = replaceWidgetHtml(next, "e5f0dff", `<p class="astro-heading-title astro-size-default">${portableTextInline(data.cta_text)}</p>`);
		return next;
	});
}

function wireTrustBadges(html: string, data: Homepage) {
	const badges = [
		data.trust_badge_1,
		data.trust_badge_2,
		data.trust_badge_3,
		data.trust_badge_4,
		data.trust_badge_5,
		data.trust_badge_6,
		data.trust_badge_7,
		data.trust_badge_8,
	].filter((image): image is ImageValue => Boolean(getImageSrc(image)));

	if (badges.length === 0) return html;

	return replaceElementByDataId(html, "5eae281", (section) => replaceSwiperImageSlides(section, badges));
}

function wireAboutSection(html: string, data: Homepage) {
	return replaceElementByDataId(html, "48c7ad2", (section) => {
		let next = section;
		next = replaceImage(next, "9eb3a11", data.about_featured_image);
		next = replaceWidgetHtml(next, "e29dc51", `<h1 class="astro-heading-title astro-size-default">${escapeHtml(data.about_h1_section_title ?? "")}</h1>`);
		next = replaceWidgetHtml(next, "2f78887", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.about_h2_section_title ?? "")}</h2>`);

		const aboutBlocks = data.about_content_body ?? [];
		const [introBlock, ...bodyBlocks] = aboutBlocks.filter(isTextBlock);
		if (introBlock) {
			next = replaceWidgetHtml(next, "0122f23", `<p class="astro-heading-title astro-size-default">${portableTextBlockInline(introBlock)}</p>`);
		}
		next = replaceWidgetHtml(next, "03d6946", portableTextHtml(bodyBlocks));
		next = replaceWidgetLink(next, "40f4d20", data.about_us_url ?? "/about/");
		return next;
	});
}

function wireTestimonialsSection(html: string, data: Homepage) {
	return replaceElementByDataId(html, "001cbcc", (section) => {
		let next = section;
		next = replaceWidgetHtml(next, "d303f59", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.testimonials_subheading ?? "")}</h2>`);
		next = replaceWidgetHtml(next, "a77aacb", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.testimonials_h2_section_title ?? "")}</h2>`);
		return next;
	});
}

function wireFaqSection(html: string, data: Homepage) {
	return replaceElementByDataId(html, "c1c8340", (section) => {
		let next = section;
		next = replaceWidgetHtml(next, "b9c3614", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.faq_h2_section_title ?? "")}</h2>`);
		next = replaceWidgetHtml(next, "1ba7f24", portableTextHtml(data.faq_body_content));
		next = replaceFaqAccordionItems(next, data.faq_items ?? [], {
			idPrefix: "e-n-accordion-item-186",
		});
		return next;
	});
}

function wireStaffCards(html: string, staff: Staff[]) {
	if (staff.length === 0) return html;
	const slides: NonNullable<ReturnType<typeof findEnclosingSwiperSlide>>[] = [];
	const seenSlides = new Set<number>();
	let cursor = 0;
	while (true) {
		const found = findElementByDataId(html, "e30a332", cursor);
		if (!found) break;
		const slide = findEnclosingSwiperSlide(html, found.start, found.end);
		if (slide && !seenSlides.has(slide.start)) {
			slides.push(slide);
			seenSlides.add(slide.start);
		}
		cursor = found.end;
	}
	if (slides.length === 0) return html;

	const slideCount = Math.max(slides.length, staff.length);
	const renderedSlides = Array.from({ length: slideCount }, (_value, index) => {
		const template = slides[Math.min(index, slides.length - 1)]?.html ?? slides[0]!.html;
		return renderStaffSlide(template, staff[index % staff.length]!, index, slideCount);
	});

	return `${html.slice(0, slides[0]!.start)}${renderedSlides.join("")}${html.slice(slides[slides.length - 1]!.end)}`;
}

function findEnclosingSwiperSlide(html: string, childStart: number, childEnd: number) {
	const slideOpenRe = /<div\b[^>]*class="[^"]*\bswiper-slide\b[^"]*"[^>]*>/gi;
	let match: RegExpExecArray | null;
	let slide: { start: number; end: number; openEnd: number; html: string } | null = null;
	while ((match = slideOpenRe.exec(html)) && match.index < childStart) {
		const start = match.index;
		const end = findClosingDiv(html, start);
		if (end >= childEnd) {
			slide = {
				start,
				end,
				openEnd: start + match[0].length,
				html: html.slice(start, end),
			};
		}
	}
	return slide;
}

function renderStaffSlide(template: string, person: Staff, index: number, total: number) {
	const card = findElementByDataId(template, "e30a332");
	if (!card) return template;
	let slide = template.slice(0, card.start) + renderStaffCard(card.html, person) + template.slice(card.end);
	slide = slide.replace(/data-slide="\d+"/, `data-slide="${index + 1}"`);
	slide = slide.replace(/aria-label="\d+ of \d+"/, `aria-label="${index + 1} of ${total}"`);
	return slide;
}

function renderStaffCard(template: string, person: Staff) {
	const route = normalizeHref(person.route ?? (person.cmsSlug ? `/audiologist/${person.cmsSlug}/` : "#"));
	let card = template;
	if (!card.includes("local-staff-card-clickable")) {
		card = card.replace(/astro-element-e30a332\b/, "astro-element-e30a332 local-staff-card-clickable");
	}
	card = setStaffCardImageVariable(card, person.featured_image);
	card = replaceBackgroundImage(card, "f22df11", person.featured_image);
	card = replaceAllLinks(card, route);
	card = replaceWidgetHtml(card, "bd5d6cb", `<div class="astro-heading-title astro-size-default"><a href="${escapeAttr(route)}">${escapeHtml(person.name ?? "")}</a></div>`);
	card = replaceWidgetHtml(card, "e97a6a2", `<div class="astro-heading-title astro-size-default"><a href="${escapeAttr(route)}">${escapeHtml(person.job_title ?? "")}</a></div>`);
	card = card.replace(/<a class="local-staff-card-overlay"[^>]*><\/a>/g, "");
	return card.replace(/<\/div>$/, `<a class="local-staff-card-overlay" href="${escapeAttr(route)}" aria-label="${escapeAttr(person.name ?? "Staff profile")}"></a></div>`);
}

function setStaffCardImageVariable(card: string, image?: ImageValue) {
	const imageSrc = getImageSrc(image);
	if (!imageSrc) return card;
	const escaped = escapeAttr(`url('${imageSrc}')`);
	return card.replace(/(<div class="astro-element astro-element-e30a332[^"]*"[^>]*)(>)/, (match, open, close) => {
		if (/\sstyle="/.test(match)) {
			return match.replace(/\sstyle="([^"]*)"/, (_styleMatch, styleValue) => {
				const cleaned = String(styleValue).replace(/--local-staff-image:[^;"]*;?/g, "");
				return ` style="--local-staff-image:${escaped};${cleaned}"`;
			});
		}
		return `${open} style="--local-staff-image:${escaped};"${close}`;
	});
}

function wireAudiologyServices(html: string, data: AudiologyServicesSection) {
	return replaceElementByDataId(html, "84e27c6", (section) => {
		let next = section;
		next = replaceWidgetHtml(next, "2287fbc", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.h2_section_title ?? "")}</h2>`);
		next = replaceWidgetHtml(next, "d038888", `<p class="astro-heading-title astro-size-default">${portableTextInline(data.content_body)}</p>`);
		next = replaceImage(next, "d2d72f6", data.section_featured_image);
		next = replaceContainerChildren(next, "8384c92", buildServiceCards(next, ["7d5edd5", "cd08481", "98d1800"], data.service_cards ?? []));
		return next;
	});
}

function wireTinnitusCta(html: string, data: TinnitusCta) {
	return replaceElementByDataId(html, "c090845", (section) => {
		let next = section;
		next = replaceWidgetHtml(next, "99ff5f7", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.h2_section_title ?? "")}</h2>`);
		next = replaceWidgetHtml(next, "3936d8c", portableTextHtml(data.content_body));
		next = replaceImage(next, "2f11e38", data.section_featured_image);
		next = replaceAccordionItems(next, data.accordion_items ?? [], {
			includeButton: true,
			idPrefix: "e-n-accordion-item-253",
		});
		return next;
	});
}

function wireHearingAids(html: string, data: HearingAidsSection) {
	return replaceElementByDataId(html, "5551286", (section) => {
		let next = section;
		next = next.replace(/&quot;infinite&quot;:&quot;yes&quot;/, "&quot;infinite&quot;:&quot;no&quot;");
		next = replaceWidgetHtml(next, "5573e55", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.h2_section_title ?? "")}</h2>`);
		next = replaceWidgetHtml(next, "ff34958", `<p class="astro-heading-title astro-size-default">${escapeHtml(data.section_subheading ?? "")}</p>`);
		next = replaceSwiperSlides(next, data.service_cards ?? []);
		return next;
	});
}

function wireHearingAidServices(html: string, data: HearingAidServicesSection) {
	return replaceElementByDataId(html, "7749715", (section) => {
		let next = section;
		next = replaceImage(next, "a09d901", data.section_featured_image);
		next = replaceWidgetHtml(next, "6fb00db", `<h2 class="astro-heading-title astro-size-default">${escapeHtml(data.h2_section_title ?? "")}</h2>`);
		next = replaceWidgetHtml(next, "c2ee600", portableTextHtml(data.content_body));
		next = replaceWidgetLink(next, "b9d9a9b", data.learn_more_url ?? "/hearing-aid-services/");
		next = replaceAccordionItems(next, data.accordion_items ?? [], {
			includeButton: false,
			idPrefix: "e-n-accordion-item-217",
		});
		return next;
	});
}

function buildServiceCards(section: string, templateIds: string[], items: RepeaterItem[]) {
	return items
		.map((item, index) => {
			const template = findElementByDataId(section, templateIds[index] ?? templateIds[0])?.html;
			if (!template) return "";
			const serviceTitle = fieldText(item, "service_title");
			const description = fieldText(item, "description");
			const serviceUrl = fieldText(item, "service_url");
			let card = template;
			card = card.replace(/<h3 class="astro-heading-title astro-size-default">[\s\S]*?<\/h3>/, `<h3 class="astro-heading-title astro-size-default">${escapeHtml(serviceTitle)}</h3>`);
			card = card.replace(/<div class="astro-widget-container"><p>[\s\S]*?<\/p><\/div>/, `<div class="astro-widget-container"><p>${escapeHtml(description)}</p></div>`);
			card = card.replace(/href="[^"]*"/, `href="${escapeAttr(normalizeHref(serviceUrl || "#"))}"`);
			return card;
		})
		.join("");
}

function replaceSwiperSlides(section: string, items: RepeaterItem[]) {
	const wrapperStart = section.search(/<div class="swiper-wrapper"[^>]*>/);
	if (wrapperStart === -1) return section;
	const openEnd = section.indexOf(">", wrapperStart) + 1;
	const wrapperEnd = findClosingDiv(section, wrapperStart);
	if (wrapperEnd === -1) return section;

	const currentInner = section.slice(openEnd, wrapperEnd - "</div>".length);
	const firstSlideStart = currentInner.indexOf('<div class="swiper-slide"');
	const firstSlideEnd = firstSlideStart === -1 ? -1 : findClosingDiv(currentInner, firstSlideStart);
	const firstSlide = firstSlideStart === -1 || firstSlideEnd === -1 ? null : currentInner.slice(firstSlideStart, firstSlideEnd);
	if (!firstSlide) return section;

	const slides = items
		.map((item, index) => {
			const serviceTitle = fieldText(item, "service_title");
			const description = fieldText(item, "description");
			const serviceUrl = fieldText(item, "service_url");
			let slide = firstSlide;
			slide = slide.replace(/data-slide="\d+"/, `data-slide="${index + 1}"`);
			slide = slide.replace(/aria-label="\d+ of \d+"/, `aria-label="${index + 1} of ${items.length}"`);
			slide = slide.replace(/<h3 class="astro-heading-title astro-size-default">[\s\S]*?<\/h3>/, `<h3 class="astro-heading-title astro-size-default">${escapeHtml(serviceTitle)}</h3>`);
			slide = slide.replace(/<div class="astro-widget-container"><p>[\s\S]*?<\/p><\/div>/, `<div class="astro-widget-container"><p>${escapeHtml(description)}</p></div>`);
			slide = slide.replace(/href="[^"]*"/, `href="${escapeAttr(normalizeHref(serviceUrl || "#"))}"`);
			return slide;
		})
		.join("");

	return section.slice(0, openEnd) + slides + section.slice(wrapperEnd - "</div>".length);
}

function replaceAccordionItems(section: string, items: RepeaterItem[], options: { includeButton: boolean; idPrefix: string }) {
	const accordionMatch = section.match(/<div class="e-n-accordion"[^>]*>/);
	if (!accordionMatch?.index) return section;
	const start = accordionMatch.index;
	const openEnd = start + accordionMatch[0].length;
	const end = findClosingDiv(section, start);
	if (end === -1) return section;

	const inner = section.slice(openEnd, end - "</div>".length);
	const templates = inner.match(/<details\b[\s\S]*?<\/details>/g) ?? [];
	const template = templates[0];
	if (!template) return section;

	const details = items
		.map((item, index) => {
			const serviceTitle = fieldText(item, "service_title");
			const description = fieldText(item, "description");
			const serviceUrl = fieldText(item, "service_url");
			const id = `${options.idPrefix}${index}`;
			let detail = template;
			detail = detail.replace(/<details id="[^"]*" class="e-n-accordion-item"(?: open)?>/, `<details id="${id}" class="e-n-accordion-item"${index === 0 ? " open" : ""}>`);
			detail = detail.replace(/data-accordion-index="\d+"/, `data-accordion-index="${index + 1}"`);
			detail = detail.replace(/tabindex="[^"]*"/, `tabindex="${index === 0 ? "0" : "-1"}"`);
			detail = detail.replace(/aria-expanded="[^"]*"/, `aria-expanded="${index === 0 ? "true" : "false"}"`);
			detail = detail.replace(/aria-controls="[^"]*"/g, `aria-controls="${id}"`);
			detail = detail.replace(/aria-labelledby="[^"]*"/g, `aria-labelledby="${id}"`);
			detail = detail.replace(/class="e-n-accordion-item-title-text">[\s\S]*?<\/(?:div|h3)>/, `class="e-n-accordion-item-title-text local-accordion-heading">${escapeHtml(serviceTitle)}</h3>`);
			detail = detail.replace(/<span class="e-n-accordion-item-title-header"><h3/, `<span class="e-n-accordion-item-title-header"><h3`);
			detail = detail.replace(/<span class="e-n-accordion-item-title-header"><div/, `<span class="e-n-accordion-item-title-header"><h3`);
			detail = detail.replace(/<div class="astro-widget-container"><p>[\s\S]*?<\/p><\/div>/, `<div class="astro-widget-container"><p>${escapeHtml(description)}</p></div>`);
			if (options.includeButton) {
				detail = detail.replace(/href="[^"]*"/, `href="${escapeAttr(normalizeHref(serviceUrl || "#"))}"`);
			} else {
				detail = detail.replace(/<div class="astro-element [^"]*astro-widget-button[\s\S]*?<\/div><\/div><\/div>/, "");
			}
			return detail;
		})
		.join(" ");

	return section.slice(0, openEnd) + details + section.slice(end - "</div>".length);
}

function replaceSwiperImageSlides(section: string, images: ImageValue[]) {
	const wrapperStart = section.search(/<div class="swiper-wrapper"[^>]*>/);
	if (wrapperStart === -1) return section;
	const openEnd = section.indexOf(">", wrapperStart) + 1;
	const wrapperEnd = findClosingDiv(section, wrapperStart);
	if (wrapperEnd === -1) return section;

	const currentInner = section.slice(openEnd, wrapperEnd - "</div>".length);
	const firstSlideStart = currentInner.indexOf('<div class="swiper-slide"');
	const firstSlideEnd = firstSlideStart === -1 ? -1 : findClosingDiv(currentInner, firstSlideStart);
	const firstSlide = firstSlideStart === -1 || firstSlideEnd === -1 ? null : currentInner.slice(firstSlideStart, firstSlideEnd);
	if (!firstSlide) return section;

	const slides = images
		.map((image, index) => {
			const imageSrc = getImageSrc(image);
			let slide = firstSlide;
			slide = slide.replace(/data-slide="\d+"/, `data-slide="${index + 1}"`);
			slide = slide.replace(/aria-label="\d+ of \d+"/, `aria-label="${index + 1} of ${images.length}"`);
			slide = slide.replace(/<img\b[^>]*\/?>/, (img) => {
				let next = img.replace(/\s+srcset="[^"]*"/, "").replace(/\s+sizes="[^"]*"/, "");
				next = setAttr(next, "src", imageSrc);
				next = setAttr(next, "alt", image.alt ?? "");
				return next;
			});
			return slide;
		})
		.join("");

	return section.slice(0, openEnd) + slides + section.slice(wrapperEnd - "</div>".length);
}

function replaceFaqAccordionItems(section: string, items: RepeaterItem[], options: { idPrefix: string }) {
	const accordionMatch = section.match(/<div class="e-n-accordion"[^>]*>/);
	if (!accordionMatch?.index) return section;
	const start = accordionMatch.index;
	const openEnd = start + accordionMatch[0].length;
	const end = findClosingDiv(section, start);
	if (end === -1) return section;

	const inner = section.slice(openEnd, end - "</div>".length);
	const templates = inner.match(/<details\b[\s\S]*?<\/details>/g) ?? [];
	const template = templates[0];
	if (!template) return section;

	const details = items
		.map((item, index) => {
			const id = `${options.idPrefix}${index}`;
			const question = fieldText(item, "question");
			const answer = fieldLongTextHtml(item, "answer");
			let detail = template;
			detail = detail.replace(/<details id="[^"]*" class="e-n-accordion-item"(?: open)?>/, `<details id="${id}" class="e-n-accordion-item"${index === 0 ? " open" : ""}>`);
			detail = detail.replace(/data-accordion-index="\d+"/, `data-accordion-index="${index + 1}"`);
			detail = detail.replace(/tabindex="[^"]*"/, `tabindex="${index === 0 ? "0" : "-1"}"`);
			detail = detail.replace(/aria-expanded="[^"]*"/, `aria-expanded="${index === 0 ? "true" : "false"}"`);
			detail = detail.replace(/aria-controls="[^"]*"/g, `aria-controls="${id}"`);
			detail = detail.replace(/aria-labelledby="[^"]*"/g, `aria-labelledby="${id}"`);
			detail = detail.replace(/<span class="e-n-accordion-item-title-header">[\s\S]*?<\/span>/, `<span class="e-n-accordion-item-title-header"><h3 class="e-n-accordion-item-title-text local-accordion-heading local-faq-accordion-heading">${escapeHtml(question)}</h3></span>`);
			detail = detail.replace(/<div class="astro-widget-container"><p>[\s\S]*?<\/p><\/div>/, `<div class="astro-widget-container">${answer}</div>`);
			return detail;
		})
		.join(" ");

	return section.slice(0, openEnd) + details + section.slice(end - "</div>".length);
}

function replaceContainerChildren(html: string, dataId: string, children: string) {
	const element = findElementByDataId(html, dataId);
	if (!element) return html;
	return html.slice(0, element.openEnd) + children + html.slice(element.end - "</div>".length);
}

function replaceElementByDataId(html: string, dataId: string, replacement: (element: string) => string) {
	const element = findElementByDataId(html, dataId);
	if (!element) return html;
	const next = replacement(element.html);
	return html.slice(0, element.start) + next + html.slice(element.end);
}

function findElementByDataId(html: string, dataId: string, fromIndex = 0) {
	const dataIndex = html.indexOf(`data-id="${dataId}"`, fromIndex);
	if (dataIndex === -1) return null;
	const start = html.lastIndexOf("<div", dataIndex);
	if (start === -1) return null;
	const end = findClosingDiv(html, start);
	if (end === -1) return null;
	const openEnd = html.indexOf(">", start) + 1;
	return { start, end, openEnd, html: html.slice(start, end) };
}

function findClosingDiv(html: string, start: number) {
	const re = /<\/?div\b[^>]*>/gi;
	re.lastIndex = start;
	let depth = 0;
	let match: RegExpExecArray | null;
	while ((match = re.exec(html))) {
		if (match[0][1] === "/") depth--;
		else depth++;
		if (depth === 0) return re.lastIndex;
	}
	return -1;
}

function replaceWidgetHtml(html: string, dataId: string, innerHtml: string) {
	return replaceElementByDataId(html, dataId, (widget) => {
		const container = findWidgetContainer(widget);
		if (!container) return widget;
		return widget.slice(0, container.openEnd) + innerHtml + widget.slice(container.end - "</div>".length);
	});
}

function findWidgetContainer(widget: string) {
	const index = widget.indexOf('class="astro-widget-container"');
	if (index === -1) return null;
	const start = widget.lastIndexOf("<div", index);
	if (start === -1) return null;
	const end = findClosingDiv(widget, start);
	if (end === -1) return null;
	return { start, end, openEnd: widget.indexOf(">", start) + 1 };
}

function replaceImage(html: string, widgetDataId: string, image?: ImageValue) {
	const imageSrc = getImageSrc(image);
	if (!imageSrc) return html;
	const imageAlt = image?.alt ?? "";
	return replaceElementByDataId(html, widgetDataId, (widget) => {
		return widget.replace(/<img\b[^>]*\/?>/, (img) => {
			let next = img.replace(/\s+srcset="[^"]*"/, "");
			next = setAttr(next, "src", imageSrc);
			next = setAttr(next, "alt", imageAlt);
			next = setAttr(
				next,
				"style",
				`background-image:url('${imageSrc}');background-size:cover;background-position:center center;background-repeat:no-repeat;`,
			);
			return next;
		});
	});
}

function replaceIframeSrc(html: string, widgetDataId: string, src: string, title?: string) {
	return replaceElementByDataId(html, widgetDataId, (widget) => {
		return widget.replace(/<iframe\b[^>]*><\/iframe>/, (iframe) => {
			let next = setAttr(iframe, "src", src);
			if (title) {
				next = setAttr(next, "title", title);
				next = setAttr(next, "aria-label", title);
			}
			return next;
		});
	});
}

function replaceWidgetLink(html: string, widgetDataId: string, href: string) {
	return replaceElementByDataId(html, widgetDataId, (widget) => widget.replace(/href="[^"]*"/, `href="${escapeAttr(normalizeHref(href))}"`));
}

function replaceBackgroundImage(html: string, dataId: string, image?: ImageValue) {
	const imageSrc = getImageSrc(image);
	if (!imageSrc) return html;
	const style = `background-image:url('${escapeAttr(imageSrc)}') !important;background-position:center top !important;background-repeat:no-repeat !important;background-size:cover !important`;
	return replaceElementByDataId(html, dataId, (element) => {
		if (/\sstyle="/.test(element)) {
			return element.replace(/\sstyle="[^"]*"/, ` style="${style}"`);
		}
		return element.replace(/(<div\b[^>]*)(>)/, `$1 style="${style}"$2`);
	});
}

function getImageSrc(image?: ImageValue) {
	if (!image) return "";
	if (image.src) return image.src;
	if (image.meta?.storageKey) return `/_emdash/api/media/file/${image.meta.storageKey}`;
	return "";
}

function replaceAllLinks(html: string, href: string) {
	return html.replace(/\shref="[^"]*"/g, ` href="${escapeAttr(href)}"`);
}

function fieldText(item: RepeaterItem, key: string) {
	const value = item[key];
	return typeof value === "string" ? value : "";
}

function fieldLongTextHtml(item: RepeaterItem, key: string) {
	const value = item[key];
	if (typeof value === "string") {
		return value
			.split(/\n{2,}/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean)
			.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
			.join("");
	}
	if (Array.isArray(value)) return portableTextHtml(value as PortableTextBlock[]);
	return "";
}

function isTextBlock(block: PortableTextBlock) {
	return block._type === "block" && Boolean(portableTextBlockInline(block).trim());
}

function setAttr(tag: string, attr: string, value: string) {
	const escaped = escapeAttr(value);
	const pattern = new RegExp(`\\s${attr}="[^"]*"`);
	if (pattern.test(tag)) return tag.replace(pattern, ` ${attr}="${escaped}"`);
	return tag.replace(/\/?>$/, ` ${attr}="${escaped}"$&`);
}

function normalizeHref(href: string) {
	if (!href || href === "#") return "#";
	if (/^(https?:|mailto:|tel:|\/|#)/.test(href)) return href;
	return `/${href.replace(/^\/+/, "")}`;
}

function googleMapEmbedUrl(address: string) {
	const query = encodeURIComponent(address || "Raleigh Hearing and Tinnitus Center");
	return `https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near`;
}

function portableTextHtml(blocks?: PortableTextBlock[]) {
	const html = blocks
		?.map((block) => {
			if (block._type !== "block") return "";
			const text = portableTextBlockInline(block);
			if (!text) return "";
			return `<p>${text}</p>`;
		})
		.filter(Boolean)
		.join("");
	return html || "";
}

function replaceOfficeInfoHours(html: string, hours: PortableTextBlock[]) {
	const hourLines = hours
		.filter((block) => block._type === "block")
		.map((block) => portableTextBlockInline(block))
		.filter((line) => line.trim());
	const [mondayThursday = "", friday = "", weekend = ""] = hourLines;

	let next = html;
	next = replaceWidgetHtml(next, "ecba252", mondayThursday ? `<h3 class="astro-heading-title astro-size-default">${officeHourHtml(mondayThursday)}</h3>` : "");
	next = replaceWidgetHtml(next, "b923787", friday ? `<p class="astro-heading-title astro-size-default">${officeHourHtml(friday)}</p>` : "");
	next = replaceWidgetHtml(next, "53844c0", weekend ? `<p class="astro-heading-title astro-size-default">${officeHourHtml(weekend)}</p>` : "");
	return next;
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

function portableTextInline(blocks?: PortableTextBlock[]) {
	return (
		blocks
			?.map((block) => {
				if (block._type !== "block") return "";
				return portableTextBlockInline(block);
			})
			.filter(Boolean)
			.join("<br>") ?? ""
	);
}

function portableTextBlockInline(block: PortableTextBlock) {
	const markDefs = (("markDefs" in block ? block.markDefs : []) ?? []) as Array<{
		_key?: string;
		_type?: string;
		href?: string;
		blank?: boolean;
	}>;
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

function applyPortableTextMarks(
	html: string,
	marks: string[],
	markDefs: Array<{ _key?: string; _type?: string; href?: string; blank?: boolean }>,
) {
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

function portableTextPlain(blocks?: PortableTextBlock[]) {
	return (
		blocks
			?.map((block) => {
				if (block._type !== "block") return "";
				const children = ("children" in block && Array.isArray(block.children))
					? (block.children as Array<{ text?: string }>)
					: [];
				return children.map((child) => ("text" in child ? child.text : "")).join("");
			})
			.filter(Boolean)
			.join("\n") ?? ""
	);
}

function lineBreakText(value: string) {
	return escapeHtml(value).replace(/\r?\n/g, "<br>");
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
