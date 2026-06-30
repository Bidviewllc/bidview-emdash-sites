const fs = require('fs');
const path = require('path');
const root = path.resolve('local-copy');
const cssName = 'abh-static-fixes.css';
const jsName = 'abh-static-fixes.js';
function walk(dir, out=[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}
function relAsset(file, asset) {
  return path.relative(path.dirname(file), path.join(root, asset)).replace(/\\/g, '/');
}
let changed = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replaceAll('14 Locations in Michigan, Minnesota, &amp; Florida', '13 Locations in Michigan, Minnesota, &amp; Florida');
  html = html.replaceAll('14 Locations in Michigan, Minnesota, & Florida', '13 Locations in Michigan, Minnesota, & Florida');
  html = html.replace(/<li class="menu-item menu-item-type-post_type menu-item-object-location menu-item-2009">[\s\S]*?<\/li>/g, '');
  if (!html.includes(cssName)) {
    const href = relAsset(file, 'assets/styles/' + cssName);
    html = html.replace('</head>', `<link rel="stylesheet" href="${href}">\n</head>`);
  }
  if (!html.includes(jsName)) {
    const src = relAsset(file, 'assets/js/' + jsName);
    html = html.replace('</body>', `<script src="${src}"></script>\n</body>`);
  }
  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
  }
}
console.log(`Updated ${changed} HTML files.`);
