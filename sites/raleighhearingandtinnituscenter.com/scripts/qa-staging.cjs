#!/usr/bin/env node

const { execSync } = require("child_process");
const { chromium } = require("playwright");

const liveOrigin = "https://raleighhearingandtinnituscenter.com";
const stagingOrigin = "https://raleighhearingandtinnituscenter-staging.local-981.workers.dev";
const inlineMarkers = [
	"global-styles-inline-css",
	"astro-frontend-inline-css",
	"astro-custom-css",
	"astro-img-auto-sizes-contain-inline-css",
];

async function fetchText(url, init = {}) {
	const res = await fetch(url, { redirect: "follow", ...init });
	return {
		url,
		status: res.status,
		finalUrl: res.url,
		contentType: res.headers.get("content-type") || "",
		text: await res.text(),
	};
}

function locs(xml) {
	return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
		.map((match) => match[1].trim().replace(/&amp;/g, "&"));
}

function pathOf(url) {
	const parsed = new URL(url);
	return parsed.pathname.endsWith("/") || /\.[a-z0-9]+$/i.test(parsed.pathname)
		? parsed.pathname
		: `${parsed.pathname}/`;
}

async function crawlSitemaps(origin) {
	const queue = ["/sitemap_index.xml", "/sitemap.xml"];
	const seenSitemaps = new Set();
	const pageUrls = new Set();
	const sitemapStatus = [];

	while (queue.length) {
		const path = queue.shift();
		const url = `${origin}${path}`;
		if (seenSitemaps.has(url)) continue;
		seenSitemaps.add(url);

		try {
			const response = await fetchText(url);
			sitemapStatus.push({ path, status: response.status, type: response.contentType });
			if (response.status >= 400) continue;

			for (const loc of locs(response.text)) {
				const parsed = new URL(loc);
				if (parsed.pathname.includes("sitemap") && parsed.pathname.endsWith(".xml")) {
					queue.push(parsed.pathname);
				} else {
					pageUrls.add(pathOf(loc));
				}
			}
		} catch (error) {
			sitemapStatus.push({ path, error: error.message });
		}
	}

	return { sitemapStatus, paths: [...pageUrls].sort() };
}

function extract(html, regex) {
	return regex.exec(html)?.[1]?.trim() || "";
}

function attr(html, tagRegex, attrName) {
	const tag = tagRegex.exec(html)?.[0] || "";
	return new RegExp(`${attrName}=["']([^"']*)`, "i").exec(tag)?.[1] || "";
}

