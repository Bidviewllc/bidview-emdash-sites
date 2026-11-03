// Dynamic sitemap.xml — generated from the known route list.
// If you add a new public page, list its slug here.

const SITE = 'https://duethearing.com';

const urls: Array<{ path: string; priority: number; changefreq: string; lastmod?: string }> = [
  { path: '/', priority: 1.0, changefreq: 'weekly', lastmod: '2026-10-06' },
  { path: '/audiologist/lori-halvorson/', priority: 0.9, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/audiologist/ann-benny-stephen/', priority: 0.9, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/audiologist/allison-may/', priority: 0.9, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/team/kristen-halvorson/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-07-09' },
  { path: '/team/rebecca-keller/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/team/rozanna-shambrook/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/team/gigi-anderson/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-07-09' },
  { path: '/team/susan-fink/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-07-29' },
  { path: '/team/kaylie-fuentes/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-07-09' },
  { path: '/team/kaleo/', priority: 0.5, changefreq: 'monthly', lastmod: '2026-07-09' },
  // Article template hidden until real content is ready.
  // { path: '/articles/how-hearing-loss-affects-cognition/', priority: 0.8, changefreq: 'monthly' },
  { path: '/ear-to-brain-evaluation/', priority: 0.9, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/ear-to-brain-fitness/', priority: 0.9, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/brain-pie/', priority: 0.8, changefreq: 'monthly', lastmod: '2026-09-11' },
  { path: '/duet-method-courses/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/hearing-loss/', priority: 0.8, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/tinnitus/', priority: 0.8, changefreq: 'monthly', lastmod: '2026-10-08' },
  { path: '/hearing-aid-fittings/', priority: 0.8, changefreq: 'monthly', lastmod: '2026-09-03' },
  { path: '/real-ear-measurement/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/hearing-protection/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/ear-wax-removal/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-09-28' },
  { path: '/auditory-processing-disorder/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/menieres-disease/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/sound-sensitivity/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/concussion-auditory-function/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/balance-vestibular-disorders/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-07-14' },
  { path: '/hearing-the-call/', priority: 0.7, changefreq: 'monthly', lastmod: '2026-07-09' },
  { path: '/reviews/', priority: 0.8, changefreq: 'monthly', lastmod: '2026-10-13' },
  { path: '/sitemap/', priority: 0.3, changefreq: 'monthly', lastmod: '2026-10-06' },
  { path: '/privacy-policy/', priority: 0.3, changefreq: 'yearly', lastmod: '2026-07-09' },
  { path: '/terms-of-service/', priority: 0.3, changefreq: 'yearly', lastmod: '2026-10-06' },
];

// lastmod = date the page's .astro file was last edited (git commit date).
// Update it whenever you change a page's content. Omitted if unset.
export const GET = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE}${u.path}</loc>
${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
};
