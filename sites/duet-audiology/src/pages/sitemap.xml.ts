// Dynamic sitemap.xml — generated from the known route list.
// If you add a new public page, list its slug here.

const SITE = 'https://duethearing.com';

const urls: Array<{ path: string; priority: number; changefreq: string; lastmod?: string }> = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/audiologist/lori-halvorson/', priority: 0.9, changefreq: 'monthly' },
  { path: '/audiologist/ann-benny-stephen/', priority: 0.9, changefreq: 'monthly' },
  { path: '/audiologist/allison-may/', priority: 0.9, changefreq: 'monthly' },
  { path: '/team/kristen-halvorson/', priority: 0.7, changefreq: 'monthly' },
  { path: '/team/rebecca-keller/', priority: 0.7, changefreq: 'monthly' },
  { path: '/team/rozanna-shambrook/', priority: 0.6, changefreq: 'monthly' },
  { path: '/team/gigi-anderson/', priority: 0.6, changefreq: 'monthly' },
  { path: '/team/susan-fink/', priority: 0.6, changefreq: 'monthly' },
  { path: '/team/kaylie-fuentes/', priority: 0.6, changefreq: 'monthly' },
  { path: '/team/kaleo/', priority: 0.5, changefreq: 'monthly' },
  // Article template hidden until real content is ready.
  // { path: '/articles/how-hearing-loss-affects-cognition/', priority: 0.8, changefreq: 'monthly' },
  { path: '/ear-to-brain-evaluation/', priority: 0.9, changefreq: 'monthly' },
  { path: '/ear-to-brain-fitness/', priority: 0.9, changefreq: 'monthly' },
  { path: '/brain-pie/', priority: 0.8, changefreq: 'monthly' },
  { path: '/duet-method-courses/', priority: 0.7, changefreq: 'monthly' },
  { path: '/hearing-loss/', priority: 0.8, changefreq: 'monthly' },
  { path: '/tinnitus/', priority: 0.8, changefreq: 'monthly' },
  { path: '/hearing-aid-fittings/', priority: 0.8, changefreq: 'monthly' },
  { path: '/real-ear-measurement/', priority: 0.7, changefreq: 'monthly' },
  { path: '/hearing-protection/', priority: 0.7, changefreq: 'monthly' },
  { path: '/ear-wax-removal/', priority: 0.7, changefreq: 'monthly' },
  { path: '/auditory-processing-disorder/', priority: 0.7, changefreq: 'monthly' },
  { path: '/menieres-disease/', priority: 0.7, changefreq: 'monthly' },
  { path: '/sound-sensitivity/', priority: 0.6, changefreq: 'monthly' },
  { path: '/concussion-auditory-function/', priority: 0.6, changefreq: 'monthly' },
  { path: '/balance-vestibular-disorders/', priority: 0.6, changefreq: 'monthly' },
  { path: '/hearing-the-call/', priority: 0.7, changefreq: 'monthly' },
  { path: '/reviews/', priority: 0.8, changefreq: 'monthly' },
  { path: '/sitemap/', priority: 0.3, changefreq: 'monthly' },
  { path: '/privacy-policy/', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms-of-service/', priority: 0.3, changefreq: 'yearly' },
];

// The date must be read inside the handler. On Cloudflare Workers the clock is
// frozen at 1970-01-01 outside a request, so a top-level new Date() gives 1970.
export const GET = () => {
  const today = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE}${u.path}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
};
