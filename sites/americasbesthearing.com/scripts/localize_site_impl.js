const fs = require('fs');
const path = require('path');
const { load } = require('cheerio');

const ROOT = process.cwd();
const SCRAPED = path.join(ROOT, 'scraped-html');
const LOCAL = path.join(ROOT, 'local-site');
const PARTIALS = path.join(ROOT, 'partials');
const ASSET_PARTIALS = path.join(LOCAL, 'assets', 'partials');
const SITE_SCRIPT_SOURCE = path.join(ROOT, 'scripts', 'site.js');
const SITE_SCRIPT_TARGET = path.join(LOCAL, 'assets', 'site.js');
const MANIFEST_PATH = path.join(SCRAPED, 'manifest.json');
const EXPORT_MANIFEST_PATH = path.join(LOCAL, 'export-manifest.json');
const REPORT_PATH = path.join(LOCAL, 'localize-report.json');
const SUPPORT_DIRS = ['assets', 'wp-includes'];
const ASSET_VERSION = '20260513-static-v1';

const preserveExistingSupportDirs = process.argv.includes('--preserve-existing-support-dirs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/');
}

function isExternalUrl(value) {
  return /^(?:[a-z]+:)?\/\//i.test(value);
}

function withVersionQuery(value) {
  if (!value || isExternalUrl(value) || value.startsWith('data:')) return value;
  if (/[?&]v=/.test(value)) return value;
  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}v=${ASSET_VERSION}`;
}

function toLocalPageHref(pageUrl, currentOutputFile) {
  const relative = normalizeSlashes(path.relative(path.dirname(currentOutputFile), pagePathFromLiveUrl(pageUrl)));
  return relative || '.';
}

function pagePathFromLiveUrl(pageUrl) {
  const url = new URL(pageUrl);
  let pathname = url.pathname || '/';
  if (pathname.endsWith('/') && pathname !== '/') pathname = pathname.slice(0, -1);
  if (pathname === '/') return path.join(LOCAL, 'index.html');
  return path.join(LOCAL, pathname.replace(/^\/+/, ''), 'index.html');
}

function assetPathFromLiveUrl(assetUrl) {
  const url = new URL(assetUrl);
  let pathname = url.pathname || '/';
  pathname = pathname.replace(/^\/+/, '');
  if (pathname.startsWith('wp-content/uploads/')) {
    return path.join(LOCAL, 'assets', 'media', path.basename(pathname));
  }
  if (pathname.startsWith('wp-content/plugins/astro/assets/')) {
    return path.join(LOCAL, 'assets', pathname.replace(/^wp-content\/plugins\/astro\/assets\//, ''));
  }
  if (pathname.startsWith('wp-content/plugins/astro-pro/assets/')) {
    return path.join(LOCAL, 'assets', pathname.replace(/^wp-content\/plugins\/astro-pro\/assets\//, ''));
  }
  if (pathname.startsWith('wp-includes/')) {
    return path.join(LOCAL, pathname);
  }
  return null;
}

function mapLiveSiteUrl(rawUrl, currentOutputFile) {
  const normalized = rawUrl.replace(/\\\//g, '/');

  try {
    const url = new URL(normalized);
    const pathname = url.pathname || '/';

    if (pathname.startsWith('/wp-admin/') || pathname.startsWith('/wp-json/')) {
      return '';
    }

    if (
      pathname === '/' ||
      (!path.extname(pathname) && !pathname.startsWith('/wp-content/') && !pathname.startsWith('/wp-includes/'))
    ) {
      return toLocalPageHref(normalized, currentOutputFile);
    }

    const assetPath = assetPathFromLiveUrl(normalized);
    if (assetPath) {
      return normalizeSlashes(path.relative(path.dirname(currentOutputFile), assetPath));
    }
  } catch {
    return rawUrl;
  }

  return '';
}

function rewriteLiveSiteUrls(raw, currentOutputFile) {
  return raw.replace(/https?:\\?\/\\?\/(?:www\\?\.)?americasbesthearing\.com(?:\\?\/[^\s"'<>\\]*)?/gi, (match) => {
    const replacement = mapLiveSiteUrl(match, currentOutputFile);
    return replacement ? replacement.replace(/\//g, match.includes('\\/') ? '\\/' : '/') : '';
  });
}

function rootRelativePath(href) {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//')
  ) {
    return null;
  }

  const withoutHash = trimmed.split('#')[0].split('?')[0];
  if (!withoutHash) return null;

  if (withoutHash.startsWith('./')) return withoutHash.slice(2);
  if (withoutHash.startsWith('/')) return withoutHash.slice(1);
  return withoutHash;
}

function currentOutputFileForSource(sourceFile) {
  return path.join(LOCAL, ...sourceFile.split('/'));
}

function relativeHref(currentOutputFile, rootRelative) {
  const target = path.join(LOCAL, ...rootRelative.split('/'));
  return normalizeSlashes(path.relative(path.dirname(currentOutputFile), target)) || '.';
}

function rebaseFragment(fragmentHtml, sourceFile, options = {}) {
  const currentOutputFile = currentOutputFileForSource(sourceFile);
  const $ = load(fragmentHtml, { decodeEntities: false });
  const currentSource = normalizeSlashes(sourceFile);

  $('[href]').each((_, element) => {
    const href = $(element).attr('href');
    const rootPath = rootRelativePath(href);
    if (!rootPath) return;

    $(element).attr('href', relativeHref(currentOutputFile, rootPath));

    if (options.decorateActiveNav && rootPath === currentSource) {
      $(element).attr('aria-current', 'page');

      const classNames = new Set(($(element).attr('class') || '').split(/\s+/).filter(Boolean));
      if (classNames.has('astro-item')) classNames.add('astro-item-active');
      if (classNames.has('astro-sub-item')) classNames.add('astro-sub-item-active');
      $(element).attr('class', [...classNames].join(' '));

      const parentLi = $(element).closest('li');
      if (parentLi.length) {
        const parentClasses = new Set((parentLi.attr('class') || '').split(/\s+/).filter(Boolean));
        parentClasses.add('current-menu-item');
        parentClasses.add('current_page_item');
        parentLi.attr('class', [...parentClasses].join(' '));
      }

      $(element).parents('li').each((__, li) => {
        const liClasses = new Set(($(li).attr('class') || '').split(/\s+/).filter(Boolean));
        liClasses.add('current-menu-ancestor');
        liClasses.add('current-menu-parent');
        liClasses.add('current-page-ancestor');
        $(li).attr('class', [...liClasses].join(' '));
      });
    }
  });

  $('[src]').each((_, element) => {
    const src = $(element).attr('src');
    const rootPath = rootRelativePath(src);
    if (!rootPath) return;
    $(element).attr('src', relativeHref(currentOutputFile, rootPath));
  });

  $('[poster]').each((_, element) => {
    const poster = $(element).attr('poster');
    const rootPath = rootRelativePath(poster);
    if (!rootPath) return;
    $(element).attr('poster', relativeHref(currentOutputFile, rootPath));
  });

  $('[srcset]').each((_, element) => {
    const srcset = $(element).attr('srcset');
    if (!srcset) return;

    const rebound = srcset
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const bits = part.split(/\s+/);
        const rootPath = rootRelativePath(bits[0]);
        if (!rootPath) return part;
        bits[0] = relativeHref(currentOutputFile, rootPath);
        return bits.join(' ');
      })
      .join(', ');

    $(element).attr('srcset', rebound);
  });

  const bodyHtml = $('body').html();
  if (bodyHtml && bodyHtml.trim()) return bodyHtml;
  return $.root().html();
}

function extractPartialOrFallback(pageHtml, regex, label) {
  const match = pageHtml.match(regex);
  if (!match) {
    throw new Error(`Could not extract ${label} from fallback source page.`);
  }
  return `${match[0]}\n`;
}

function bootstrapPartialsIfMissing() {
  ensureDir(PARTIALS);

  const headerFile = path.join(PARTIALS, 'header.html');
  const footerFile = path.join(PARTIALS, 'footer.html');
  if (fs.existsSync(headerFile) && fs.existsSync(footerFile)) return;

  const manifest = readJson(MANIFEST_PATH);
  const homeEntry = manifest.pages.find((page) => page.sourceFile === 'index.html') || manifest.pages[0];
  const homeHtml = fs.readFileSync(path.join(SCRAPED, homeEntry.sourceFile), 'utf8');

  if (!fs.existsSync(headerFile)) {
    const header = extractPartialOrFallback(
      homeHtml,
      /<header\b[^>]*class=["'][^"']*astro-location-header[^"']*["'][\s\S]*?<\/header>/i,
      'header partial'
    );
    fs.writeFileSync(headerFile, header, 'utf8');
  }

  if (!fs.existsSync(footerFile)) {
    const footer = extractPartialOrFallback(
      homeHtml,
      /<footer\b[^>]*class=["'][^"']*astro-location-footer[^"']*["'][\s\S]*?<\/footer>/i,
      'footer partial'
    );
    fs.writeFileSync(footerFile, footer, 'utf8');
  }
}

function syncSupportDirs() {
  const copied = [];

  for (const dirName of SUPPORT_DIRS) {
    const sourceDir = path.join(SCRAPED, dirName);
    const targetDir = path.join(LOCAL, dirName);

    if (!fs.existsSync(sourceDir)) continue;
    if (preserveExistingSupportDirs && fs.existsSync(targetDir)) continue;

    ensureDir(path.dirname(targetDir));
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
    copied.push(dirName);
  }

  return copied;
}

function syncSiteScript() {
  if (!fs.existsSync(SITE_SCRIPT_SOURCE)) {
    throw new Error(`Missing site behavior source script: ${SITE_SCRIPT_SOURCE}`);
  }

  ensureDir(path.dirname(SITE_SCRIPT_TARGET));
  fs.copyFileSync(SITE_SCRIPT_SOURCE, SITE_SCRIPT_TARGET);
}

function replaceOrInjectSection(html, regex, replacement, openTagPattern, fallbackPosition) {
  if (regex.test(html)) {
    return html.replace(regex, replacement.trim());
  }

  if (fallbackPosition === 'after-body-open') {
    return html.replace(openTagPattern, (match) => `${match}${replacement}`);
  }

  if (fallbackPosition === 'before-body-close') {
    return html.replace(openTagPattern, `${replacement}$&`);
  }

  return html;
}

function sanitizeHeadAndScripts(html, currentOutputFile) {
  html = html.replace(/<noscript>\s*<iframe[^>]*src="https?:\/\/www\.googletagmanager\.com\/ns\.html[^"]*"[\s\S]*?<\/iframe>\s*<\/noscript>/gi, '');

  const $ = load(html, { decodeEntities: false });

  $('link[href*="googletagmanager.com"]').remove();
  $('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]').remove();
  $('script[src*="bugherd.com"], script[src*="kit.fontawesome.com"], script[src*="abh-static-fixes"]').remove();
  $('noscript iframe[src*="googletagmanager.com"]').closest('noscript').remove();

  $('script').each((_, element) => {
    const id = ($(element).attr('id') || '').toLowerCase();
    const src = ($(element).attr('src') || '').toLowerCase();
    const content = $(element).html() || '';

    const shouldRemove =
      src.includes('googletagmanager.com') ||
      src.includes('google-analytics.com') ||
      id.includes('google_gtagjs') ||
      /gtag\s*\(/i.test(content) ||
      /googletagmanager\.com/i.test(content) ||
      /GTM-[A-Z0-9]+/i.test(content);

    if (shouldRemove) {
      $(element).remove();
      return;
    }

    if (/americasbesthearing\.com/i.test(content)) {
      const homeHref = toLocalPageHref('https://americasbesthearing.com/', currentOutputFile);
      const rewrittenContent = rewriteLiveSiteUrls(
        content.replace(/https?:\/\/(?:www\.)?americasbesthearing\.com(?=["'\/\s}])/gi, homeHref),
        currentOutputFile
      );
      $(element).html(rewrittenContent);
    }
  });

  $('meta[content], link[href], [src], [srcset]').each((_, element) => {
    for (const attr of ['content', 'href', 'src']) {
      const value = $(element).attr(attr);
      if (!value || !/americasbesthearing\.com/i.test(value)) continue;
      $(element).attr(attr, mapLiveSiteUrl(value, currentOutputFile));
    }
  });

  $('link[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href || !/\.css(?:$|\?)/i.test(href)) return;
    $(element).attr('href', withVersionQuery(href));
  });

  $('script[src]').each((_, element) => {
    const src = $(element).attr('src');
    if (!src || !/\.js(?:$|\?)/i.test(src)) return;
    $(element).attr('src', withVersionQuery(src));
  });

  const siteScriptHref = withVersionQuery(
    normalizeSlashes(path.relative(path.dirname(currentOutputFile), SITE_SCRIPT_TARGET))
  );
  if (!$(`script[src^="${siteScriptHref.split('?')[0]}"]`).length) {
    $('body').append(`<script src="${siteScriptHref}"></script>`);
  }

  return $.html();
}

function buildPages() {
  const manifest = readJson(MANIFEST_PATH);
  const headerPartial = fs.readFileSync(path.join(PARTIALS, 'header.html'), 'utf8');
  const footerPartial = fs.readFileSync(path.join(PARTIALS, 'footer.html'), 'utf8');
  const pageOutputs = [];

  ensureDir(LOCAL);
  ensureDir(ASSET_PARTIALS);
  syncSiteScript();

  for (const page of manifest.pages) {
    const sourcePath = path.join(SCRAPED, page.sourceFile);
    const outputPath = path.join(LOCAL, page.sourceFile);
    const sourceDir = path.dirname(outputPath);

    ensureDir(sourceDir);

    let html = fs.readFileSync(sourcePath, 'utf8');
    const rebasedHeader = rebaseFragment(headerPartial, page.sourceFile, { decorateActiveNav: true });
    const rebasedFooter = rebaseFragment(footerPartial, page.sourceFile, { decorateActiveNav: false });

    html = replaceOrInjectSection(
      html,
      /<header\b[^>]*class=["'][^"']*astro-location-header[^"']*["'][\s\S]*?<\/header>/i,
      rebasedHeader,
      /<body\b[^>]*>/i,
      'after-body-open'
    );

    html = replaceOrInjectSection(
      html,
      /<footer\b[^>]*class=["'][^"']*astro-location-footer[^"']*["'][\s\S]*?<\/footer>/i,
      rebasedFooter,
      /<\/body>/i,
      'before-body-close'
    );

    html = sanitizeHeadAndScripts(html, outputPath);

    fs.writeFileSync(outputPath, html, 'utf8');
    pageOutputs.push({
      route: page.route,
      file: normalizeSlashes(page.sourceFile),
      source: `scraped-html/${normalizeSlashes(page.sourceFile)}`
    });
  }

  fs.writeFileSync(path.join(ASSET_PARTIALS, 'header.html'), `${headerPartial.trim()}\n`, 'utf8');
  fs.writeFileSync(path.join(ASSET_PARTIALS, 'footer.html'), `${footerPartial.trim()}\n`, 'utf8');

  return pageOutputs;
}

function scanOutputForDependencies(pageOutputs) {
  const findings = {
    liveDomainRefs: [],
    wpContentRefs: [],
    elementorRefs: [],
    trackingRefs: []
  };

  const checks = [
    ['liveDomainRefs', /https?:\/\/(?:www\.)?americasbesthearing\.com/gi],
    ['wpContentRefs', /\/wp-content\//gi],
    ['elementorRefs', /\belementor\b/gi],
    ['trackingRefs', /(googletagmanager|google-analytics|gtag\(|facebook\.net|hotjar)/gi]
  ];

  for (const page of pageOutputs) {
    const html = fs.readFileSync(path.join(LOCAL, page.file), 'utf8');
    for (const [key, regex] of checks) {
      const matches = html.match(regex);
      if (matches && matches.length) {
        findings[key].push({
          file: page.file,
          count: matches.length
        });
      }
    }
  }

  return findings;
}

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error('scraped-html/manifest.json was not found.');
  }

  bootstrapPartialsIfMissing();
  const copiedSupportDirs = syncSupportDirs();
  const pageOutputs = buildPages();

  const exportManifest = {
    generatedAt: new Date().toISOString(),
    pageCount: pageOutputs.length,
    pages: pageOutputs
  };
  writeJson(EXPORT_MANIFEST_PATH, exportManifest);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceManifest: normalizeSlashes(path.relative(ROOT, MANIFEST_PATH)),
    pageCount: pageOutputs.length,
    copiedSupportDirs,
    partials: {
      source: ['partials/header.html', 'partials/footer.html'],
      generated: ['local-site/assets/partials/header.html', 'local-site/assets/partials/footer.html']
    },
    dependencyScan: scanOutputForDependencies(pageOutputs)
  };
  writeJson(REPORT_PATH, report);

  console.log(
    JSON.stringify(
      {
        ok: true,
        pageCount: pageOutputs.length,
        exportManifest: normalizeSlashes(path.relative(ROOT, EXPORT_MANIFEST_PATH)),
        report: normalizeSlashes(path.relative(ROOT, REPORT_PATH)),
        copiedSupportDirs
      },
      null,
      2
    )
  );
}

main();
