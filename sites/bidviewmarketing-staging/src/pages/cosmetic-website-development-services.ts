// Exact 1:1 converted live page (static HTML + mirrored assets).
import raw from '../../converted/cosmetic-website-development-services.html?raw';
export const prerender = false;
export const GET = () => new Response(raw, { headers: { 'content-type': 'text/html; charset=utf-8' } });