async function auditPage(path) {
	const response = await fetchText(`${stagingOrigin}${path}`);
	const html = response.text;
	const isHtml = /html/i.test(response.contentType) || /^\s*<!doctype html|<html/i.test(html);
	if (!isHtml) return { path, status: response.status, contentType: response.contentType, nonHtml: true };

	const canonical =
		attr(html, /<link\b[^>]*rel=["']canonical["'][^>]*>/i, "href") ||
		attr(html, /<link\b[^>]*href=["'][^"']*["'][^>]*rel=["']canonical["'][^>]*>/i, "href");
	const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, " ");
	const description = attr(html, /<meta\b[^>]*name=["']description["'][^>]*>/i, "content");
	const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
		.map((match) => match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const markerCounts = Object.fromEntries(
		inlineMarkers.map((marker) => [marker, (html.match(new RegExp(marker, "g")) || []).length]),
	);
	const liveRefs = (html.match(/https?:\/\/raleighhearingandtinnituscenter\.com/gi) || []).length;
	const localRefs = (html.match(/(?:localhost|file:\/\/|127\.0\.0\.1)/gi) || []).length;
	const styleAttrs = (html.match(/\sstyle=["']/gi) || []).length;
	const styleTags = (html.match(/<style\b/gi) || []).length;

	let canonicalIssue = "";
	if (!canonical) canonicalIssue = "missing canonical";
	else if (!canonical.startsWith(stagingOrigin)) canonicalIssue = `canonical off-origin: ${canonical}`;
	else if (/\.(css|js|png|jpg|jpeg|webp|svg|gif|ico|xml|kml)$/i.test(new URL(canonical).pathname)) {
		canonicalIssue = `asset canonical: ${canonical}`;
	}

	return {
		path,
		status: response.status,
		title,
		description,
		h1s,
		canonical,
		canonicalIssue,
		markerCounts,
		liveRefs,
		localRefs,
		styleAttrs,
		styleTags,
		bytes: html.length,
	};
}

async function checkImages(paths) {
	const failures = [];
	for (const path of paths.filter((item) => !/\.(xml|kml)$/i.test(item))) {
		const response = await fetchText(`${stagingOrigin}${path}`);
		if (response.status >= 400 || !/<html/i.test(response.text)) continue;

		const srcs = [...response.text.matchAll(/<img\b[^>]*\ssrc=["']([^"']+)["']/gi)]
			.map((match) => match[1])
			.filter(Boolean);
		for (const src of srcs) {
			if (/^data:/.test(src)) continue;
			const url = new URL(src, `${stagingOrigin}${path}`);
			if (url.origin !== stagingOrigin) continue;
			const imageResponse = await fetch(url, { method: "HEAD" });
			if (imageResponse.status >= 400) {
				failures.push({ page: path, src: url.pathname, status: imageResponse.status });
			}
		}
	}
	return failures;
}

async function testInteractions() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	const checks = [];

	for (const path of [
		"/",
		"/audiology-services-hearing-aid-fittings/",
		"/hearing-aids-resound/",
		"/audiologist/dr-danielle-jenkins/",
		"/hearing-aids-for-tinnitus/",
	]) {
		await page.goto(`${stagingOrigin}${path}`, { waitUntil: "networkidle", timeout: 60000 });
		const result = await page.evaluate(() => {
			const button = document.querySelector(".local-single-sidebar-accordion-summary, .e-n-accordion-item-title");
			let accordionOk = null;
			if (button) {
				const before = button.getAttribute("aria-expanded");
				button.click();
				const after = button.getAttribute("aria-expanded");
				accordionOk = before !== after || after === "true";
			}
			const brokenImages = [...document.images]
				.filter((image) => image.complete && image.naturalWidth === 0)
				.map((image) => image.getAttribute("src"))
				.slice(0, 5);
			return {
				accordionOk,
				brokenImages,
				h1: document.querySelector("h1")?.textContent?.trim() || "",
			};
		});
		checks.push({ path, ...result });
	}

	await browser.close();
	return checks;
}

async function testForm() {
	const uniqueEmail = `codex-qa-${Date.now()}@bidviewmarketing.com`;
	const payload = {
		name: "Codex QA",
		email: uniqueEmail,
		phone: "919-505-0894",
		message: "QA test submission from staging audit.",
	};
	const response = await fetch(`${stagingOrigin}/api/contact`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});
	const body = await response.text();

	let d1Output = "";
	let d1Found = false;
	for (let attempt = 0; attempt < 8; attempt++) {
		try {
			const sql = `SELECT name,email,phone,message FROM contact_submissions WHERE email='${uniqueEmail}' LIMIT 1;`;
			d1Output = execSync(
				`npx wrangler d1 execute raleighhearingandtinnituscenter-staging-db --remote --json --command "${sql}"`,
				{ cwd: process.cwd(), encoding: "utf8" },
			);
			const rows = JSON.parse(d1Output)?.[0]?.results || [];
			d1Found = rows.some((row) => row.email === uniqueEmail);
			if (d1Found) break;
		} catch (error) {
			d1Output = error.message;
		}
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	return {
		status: response.status,
		body,
		email: uniqueEmail,
		d1Found,
	};
}

async function main() {
	const live = await crawlSitemaps(liveOrigin);
	const staging = await crawlSitemaps(stagingOrigin);
	const liveSet = new Set(live.paths);
	const stagingSet = new Set(staging.paths);
	const missing = live.paths.filter((path) => !stagingSet.has(path));
	const extra = staging.paths.filter((path) => !liveSet.has(path));
	const auditPaths = [...new Set([...staging.paths, ...missing])]
		.filter((path) => !/\.(xml|kml)$/i.test(path))
		.sort();
	const audits = [];
	for (const path of auditPaths) audits.push(await auditPage(path));

	const sitemapDirect = await Promise.all(
		["/sitemap.xml", "/sitemap_index.xml", "/page-sitemap.xml", "/post-sitemap.xml", "/local-sitemap.xml", "/robots.txt", "/locations.kml"].map(
			async (path) => {
				try {
					const response = await fetchText(`${stagingOrigin}${path}`);
					return {
						path,
						status: response.status,
						type: response.contentType,
						start: response.text.slice(0, 120).replace(/\s+/g, " "),
					};
				} catch (error) {
					return { path, error: error.message };
				}
			},
		),
	);

	const summary = {
		liveSitemaps: live.sitemapStatus,
		stagingSitemaps: staging.sitemapStatus,
		liveCount: live.paths.length,
		stagingCount: staging.paths.length,
		missing,
		extra,
		badStatuses: audits.filter((audit) => audit.status < 200 || audit.status >= 400),
		canonicalIssues: audits.filter((audit) => audit.canonicalIssue),
		markerIssues: audits.filter((audit) => inlineMarkers.some((marker) => audit.markerCounts?.[marker])),
		liveRefIssues: audits.filter((audit) => audit.liveRefs || audit.localRefs),
		metaIssues: audits.filter((audit) => !audit.nonHtml && (!audit.title || !audit.description || audit.h1s.length !== 1)),
		sitemapDirect,
		imageFailures: await checkImages(staging.paths),
		interactions: await testInteractions(),
		form: await testForm(),
	};

	console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
