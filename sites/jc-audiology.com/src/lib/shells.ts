const shellModules = import.meta.glob("../shells/pages/**/index.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const STAFF_CAROUSEL_TOKEN = "<!-- ASTRO_DYNAMIC_STAFF_CAROUSEL -->";
export const OFFICE_INFO_TOKEN_PREFIX = "<!-- ASTRO_DYNAMIC_OFFICE_INFO:";
export const OFFICE_INFO_TOKEN_PATTERN = /<!-- ASTRO_DYNAMIC_OFFICE_INFO:([a-z0-9-]+)(?::([^>]+))? -->/g;
export const SHARED_CTA_TOKEN_PATTERN = /<!-- ASTRO_DYNAMIC_SHARED_CTA:([a-z]+):([a-z0-9-]+)(?::([^>]+))? -->/g;
export const SERVICE_BODY_TOKEN = "<!-- ASTRO_DYNAMIC_SERVICE_BODY -->";
export const BLOG_BODY_TOKEN = "<!-- ASTRO_DYNAMIC_BLOG_BODY -->";
export const BLOG_POSTS_TOKEN_PATTERN = /<!-- ASTRO_DYNAMIC_BLOG_POSTS:(home|listing) -->/g;
export const BLOG_FEATURED_IMAGE_TOKEN = "<!-- ASTRO_DYNAMIC_BLOG_FEATURED_IMAGE -->";
export const BLOG_POST_INFO_TOKEN = "<!-- ASTRO_DYNAMIC_BLOG_POST_INFO -->";
export const HOME_HERO_TOKEN = "<!-- ASTRO_DYNAMIC_HOME_HERO -->";
export const HOME_INTRO_TOKEN = "<!-- ASTRO_DYNAMIC_HOME_INTRO -->";
export const HOME_TRUST_BADGES_TOKEN = "<!-- ASTRO_DYNAMIC_HOME_TRUST_BADGES -->";
export const HOME_TESTIMONIALS_TOKEN = "<!-- ASTRO_DYNAMIC_HOME_TESTIMONIALS -->";
export const HOME_FAQ_TOKEN = "<!-- ASTRO_DYNAMIC_HOME_FAQ -->";
export const STAFF_PROFILE_INTRO_TOKEN = "<!-- ASTRO_DYNAMIC_STAFF_PROFILE_INTRO -->";
export const ABOUT_PAGE_MAIN_TOKEN = "<!-- ASTRO_DYNAMIC_ABOUT_PAGE_MAIN -->";
export const CONTACT_PAGE_INFO_TOKEN = "<!-- ASTRO_DYNAMIC_CONTACT_PAGE_INFO -->";
export const SCHEDULE_APPOINTMENT_EMBED_TOKEN = "<!-- ASTRO_DYNAMIC_SCHEDULE_APPOINTMENT_EMBED -->";

function officeInfoToken(sectionId: string, sourceSection?: string): string {
  return `${OFFICE_INFO_TOKEN_PREFIX}${sectionId}${sourceSection ? `:${sourceSection}` : ""} -->`;
}

function sharedCtaToken(band: "services" | "hearing", sectionId: string, sourceSection?: string): string {
  return `<!-- ASTRO_DYNAMIC_SHARED_CTA:${band}:${sectionId}${sourceSection ? `:${sourceSection}` : ""} -->`;
}

export type ShellPage = {
  route: string;
  contentCollection?: "utility_pages" | "hearing_aid_brands";
  headHtml: string;
  bodyClass: string;
  deviceMode: string;
  preHeaderHtml: string;
  contentHtml: string;
  tailHtml: string;
  staffCarouselSectionId?: string;
  staffCarouselSourceSection?: string;
};

const pagesByRoute = new Map<string, ShellPage>();

function normalizeRoute(route: string): string {
  let clean = route.trim();
  if (!clean || clean === "/" || clean === "index" || clean === "index.html" || clean === "/index.html") return "/";
  clean = clean.replace(/^\/+/, "").replace(/\/+$/, "");
  clean = clean.replace(/\/index\.html$/, "");
  return `/${clean}/`;
}

function routeFromModulePath(modulePath: string): string {
  const marker = "../shells/pages/";
  const start = modulePath.indexOf(marker);
  const relative = start >= 0 ? modulePath.slice(start + marker.length) : modulePath;
  const route = relative === "index.html" ? "/" : relative.replace(/\/index\.html$/, "");
  return normalizeRoute(route === "index" ? "/" : route);
}

function extractBetween(source: string, startPattern: RegExp, end: string): string {
  const startMatch = source.match(startPattern);
  if (!startMatch || startMatch.index == null) return "";
  const start = startMatch.index + startMatch[0].length;
  const endIndex = source.indexOf(end, start);
  if (endIndex < 0) return "";
  return source.slice(start, endIndex);
}

function replaceBalancedDivByClass(source: string, className: string, replacement: string): { html: string; replaced: boolean } {
  const classIndex = source.indexOf(className);
  if (classIndex < 0) return { html: source, replaced: false };

  const divStart = source.lastIndexOf("<div", classIndex);
  if (divStart < 0) return { html: source, replaced: false };

  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = divStart;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(source))) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return {
          html: source.slice(0, divStart) + replacement + source.slice(tagPattern.lastIndex),
          replaced: true,
        };
      }
    } else {
      depth += 1;
    }
  }

  return { html: source, replaced: false };
}

