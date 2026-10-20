// Posts that now 301 to another post (see REDIRECTS in src/pages/[...slug].astro).
// Their CMS rows still exist, so the blog index and the "recent posts" sidebar would keep linking to a URL that redirects.
// Anything listed here is left out of those lists. Add the slug here whenever a post is added to REDIRECTS.
export const RETIRED_POSTS = new Set<string>([
  "ear-candles-are-they-worth-trying", // duplicate intent of /ear-candles-are-they-any-good/ (ClickUp 868mjkr27)
]);
