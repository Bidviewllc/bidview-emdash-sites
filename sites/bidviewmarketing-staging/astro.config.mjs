import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { d1, r2 } from '@emdash-cms/cloudflare';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  output: 'server',

  adapter: cloudflare({
    imageService: 'compile',
    remoteBindings: false,
  }),

  integrations: [
    react(),
    emdash({
      // Keep local dev fully local to avoid flaky remote config fetches.
      database: d1({ binding: 'DB', session: isDev ? 'local' : 'auto' }),
      storage: r2({ binding: 'MEDIA' }),
      fonts: false,
    }),
  ],

  server: {
    host: 'localhost',
    port: 4321,
  },

  fonts: [
    {
      name: 'Noto Sans',
      cssVariable: '--font-emdash',
      provider: fontProviders.google(),
      options: {
        familyName: 'Noto Sans',
      },
    },
  ],

  vite: {
    optimizeDeps: {
      // Prevent Astro virtual asset modules from being pre-bundled into deps_ssr.
      // This avoids intermittent missing-file errors like astro_assets.js in local dev.
      exclude: ['astro:assets', 'astro/assets'],
    },
  },

});
