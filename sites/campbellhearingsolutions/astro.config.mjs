import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import emdash from "emdash/astro";
import { sqlite } from "emdash/db";

const isCloudflareDeploy = process.env.EMDASH_TARGET === "cloudflare";

const emdashIntegration = emdash(
  isCloudflareDeploy
    ? {
        database: d1({ binding: "DB", session: "auto" }),
        storage: r2({ binding: "MEDIA" }),
        sandboxRunner: sandbox(),
      }
    : {
        database: sqlite({ url: "file:./data.db" }),
      },
);

const skippedSeoPatterns = new Set(["/sitemap.xml", "/robots.txt"]);

const emdashWithoutSeoRoutes = {
  ...emdashIntegration,
  hooks: {
    ...emdashIntegration.hooks,
    "astro:config:setup": (params) =>
      emdashIntegration.hooks?.["astro:config:setup"]?.({
        ...params,
        injectRoute: (route) => {
          if (skippedSeoPatterns.has(route.pattern)) return;
          params.injectRoute(route);
        },
      }),
  },
};

const campbellSeoRoutes = {
  name: "campbell-seo-routes",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      injectRoute({ pattern: "/sitemap.xml", entrypoint: "./src/seo/sitemap.xml.js" });
      injectRoute({ pattern: "/sitemap_index.xml", entrypoint: "./src/seo/sitemap-index.xml.js" });
      injectRoute({ pattern: "/robots.txt", entrypoint: "./src/seo/robots.txt.js" });
    },
  },
};

const permanent = (destination) => ({ status: 301, destination });

export default defineConfig({
  output: "server",
  adapter: isCloudflareDeploy ? cloudflare() : node({ mode: "standalone" }),
  redirects: {
    "/are-sleigh-bells-ringing-in-your-ears-get-the-facts-on-tinnitus/": permanent("/"),
    "/audiologist/": permanent("/about"),
    "/david-campbell-md/": permanent("/"),
    "/diabetes-and-hearing-loss-dr-yung-takes-a-deeper-look/": permanent("/"),
    "/dr-campbells-hearing-solutions-audiology-services/": permanent("/audiology-services"),
    "/ear-wax-removal-in-granger-in/": permanent("/audiology-services"),
    "/have-you-heard-about-the-new-over-the-counter-hearing-aid-otc-act-let-us-fill-you-in/":
      permanent("/"),
    "/healthy-diets-linked-to-lower-risk-of-hearing-loss-in-women/": permanent("/"),
    "/hearing-loss/": permanent("/"),
    "/holiday-cheer-the-loremipsumtitle-audiology-and-tinnitus-way/": permanent("/"),
    "/join-our-team/": permanent("/"),
    "/loremipsumtitle-audiology-patient-featured-in-nebraska-hands-and-voices-editorial/":
      permanent("/"),
    "/oticon-zeal-lp": permanent("/"),
    "/patient-information-dr-campbells-hearing-solutions/": permanent("/"),
    "/random-acts-of-hearing-kindness-for-family-members/": permanent("/"),
    "/random-acts-of-hearing-kindness-for-total-strangers/": permanent("/"),
    "/real-ear-measurement/": permanent("/audiology-services"),
    "/reviews/": permanent("/"),
    "/sheree‑richardson/": permanent("/sheree-richardson"),
    "/single-post/2017/11/07/random-acts-of-hearing-kindness-for-total-strangers/":
      permanent("/"),
    "/single-post/2017/11/08/random-acts-of-hearing-kindness-for-family-members/":
      permanent("/"),
    "/single-post/2018/09/27/healthy-diets-linked-to-lower-risk-of-hearing-loss-in-women/":
      permanent("/"),
    "/single-post/are-sleigh-bells-ringing-in-your-ears-get-the-facts-on-tinnitus":
      permanent("/"),
    "/single-post/diabetes-and-hearing-loss-dr-yung-takes-a-deeper-look":
      permanent("/"),
    "/single-post/have-you-heard-about-the-new-over-the-counter-hearing-aid-otc-act-let-us-fill-you-in":
      permanent("/"),
    "/single-post/holiday-cheer-the-loremipsumtitle-audiology-and-tinnitus-way":
      permanent("/"),
    "/single-post/loremipsumtitle-audiology-patient-featured-in-nebraska-hands-and-voices-editorial":
      permanent("/"),
    "/single-post/tips-for-talking-to-your-partner-about-hearing-loss":
      permanent("/"),
    "/single-post/what-to-do-when-earwax-becomes-a-problem":
      permanent("/"),
    "/single-post/your-insurance-questions-answered": permanent("/"),
    "/test-form/": permanent("/"),
    "/tinnitus/": permanent("/"),
    "/tinnitus-evaluations-in-wyoming/": permanent("/"),
    "/tips-for-talking-to-your-partner-about-hearing-loss/": permanent("/"),
    "/types-of-hearing-loss/": permanent("/"),
    "/what-to-do-when-earwax-becomes-a-problem/": permanent("/"),
    "/your-insurance-questions-answered/": permanent("/"),
  },
  integrations: [react(), campbellSeoRoutes, emdashWithoutSeoRoutes],
});
