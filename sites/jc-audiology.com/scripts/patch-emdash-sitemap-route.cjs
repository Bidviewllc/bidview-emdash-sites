const fs = require("fs");
const path = require("path");

const files = [
  path.join("node_modules", "emdash", "dist", "astro", "index.mjs"),
  path.join("node_modules", "emdash", "src", "astro", "integration", "routes.ts"),
];

function removeInjectedRoute(source, pattern) {
  let next = source;
  let index = next.indexOf(pattern);
  while (index >= 0) {
    const start = next.lastIndexOf("injectRoute({", index);
    if (start < 0) break;

    let cursor = start;
    let depth = 0;
    let inString = false;
    let quote = "";
    let escaped = false;

    for (; cursor < next.length; cursor += 1) {
      const char = next[cursor];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          inString = false;
          quote = "";
        }
        continue;
      }

      if (char === "\"" || char === "'" || char === "`") {
        inString = true;
        quote = char;
        continue;
      }

      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          const end = next.indexOf(");", cursor);
          if (end < 0) break;
          next = `${next.slice(0, start)}${next.slice(end + 2)}`;
          index = next.indexOf(pattern, start);
          break;
        }
      }
    }

    if (cursor >= next.length) break;
  }
  return next;
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const patched = removeInjectedRoute(source, 'pattern: "/sitemap.xml"');
  if (patched !== source) {
    fs.writeFileSync(file, patched);
    console.log(`[patch-emdash] Removed built-in sitemap route from ${file}`);
  }
}
