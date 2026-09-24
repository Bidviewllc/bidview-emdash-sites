import handler from '@astrojs/cloudflare/entrypoints/server';
import { legacyRedirect } from './lib/legacy-redirects';

export { PluginBridge } from '@emdash-cms/cloudflare/sandbox';

export default {
  ...handler,
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    // Old WordPress URLs are answered before Astro starts, so they cost nothing.
    if (request.method === 'GET' || request.method === 'HEAD') {
      const r = legacyRedirect(new URL(request.url));
      if (r) return r;
    }
    return (handler as any).fetch(request, env, ctx);
  },
};
