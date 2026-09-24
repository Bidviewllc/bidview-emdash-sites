// Redirects the old WordPress site answered with (Rank Math), carried over at the
// 2026-09-24 switch to this Astro build. Each pair was read from WordPress itself,
// bypassing its page cache, so it is the rule WordPress actually had, not a guess.
// Old URLs WordPress answered with 404 are deliberately NOT here.
//
// Keys are paths WITH a trailing slash (or a file name); lookup tolerates a
// missing slash. Query strings are kept on the redirect.
export const LEGACY_REDIRECTS: ReadonlyMap<string, string> = new Map([
  ["/audiologist-marketing-services/", "/audiology-marketing/audiology-lead-gen/"],
  ["/audiologist-marketing-services/lead-generation/", "/audiology-marketing/audiology-lead-gen/"],
  ["/audiologist-marketing-services/ppc/", "/audiology-marketing/audiology-ppc/"],
  ["/audiologist-marketing-services/reputation-management/", "/audiology-marketing-services/audiology-reputation-management/"],
  ["/audiologist-marketing-services/seo/", "/audiology-marketing/audiology-seo/"],
  ["/audiologist-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/audiologist-marketing-services/website-design/", "/audiology-marketing/audiology-website-design/"],
  ["/contact/", "/contact-us/"],
  ["/cosmetic-healthcare-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/dental-marketing-services/lead-generation/", "/audiology-marketing/audiology-lead-gen/"],
  ["/dental-marketing-services/ppc/", "/audiology-marketing/audiology-ppc/"],
  ["/dental-marketing-services/reputation-management/", "/audiology-marketing-services/audiology-reputation-management/"],
  ["/dental-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/dermatology-marketing-services/lead-generation/", "/audiology-marketing/audiology-lead-gen/"],
  ["/dermatology-marketing-services/ppc/", "/audiology-marketing/audiology-ppc/"],
  ["/dermatology-marketing-services/reputation-management/", "/audiology-marketing-services/audiology-reputation-management/"],
  ["/dermatology-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/healthcare-marketing-services/reputation-management/", "/audiology-marketing-services/audiology-reputation-management/"],
  ["/medical-spa-marketing-services/lead-generation/", "/audiology-marketing/audiology-lead-gen/"],
  ["/medical-spa-marketing-services/ppc/", "/audiology-marketing/audiology-ppc/"],
  ["/medical-spa-marketing-services/reputation-management/", "/audiology-marketing-services/audiology-reputation-management/"],
  ["/medical-spa-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/optometry-marketing-services/lead-generation/", "/audiology-marketing/audiology-lead-gen/"],
  ["/optometry-marketing-services/ppc/", "/audiology-marketing/audiology-ppc/"],
  ["/optometry-marketing-services/reputation-management/", "/audiology-marketing-services/audiology-reputation-management/"],
  ["/optometry-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/pediatrics-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/podiatry-marketing-services/reputation-management/", "/audiology-marketing-services/audiology-reputation-management/"],
  ["/podiatry-marketing-services/social-media-marketing/", "/audiology-marketing-services/audiology-social-media/"],
  ["/sitemap_index.xml", "/sitemap.xml"],
]);

export function legacyRedirect(url: URL): Response | null {
  const p = url.pathname;
  const to = LEGACY_REDIRECTS.get(p) ?? (p.endsWith("/") ? undefined : LEGACY_REDIRECTS.get(p + "/"));
  if (!to) return null;
  return new Response(null, { status: 301, headers: { Location: to + url.search } });
}
