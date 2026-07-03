import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const localOrigin = process.env.LOCAL_ORIGIN || "http://127.0.0.1:4321";
const liveOrigin = process.env.LIVE_ORIGIN || "https://www.robertshearingclinic.com";
const outputDir = path.resolve("qa", "playwright");

const screenshotPages = [
	"/",
	"/about-us/",
	"/services/",
	"/hearing-tests/",
	"/hearing-aids-and-products/",
	"/request-an-appointment/",
	"/audiologist/katie-pierce-m-c-d/",
	"/normal-hearing-range-what-your-hearing-test-results-mean/",
];

const viewports = [
	{ name: "desktop", width: 1365, height: 768 },
	{ name: "mobile", width: 390, height: 844 },
];

function slugFor(value) {
	return value.replace(/^\/$/, "home").replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "-") || "home";
}

async function openPage(page, url) {
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
	await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
	await page.waitForTimeout(1200);
}

async function capturePair(browser, route, viewport) {
	const context = await browser.newContext({ viewport });
	const live = await context.newPage();
	const local = await context.newPage();
	const localRequests = [];

	local.on("request", (request) => {
		const url = request.url();
		if (/robertshearingclinic\.com/i.test(url)) {
			localRequests.push({ type: request.resourceType(), url });
		}
	});

	await openPage(live, `${liveOrigin}${route}`);
	await openPage(local, `${localOrigin}${route}`);

	const name = `${slugFor(route)}-${viewport.name}`;
	await live.screenshot({ path: path.join(outputDir, `live-${name}.png`), fullPage: false });
	await local.screenshot({ path: path.join(outputDir, `local-${name}.png`), fullPage: false });

	const localChecks = await local.evaluate((origin) => {
		const canonical = document.querySelector('link[rel="canonical"]')?.href || "";
		const schemaText = [...document.querySelectorAll('script[type="application/ld+json"]')]
			.map((script) => script.textContent || "")
			.join("\n");
		const indexHtmlLinks = [...document.querySelectorAll("a[href]")]
			.map((link) => link.getAttribute("href") || "")
			.filter((href) => /index\.html/i.test(href));
		const breadcrumbHome = [...document.querySelectorAll(".rank-math-breadcrumb a")]
			.filter((link) => (link.textContent || "").trim().toLowerCase() === "home")
			.map((link) => link.getAttribute("href"));
		const visibleImages = [...document.images].filter((img) => {
			const rect = img.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight;
		});
		const brokenVisibleImages = visibleImages
			.filter((img) => !img.complete || img.naturalWidth === 0)
			.map((img) => img.currentSrc || img.src);
		return {
			title: document.title,
			canonical,
			canonicalOk: canonical.startsWith(origin) && !canonical.includes("/assets/"),
			schemaOk: !schemaText.includes("[object Object]"),
			indexHtmlLinks,
			breadcrumbHome,
			breadcrumbHomeOk: breadcrumbHome.every((href) => href === "/"),
			brokenVisibleImages,
		};
	}, localOrigin);

	await context.close();
	return { route, viewport: viewport.name, localRequests, localChecks };
}

async function checkDropdown(browser) {
	const context = await browser.newContext({ viewport: viewports[0] });
	const page = await context.newPage();
	await openPage(page, `${localOrigin}/`);

	const nav = page.locator(".astro-element-a679b45 nav[aria-label='Menu']").first();
	const servicesItem = nav.locator("li.menu-item-1577").first();
	await servicesItem.locator("> a").hover();
	await page.waitForTimeout(600);

	const dropdown = servicesItem.locator("> ul.sub-menu").first();
	const firstSubItem = dropdown.locator("li").first();
	await firstSubItem.hover();
	await page.waitForTimeout(700);

	const result = await page.evaluate(() => {
		const navEl = document.querySelector(".astro-element-a679b45 nav[aria-label='Menu']");
		const item = navEl?.querySelector("li.menu-item-1577");
		const dropdownEl = item?.querySelector(":scope > ul.sub-menu");
		const dropdownRect = dropdownEl?.getBoundingClientRect();
		const dropdownStyle = dropdownEl ? getComputedStyle(dropdownEl) : null;
		const arrowReports = [...(navEl?.querySelectorAll("li.menu-item-has-children > a") || [])].map((link) => {
			const after = getComputedStyle(link, "::after").content;
			const before = getComputedStyle(link, "::before").content;
			return {
				text: (link.textContent || "").trim(),
				hasInlineArrow: !!link.querySelector("svg, .sub-arrow"),
				before,
				after,
			};
		});
		return {
			dropdownVisible:
				!!dropdownEl &&
				!!dropdownRect &&
				dropdownRect.width > 200 &&
				dropdownRect.height > 100 &&
				dropdownStyle?.visibility !== "hidden" &&
				dropdownStyle?.display !== "none" &&
				Number(dropdownStyle?.opacity ?? "1") > 0.5,
			dropdownBox: dropdownRect
				? { x: dropdownRect.x, y: dropdownRect.y, width: dropdownRect.width, height: dropdownRect.height }
				: null,
			arrowsVisible: arrowReports.every(
				(item) => item.hasInlineArrow || (item.after && item.after !== "none") || (item.before && item.before !== "none"),
			),
			arrowReports,
		};
	});

	await page.screenshot({ path: path.join(outputDir, "local-nav-services-dropdown.png"), fullPage: false });
	await context.close();
	return result;
}

