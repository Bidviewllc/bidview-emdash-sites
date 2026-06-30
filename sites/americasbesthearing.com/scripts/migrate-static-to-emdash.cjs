const fs = require('fs');
const path = require('path');
const { load } = require('cheerio');

const ROOT = process.cwd();
const LOCAL_SITE = path.join(ROOT, 'local-site');
const PUBLIC = path.join(ROOT, 'public');
const SRC = path.join(ROOT, 'src');
const RAW_DIR = path.join(SRC, 'components', 'raw-pages');
const PAGES_DIR = path.join(SRC, 'pages');
const MANIFEST = path.join(LOCAL_SITE, 'export-manifest.json');

const INTERNAL_ASSET_PREFIXES = ['assets/', './assets/', '../assets/', '../../assets/', '../../../assets/'];

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
	if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
	ensureDir(dir);
}

function normalizeSlashes(value) {
	return value.replace(/\\/g, '/');
}

function isExternal(value) {
	return /^(?:[a-z]+:)?\/\//i.test(value) || /^(mailto:|tel:|javascript:|data:|#)/i.test(value);
}

function routeFromFile(file) {
	if (file === 'index.html') return '/';
	return `/${file.replace(/\/index\.html$/, '')}/`;
}

function pageAstroPath(file) {
	if (file === 'index.html') return path.join(PAGES_DIR, 'index.astro');
	return path.join(PAGES_DIR, file.replace(/\.html$/, '.astro'));
}

function rawFileName(file) {
	return file.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/[\\/]/g, '__') || 'home';
}

