import type { APIRoute } from "astro";

const SITE = "https://ontariohearing.com";

export const GET: APIRoute = async () => {
  const txt = `User-agent: *
Allow: /

Disallow: /_emdash/
Disallow: /404
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