async function checkAccordions(browser) {
	const context = await browser.newContext({ viewport: viewports[0] });
	const page = await context.newPage();
	await openPage(page, `${localOrigin}/hearing-aids-and-products/`);
	await page.locator(".custom-accordion summary").nth(0).click({ timeout: 10000 }).catch(() => {});
	await page.waitForTimeout(600);
	await page.locator(".custom-accordion summary").nth(1).click({ timeout: 10000 }).catch(() => {});
	await page.waitForTimeout(700);
	const result = await page.evaluate(() => {
		const accordion = document.querySelector(".custom-accordion");
		const openItems = accordion ? [...accordion.querySelectorAll("details[open]")] : [];
		const durations = accordion
			? [...accordion.querySelectorAll("details > div")]
					.map((el) => getComputedStyle(el).transitionDuration)
					.filter(Boolean)
			: [];
		return {
			found: !!accordion,
			openCount: openItems.length,
			onlyOneOpen: openItems.length <= 1,
			transitionDurations: [...new Set(durations)],
		};
	});
	await context.close();
	return result;
}

async function checkToc(browser) {
	const context = await browser.newContext({ viewport: viewports[0] });
	const page = await context.newPage();
	await openPage(page, `${localOrigin}/hearing-tests/`);
	const result = await page.evaluate(async () => {
		const toc = document.querySelector(".local-toc");
		const links = toc ? [...toc.querySelectorAll("a[data-local-toc-link]")] : [];
		const before = window.location.href;
		if (links[0]) {
			links[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			await new Promise((resolve) => setTimeout(resolve, 300));
		}
		const after = window.location.href;
		return {
			found: !!toc,
			linkCount: links.length,
			clickKeptUrl: before === after,
			firstTarget: links[0]?.getAttribute("data-target") || "",
		};
	});
	await context.close();
	return result;
}

async function checkRequestEmbed(browser) {
	const context = await browser.newContext({ viewport: viewports[0] });
	const page = await context.newPage();
	await openPage(page, `${localOrigin}/request-an-appointment/`);
	const result = await page.evaluate(() => {
		const forms = [...document.querySelectorAll("form")].map((form) => ({
			id: form.id,
			action: form.getAttribute("action"),
			method: form.getAttribute("method"),
			onsubmit: form.getAttribute("onsubmit"),
			fields: form.querySelectorAll("input, textarea, select, button").length,
		}));
		return {
			iframeCount: document.querySelectorAll("iframe").length,
			formCount: forms.length,
			forms,
			hasEmbedLikeContent: document.body.textContent?.toLowerCase().includes("appointment") ?? false,
		};
	});
	await context.close();
	return result;
}

async function main() {
	await mkdir(outputDir, { recursive: true });
	const browser = await chromium.launch();
	const captures = [];

	for (const route of screenshotPages) {
		for (const viewport of viewports) {
			captures.push(await capturePair(browser, route, viewport));
		}
	}

	const report = {
		generatedAt: new Date().toISOString(),
		localOrigin,
		liveOrigin,
		captures,
		dropdown: await checkDropdown(browser),
		accordions: await checkAccordions(browser),
		toc: await checkToc(browser),
		requestAppointment: await checkRequestEmbed(browser),
	};

	await browser.close();
	await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
