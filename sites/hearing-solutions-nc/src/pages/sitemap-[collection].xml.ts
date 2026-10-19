// EmDash's per-collection sitemaps list records without their own page, so
// they're switched off: everything is in /sitemap.xml.
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () => new Response("Not found", { status: 404 });
