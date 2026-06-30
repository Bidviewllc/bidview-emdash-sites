import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

type CollectionName =
  | "services"
  | "hearing_aid_brands"
  | "utility_pages"
  | "blog_posts"
  | "staff_profile_pages"
  | "about_page"
  | "contact_page"
  | "schedule_appointment_page";

type SitemapItem = {
  route: string;
  lastmod?: string;
};

const COLLECTIONS: CollectionName[] = [
  "about_page",
  "contact_page",
  "schedule_appointment_page",
  "services",
  "hearing_aid_brands",
  "utility_pages",
  "staff_profile_pages",
  "blog_posts",
];

const STATIC_ROUTES: SitemapItem[] = [
  { route: "/" },
  { route: "/blog/" },
];

function normalizeRoute(route: unknown) {
  const clean = String(route ?? "").replace(/^\/+|\/+$/g, "");
  return clean ? `/${clean}/` : "/";
}

function fallbackRoute(collection: CollectionName, id: string) {
  if (collection === "about_page") return "/about/";
  if (collection === "contact_page") return "/contact/";
  if (collection === "schedule_appointment_page") return "/schedule-appointment/";
  return `/${id.replace(/__/g, "/")}/`;
}

function lastModified(entry: unknown) {
  if (!entry || typeof entry !== "object") return undefined;
  const record = entry as Record<string, unknown>;
  const data = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
  const raw = record.updatedAt ?? record.updated_at ?? record.publishedAt ?? record.published_at ?? data.updated_at ?? data.published_at;
  if (!raw) return undefined;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlForRoute(origin: string, route: string) {
  return new URL(normalizeRoute(route), origin).toString();
}

async function collectionSitemapItems(collection: CollectionName): Promise<SitemapItem[]> {
  const { entries } = await getEmDashCollection(collection, {
    status: "published",
  });

  return entries.map((entry) => ({
    route: normalizeRoute(entry.data.route ?? fallbackRoute(collection, entry.id)),
    lastmod: lastModified(entry),
  }));
}

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const items = new Map<string, SitemapItem>();

  for (const item of STATIC_ROUTES) {
    items.set(normalizeRoute(item.route), item);
  }

  const collectionItems = await Promise.all(COLLECTIONS.map(collectionSitemapItems));
  for (const item of collectionItems.flat()) {
    const route = normalizeRoute(item.route);
    items.set(route, { route, lastmod: item.lastmod });
  }

  const urls = [...items.values()]
    .sort((a, b) => a.route.localeCompare(b.route))
    .map((item) => {
      const loc = xmlEscape(urlForRoute(origin, item.route));
      const lastmod = item.lastmod ? `\n    <lastmod>${xmlEscape(item.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