function rewritePath(value, currentFile) {
	if (!value || isExternal(value)) return value;
	const [beforeHash, hash = ''] = value.split('#');
	const [pathname, query = ''] = beforeHash.split('?');
	if (!pathname) return value;

	const normalized = normalizeSlashes(pathname);
	if (INTERNAL_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
		const assetIndex = normalized.indexOf('assets/');
		const assetPath = normalized.slice(assetIndex);
		return `/${assetPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
	}

	if (/\.(css|js|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot|pdf|xml|kml|txt|json|map|mp4|webm|mp3|wav)$/i.test(normalized)) {
		return value;
	}

	const currentDir = currentFile === 'index.html' ? '' : path.posix.dirname(currentFile);
	let resolved = path.posix.normalize(path.posix.join('/', currentDir, normalized));
	if (resolved.endsWith('/')) resolved = `${resolved}index.html`;
	if (!path.posix.extname(resolved)) resolved = `${resolved}/index.html`;
	return `${routeFromFile(resolved.replace(/^\//, ''))}${hash ? `#${hash}` : ''}`;
}

function rewriteSrcset(value, currentFile) {
	if (!value) return value;
	return value
		.split(',')
		.map((part) => {
			const pieces = part.trim().split(/\s+/);
			if (!pieces[0]) return part;
			pieces[0] = rewritePath(pieces[0], currentFile);
			return pieces.join(' ');
		})
		.join(', ');
}

function rewriteFragmentHtml(html, currentFile) {
	const $ = load(html, { decodeEntities: false });

	$('[href]').each((_, element) => {
		$(element).attr('href', rewritePath($(element).attr('href'), currentFile));
	});
	$('[src]').each((_, element) => {
		$(element).attr('src', rewritePath($(element).attr('src'), currentFile));
	});
	$('[poster]').each((_, element) => {
		$(element).attr('poster', rewritePath($(element).attr('poster'), currentFile));
	});
	$('[srcset]').each((_, element) => {
		$(element).attr('srcset', rewriteSrcset($(element).attr('srcset'), currentFile));
	});
	$('[style]').each((_, element) => {
		const style = $(element).attr('style');
		if (!style) return;
		$(element).attr('style', style.replace(/url\((['"]?)([^'")]+)\1\)/gi, (_, quote, url) => `url(${quote}${rewritePath(url, currentFile)}${quote})`));
	});

	const body = $('body').html();
	return body && body.trim() ? body : $.root().html();
}

function removeGlobalShell($) {
	$('header.astro-location-header').remove();
	$('footer.astro-location-footer').remove();
	$('script[src*="/assets/site.js"], script[src*="assets/site.js"]').remove();
	$('script[src*="abh-static-fixes"]').remove();
}

function extractHead($, currentFile) {
	const title = ($('title').first().text() || 'America’s Best Hearing').trim();
	const description = ($('meta[name="description"]').attr('content') || '').trim();

	$('title, meta[name="description"], meta[charset], meta[name="viewport"], link[rel="profile"]').remove();
	$('script').remove();
	$('link[rel="alternate"]').remove();
	$('link[rel="shortlink"]').remove();
	$('meta[name="generator"], meta[name="google-site-verification"]').remove();

	let extraHead = $('head').html() || '';
	extraHead = rewriteFragmentHtml(extraHead, currentFile);
	return { title, description, extraHead };
}

function writeText(file, content) {
	ensureDir(path.dirname(file));
	fs.writeFileSync(file, content, 'utf8');
}

function astroString(value) {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildComponentRaw(name, sourceFile, currentFile) {
	const raw = fs.readFileSync(sourceFile, 'utf8');
	const rewritten = rewriteFragmentHtml(raw, currentFile);
	return `---\nimport html from \"./raw-pages/${name}.html?raw\";\n---\n\n<Fragment set:html={html} />\n`;
}

function main() {
	const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

	ensureDir(PUBLIC);
	if (fs.existsSync(path.join(LOCAL_SITE, 'assets'))) {
		fs.cpSync(path.join(LOCAL_SITE, 'assets'), path.join(PUBLIC, 'assets'), { recursive: true, force: true });
	}

	emptyDir(path.join(SRC, 'components'));
	emptyDir(PAGES_DIR);
	ensureDir(RAW_DIR);
	ensureDir(path.join(SRC, 'layouts'));
	ensureDir(path.join(SRC, 'utils'));

	const headerRaw = rewriteFragmentHtml(fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8'), 'index.html');
	const footerRaw = rewriteFragmentHtml(fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8'), 'index.html');
	writeText(path.join(SRC, 'components', 'raw-pages', 'header.html'), headerRaw);
	writeText(path.join(SRC, 'components', 'raw-pages', 'footer.html'), footerRaw);
	writeText(path.join(SRC, 'components', 'Header.astro'), buildComponentRaw('header', path.join(ROOT, 'partials', 'header.html'), 'index.html'));
	writeText(path.join(SRC, 'components', 'Footer.astro'), buildComponentRaw('footer', path.join(ROOT, 'partials', 'footer.html'), 'index.html'));

	writeText(path.join(SRC, 'layouts', 'Base.astro'), `---\nimport { EmDashHead, EmDashBodyStart, EmDashBodyEnd } from \"emdash/ui\";\nimport { createPublicPageContext } from \"emdash/page\";\nimport Header from \"../components/Header.astro\";\nimport Footer from \"../components/Footer.astro\";\n\ninterface Props {\n\ttitle: string;\n\tdescription?: string;\n\tcanonical?: string;\n\tbodyClass?: string;\n\textraHead?: string;\n}\n\nconst { title, description, canonical, bodyClass = \"\", extraHead = \"\" } = Astro.props;\nconst pageCtx = createPublicPageContext({\n\tAstro,\n\tkind: \"custom\",\n\tpageType: \"website\",\n\ttitle,\n\tpageTitle: title,\n\tdescription,\n\tcanonical,\n\tsiteName: \"America’s Best Hearing\",\n});\nif (Astro.cache?.enabled) Astro.cache.set(3600);\n---\n\n<!doctype html>\n<html lang=\"en-US\">\n\t<head>\n\t\t<meta charset=\"UTF-8\" />\n\t\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n\t\t<title>{title}</title>\n\t\t{description && <meta name=\"description\" content={description} />}\n\t\t{canonical && <link rel=\"canonical\" href={canonical} />}\n\t\t<Fragment set:html={extraHead} />\n\t\t<EmDashHead page={pageCtx} />\n\t</head>\n\t<body class={bodyClass}>\n\t\t<EmDashBodyStart page={pageCtx} />\n\t\t<Header />\n\t\t<main>\n\t\t\t<slot />\n\t\t</main>\n\t\t<Footer />\n\t\t<script is:inline src=\"/assets/site.js?v=20260513-static-v1\"></script>\n\t\t<EmDashBodyEnd page={pageCtx} />\n\t</body>\n</html>\n`);

	for (const page of manifest.pages) {
		if (page.file === 'locations.kml/index.html') continue;
		const sourcePath = path.join(LOCAL_SITE, page.file);
		const $ = load(fs.readFileSync(sourcePath, 'utf8'), { decodeEntities: false });
		const bodyClass = ($('body').attr('class') || '').trim();
		const { title, description, extraHead } = extractHead($, page.file);
		removeGlobalShell($);
		const pageHtml = rewriteFragmentHtml(($('body').html() || '').trim(), page.file);
		const name = rawFileName(page.file);
		writeText(path.join(RAW_DIR, `${name}.html`), pageHtml);

		const prefix = '../'.repeat(page.file.split('/').length);
		const importPath = `${prefix}layouts/Base.astro`;
		const rawImportPath = `${prefix}components/raw-pages/${name}.html?raw`;
		const astro = `---\nimport Base from \"${importPath}\";\nimport contentHtml from \"${rawImportPath}\";\n\nexport const cacheHint = 3600;\n---\n\n<Base title={${astroString(title)}} description={${astroString(description)}} bodyClass={${astroString(bodyClass)}} extraHead={${astroString(extraHead)}}>\n\t<Fragment set:html={contentHtml} />\n</Base>\n`;
		writeText(pageAstroPath(page.file), astro);
	}

	console.log(JSON.stringify({ ok: true, pages: manifest.pages.length - 1, output: 'src/pages', assets: 'public/assets' }, null, 2));
}

main();
