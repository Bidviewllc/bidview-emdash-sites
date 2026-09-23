// Serves the exact 1:1 converted live page as a complete raw HTML document
// (static markup + mirrored assets), rendered pixel-identically to the source.
import raw from '../../converted/audiology-marketing.html?raw';

export const prerender = false;

export const GET = () =>
  new Response(raw, { headers: { 'content-type': 'text/html; charset=utf-8' } });
