export async function GET({ request }) {
  const origin = new URL(request.url).origin;
  const body = [
    "User-agent: *",
    "Disallow: /_emdash/",
    "Disallow: /wp-admin/",
    "Allow: /wp-admin/admin-ajax.php",
    "",
    `Sitemap: ${new URL("/sitemap.xml", origin).href}`,
    ""
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
