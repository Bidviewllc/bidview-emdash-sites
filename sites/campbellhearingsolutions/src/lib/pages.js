import { getEmDashEntry } from "emdash";
import pages from "../data/pages.json";

const trimSlashes = (value = "") => value.replace(new RegExp("^/+|/+$", "g"), "");

export const normalizeRoute = (route = "") => {
  if (!route || route === "/") return "/";
  return `/${trimSlashes(route)}/`;
};

const byRoute = new Map(pages.map((page) => [normalizeRoute(page.route), page]));

const readString = (data, key, fallback = "") => (typeof data?.[key] === "string" ? data[key] : fallback);
const readArray = (data, key, fallback = []) => (Array.isArray(data?.[key]) ? data[key] : fallback);

const hydrateFromEmDash = (fallback, data) => ({
  ...fallback,
  title: readString(data, "seo_title", readString(data, "title", fallback.title)),
  description: readString(data, "meta_description", fallback.description),
  canonical: readString(data, "canonical", fallback.canonical),
  robots: readString(data, "robots", fallback.robots),
  bodyClass: readString(data, "body_class", fallback.bodyClass),
  stylesheets: readArray(data, "stylesheets", fallback.stylesheets),
  seoHeadHtml: readString(data, "seo_head_html", fallback.seoHeadHtml),
  headHtml: readString(data, "head_html", fallback.headHtml),
  bodyHtml: readString(data, "body_html", fallback.bodyHtml),
  contentType: readString(data, "content_type", fallback.contentType),
  sourceFile: readString(data, "source_file", fallback.sourceFile)
});

export const allPages = pages;

export function getStaticPageByRoute(route) {
  return byRoute.get(normalizeRoute(route)) ?? null;
}

export async function getPageByRoute(route) {
  const fallback = getStaticPageByRoute(route);
  if (!fallback) return null;

  try {
    const { entry, error } = await getEmDashEntry(fallback.collection, fallback.slug);
    if (!error && entry?.data) {
      return hydrateFromEmDash(fallback, entry.data);
    }
  } catch {
    // The local backend may not be set up yet. Keep the frontend usable from the generated data mirror.
  }

  return fallback;
}
