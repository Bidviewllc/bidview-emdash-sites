const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve('local-copy');
const SITE_RE = /https?:\/\/(www\.)?americasbesthearing\.com/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function pickDir(urlPath) {
  const ext = path.extname(urlPath.toLowerCase());
  if (['.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.ico'].includes(ext)) return 'media';
  if (ext === '.css') return 'styles';
  if (['.js','.mjs'].includes(ext)) return 'js';
  if (['.woff','.woff2','.ttf','.otf','.eot'].includes(ext)) return 'fonts';
  return 'other';
}

function localAssetFor(url) {
  try {
    const u = new URL(url);
    if (!SITE_RE.test(u.origin)) return null;
    const base = path.basename(u.pathname) || 'file';
    const ext = path.extname(base);
    const stem = path.basename(base, ext).replace(/[^a-zA-Z0-9._-]/g, '-') || 'file';
    const h = crypto.createHash('md5').update(u.origin + u.pathname).digest('hex').slice(0,10);
    const rel = path.join('assets', pickDir(u.pathname), `${stem}-${h}${ext}`).replace(/\\/g,'/');
    return rel;
  } catch {
    return null;
  }
}

function relFrom(file, relAsset) {
  return path.relative(path.dirname(file), path.join(ROOT, relAsset)).replace(/\\/g,'/');
}

const files = walk(ROOT).filter(f => /\.(html|css)$/i.test(f));
for (const file of files) {
  let txt = fs.readFileSync(file, 'utf8');

  txt = txt.replace(/<script[^>]+src=["']https?:\/\/[^"']+["'][^>]*><\/script>/gi, (m) => {
    return SITE_RE.test(m) ? m : '';
  });

  txt = txt.replace(/https?:\/\/(www\.)?americasbesthearing\.com[^"'\s)<>]*/gi, (u) => {
    const la = localAssetFor(u);
    if (!la) return u;
    return relFrom(file, la);
  });

  txt = txt.replace(/elementor/gi, 'astro');
  txt = txt.replace(/\bwp-/g, 'astro-');
  txt = txt.replace(/wp_/g, 'astro_');

  fs.writeFileSync(file, txt, 'utf8');
}
console.log(`postprocessed ${files.length} files`);
