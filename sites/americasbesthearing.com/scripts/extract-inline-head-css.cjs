const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pagesDir = path.join(root, 'src', 'pages');
const outFile = path.join(root, 'public', 'assets', 'styles', 'abh-extracted-inline-head.css');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.astro')) out.push(full);
  }
  return out;
}

function readExtraHeadStrings(source) {
  const results = [];
  const marker = 'extraHead={';
  let index = 0;
  while ((index = source.indexOf(marker, index)) !== -1) {
    let i = index + marker.length;
    while (/\s/.test(source[i])) i++;
    if (source[i] !== '"') { index = i + 1; continue; }
    let j = i + 1;
    let escaped = false;
    for (; j < source.length; j++) {
      const ch = source[j];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') break;
    }
    const literal = source.slice(i, j + 1);
    try { results.push(JSON.parse(literal)); } catch (e) {}
    index = j + 1;
  }
  return results;
}

const seen = new Set();
const blocks = [];
for (const file of walk(pagesDir)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const source = fs.readFileSync(file, 'utf8');
  for (const head of readExtraHeadStrings(source)) {
    const styleRe = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = styleRe.exec(head))) {
      const attrs = m[1] || '';
      const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1] || 'inline-head-style';
      let css = m[2]
        .replace(/\/\*# sourceURL=[\s\S]*?\*\//g, '')
        .trim();
      if (!css) continue;
      const key = `${id}\n${css}`;
      if (seen.has(key)) continue;
      seen.add(key);
      blocks.push({ id, rel, css });
    }
  }
}

const output = [
  '/* Extracted from legacy WordPress/Astro head inline styles. */',
  '/* Keep this file external so rendered pages do not output legacy inline head style blocks. */',
  ...blocks.map((b, i) => `\n/* ${i + 1}. legacy head style from ${b.rel} */\n${b.css}`),
  ''
].join('\n');
fs.writeFileSync(outFile, output, 'utf8');
console.log(JSON.stringify({ outFile: path.relative(root, outFile), blocks: blocks.length, ids: [...new Set(blocks.map(b => b.id))] }, null, 2));
