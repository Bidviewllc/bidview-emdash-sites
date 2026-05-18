export async function GET({ request }) {
  const origin = new URL(request.url).origin;
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <sitemap><loc>${new URL("/sitemap.xml", origin).href}</loc></sitemap>`,
    '</sitemapindex>',
    ''
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
