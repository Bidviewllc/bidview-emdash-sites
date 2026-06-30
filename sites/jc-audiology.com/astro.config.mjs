import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import emdash from "emdash/astro";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { google } from "emdash/auth/providers/google";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
    sessionKVBindingName: "SESSION",
  }),
  integrations: [
    react(),
    emdash({
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
      sandboxRunner: sandbox(),
      authProviders: [google()],
    }),
  ],
});