function applyDynamicSections(route: string, contentHtml: string): Pick<ShellPage, "contentHtml" | "staffCarouselSectionId" | "staffCarouselSourceSection"> {
  let nextHtml = contentHtml;

  if (route === "/") {
    const heroReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-b99d118", HOME_HERO_TOKEN);
    nextHtml = heroReplaced.html;
    const officeReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-a14cb86", officeInfoToken("a14cb86"));
    nextHtml = officeReplaced.html;
    const replaced = replaceBalancedDivByClass(nextHtml, "astro-element-e6fd213", STAFF_CAROUSEL_TOKEN);
    nextHtml = replaced.html;
    const introReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-fe208ad", HOME_INTRO_TOKEN);
    nextHtml = introReplaced.html;
    const badgesReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-d11824d", HOME_TRUST_BADGES_TOKEN);
    nextHtml = badgesReplaced.html;
    const servicesReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-bbd51ae", sharedCtaToken("services", "bbd51ae"));
    nextHtml = servicesReplaced.html;
    const hearingReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-b5283fc", sharedCtaToken("hearing", "b5283fc"));
    nextHtml = hearingReplaced.html;
    const testimonialsReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-bb317b2", HOME_TESTIMONIALS_TOKEN);
    nextHtml = testimonialsReplaced.html;
    const blogPostsReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-f92922c", "<!-- ASTRO_DYNAMIC_BLOG_POSTS:home -->");
    nextHtml = blogPostsReplaced.html;
    const faqReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-4cee412", HOME_FAQ_TOKEN);
    return { contentHtml: faqReplaced.html, staffCarouselSectionId: replaced.replaced ? "e6fd213" : undefined };
  }

  if (route === "/about/") {
    const mainReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-9e5204b", ABOUT_PAGE_MAIN_TOKEN);
    nextHtml = mainReplaced.html;
    const officeReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-8693da8", officeInfoToken("8693da8", "homepage:a14cb86"));
    nextHtml = officeReplaced.html;
    const replaced = replaceBalancedDivByClass(nextHtml, "astro-element-b04feb3", STAFF_CAROUSEL_TOKEN);
    return {
      contentHtml: replaced.html,
      staffCarouselSectionId: replaced.replaced ? "b04feb3" : undefined,
      staffCarouselSourceSection: replaced.replaced ? "homepage:e6fd213" : undefined,
    };
  }

  if (
    route === "/judith-l-reese-ph-d/" ||
    route === "/ryan-nurge-has/" ||
    route === "/charlie-reese/" ||
    route === "/graciela-wentz/"
  ) {
    const introReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-75a11d3", STAFF_PROFILE_INTRO_TOKEN);
    nextHtml = introReplaced.html;
    const officeReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-4b41eeb", officeInfoToken("4b41eeb", "homepage:a14cb86"));
    nextHtml = officeReplaced.html;
    const servicesCtaReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-b77ad45", sharedCtaToken("services", "b77ad45", "homepage:bbd51ae"));
    nextHtml = servicesCtaReplaced.html;
    const hearingCtaReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-f757fb5", sharedCtaToken("hearing", "f757fb5", "homepage:b5283fc"));
    nextHtml = hearingCtaReplaced.html;
  }

  if (route === "/contact/") {
    const contactInfoReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-3d6215e", CONTACT_PAGE_INFO_TOKEN);
    nextHtml = contactInfoReplaced.html;
  }

  if (route === "/schedule-appointment/") {
    const scheduleEmbedReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-eadc933", SCHEDULE_APPOINTMENT_EMBED_TOKEN);
    nextHtml = scheduleEmbedReplaced.html;
  }

  if (route.startsWith("/audiology-services/") || route === "/custom-hearing-protection/" || route.startsWith("/hearing-aids-products/") || route === "/resources/insurance/" || route === "/privacy-policy/" || route === "/terms-of-service/" || route.startsWith("/hearing-aids/")) {
    const bodyReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-69dc79d", SERVICE_BODY_TOKEN);
    nextHtml = bodyReplaced.html;
  }

  if (route === "/blog/") {
    const blogPostsReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-55af06c", "<!-- ASTRO_DYNAMIC_BLOG_POSTS:listing -->");
    nextHtml = blogPostsReplaced.html;
  }

  if (["/crackling-in-ear/", "/hearing-aids-for-tinnitus/", "/hearing-test-online-helpful-or-risky/", "/in-the-canal-hearing-aids-a-practical-guide/", "/rechargeable-hearing-aids/", "/swimmers-ear-causes-symptoms-treatment-prevention/"].includes(route)) {
    const infoReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-962d9b9", BLOG_POST_INFO_TOKEN);
    nextHtml = infoReplaced.html;
    const imageReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-7378d4f", BLOG_FEATURED_IMAGE_TOKEN);
    nextHtml = imageReplaced.html;
    const bodyReplaced = replaceBalancedDivByClass(nextHtml, "astro-element-273f23b", BLOG_BODY_TOKEN);
    nextHtml = bodyReplaced.html;
  }

  return { contentHtml: nextHtml };
}

