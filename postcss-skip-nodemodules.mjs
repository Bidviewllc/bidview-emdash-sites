/**
 * PostCSS plugin that removes @layer and @tailwind directives from
 * node_modules CSS files before Tailwind processes them.
 * This prevents Tailwind v3 from choking on emdash's pre-compiled Tailwind v4 CSS.
 */
const plugin = () => {
  return {
    postcssPlugin: "skip-nodemodules-tailwind",
    Once(root, { result }) {
      const from = result.opts.from || "";
      if (!from.includes("node_modules")) return;

      // Remove @layer rules that conflict with Tailwind's @layer processing
      root.walkAtRules("layer", (rule) => {
        // Keep the contents but unwrap from @layer
        rule.replaceWith(rule.nodes);
      });
    },
  };
};

plugin.postcss = true;
export default plugin;
