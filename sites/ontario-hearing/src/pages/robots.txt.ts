import type { APIRoute } from "astro";

// Built once at deploy time and served as a file. As a live route it ran the whole page stack on every cache miss,
// and 57% of robots/sitemap requests were abandoned after ~10s (Worker logs, 2026-10-30..11-05).
export const prerender = true;


const SITE = "https://ontariohearing.com";

export const GET: APIRoute = async () => {
  const txt = `User-agent: *
Allow: /

Disallow: /_emdash/
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`;
  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