function cacheBustLocalFixes(html: string): string {
  return html
    .replace(/local-fixes\.css(\?v=[^"'<]*)?/g, "local-fixes.css?v=homepage-fields-20260521-1")
    .replace(/local-fixes\.js(\?v=[^"'<]*)?/g, "local-fixes.js?v=homepage-fields-20260521-1");
}

function extractPage(route: string, html: string): ShellPage {
  const headHtml = cacheBustLocalFixes(extractBetween(html, /<head[^>]*>/i, "</head>"));
  const bodyOpen = html.match(/<body\b([^>]*)>/i);
  const bodyAttrs = bodyOpen?.[1] ?? "";
  const bodyClass = bodyAttrs.match(/class=['\"]([^'\"]*)['\"]/i)?.[1] ?? "";
  const deviceMode = bodyAttrs.match(/data-astro-device-mode=['\"]([^'\"]*)['\"]/i)?.[1] ?? "desktop";
  const bodyHtml = extractBetween(html, /<body\b[^>]*>/i, "</body>");

  const headerStart = bodyHtml.indexOf("<header");
  const headerEnd = bodyHtml.indexOf("</header>", Math.max(headerStart, 0));
  const footerStart = bodyHtml.indexOf("<footer", headerEnd > -1 ? headerEnd : 0);
  const footerEnd = bodyHtml.indexOf("</footer>", Math.max(footerStart, 0));

  if (headerStart < 0 || headerEnd < 0 || footerStart < 0 || footerEnd < 0) {
    const dynamic = applyDynamicSections(route, bodyHtml);
    return {
      route,
      headHtml,
      bodyClass,
      deviceMode,
      preHeaderHtml: "",
      contentHtml: dynamic.contentHtml,
      tailHtml: "",
      staffCarouselSectionId: dynamic.staffCarouselSectionId,
      staffCarouselSourceSection: dynamic.staffCarouselSourceSection,
    };
  }

  const dynamic = applyDynamicSections(route, bodyHtml.slice(headerEnd + "</header>".length, footerStart));

  return {
    route,
    headHtml,
    bodyClass,
    deviceMode,
    preHeaderHtml: bodyHtml.slice(0, headerStart),
    contentHtml: dynamic.contentHtml,
    tailHtml: cacheBustLocalFixes(bodyHtml.slice(footerEnd + "</footer>".length)),
    staffCarouselSectionId: dynamic.staffCarouselSectionId,
    staffCarouselSourceSection: dynamic.staffCarouselSourceSection,
  };
}

for (const [modulePath, html] of Object.entries(shellModules)) {
  const route = routeFromModulePath(modulePath);
  pagesByRoute.set(route, extractPage(route, html));
}

export function getShellPage(route: string): ShellPage | undefined {
  return pagesByRoute.get(normalizeRoute(route));
}

export function createUtilityFallbackShell(route: string): ShellPage | undefined {
  const template = pagesByRoute.get("/privacy-policy/");
  if (!template) return undefined;

  return {
    ...template,
    route: normalizeRoute(route),
    contentCollection: "utility_pages",
  };
}

export function createHearingAidBrandFallbackShell(route: string): ShellPage | undefined {
  const template = pagesByRoute.get("/hearing-aids/phonak/");
  if (!template) return undefined;

  return {
    ...template,
    route: normalizeRoute(route),
    contentCollection: "hearing_aid_brands",
  };
}

export function listShellRoutes(): string[] {
  return [...pagesByRoute.keys()].sort();
}


