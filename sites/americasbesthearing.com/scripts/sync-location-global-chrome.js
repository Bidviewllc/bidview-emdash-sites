const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('local-copy');
const HOMEPAGE = path.join(ROOT, 'index.html');
const LOCATION_PAGES = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('audiologist-hearing-aids-'))
  .map((entry) => path.join(ROOT, entry.name, 'index.html'))
  .filter((file) => fs.existsSync(file));

function extractBlock(html, tag, className) {
  const regex = new RegExp(`<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*>[\\s\\S]*?<\\/${tag}>`, 'i');
  const match = html.match(regex);
  if (!match) {
    throw new Error(`Could not find ${tag}.${className}`);
  }
  return match[0];
}

function rebaseAttr(block, attr, fromDir, toDir) {
  const regex = new RegExp(`${attr}="([^"]+)"`, 'g');
  return block.replace(regex, (_, value) => {
    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('//') ||
      value.startsWith('#') ||
      value.startsWith('mailto:') ||
      value.startsWith('tel:') ||
      value.startsWith('javascript:')
    ) {
      return `${attr}="${value}"`;
    }

    const resolved = path.resolve(fromDir, value);
    const rebased = path.relative(toDir, resolved).replace(/\\/g, '/');
    return `${attr}="${rebased || './'}"`;
  });
}

function rebaseSrcset(block, fromDir, toDir) {
  return block.replace(/srcset="([^"]+)"/g, (_, value) => {
    const next = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const bits = item.split(/\s+/);
        const asset = bits[0];
        if (
          asset.startsWith('http://') ||
          asset.startsWith('https://') ||
          asset.startsWith('//') ||
          asset.startsWith('data:')
        ) {
          return item;
        }
        const resolved = path.resolve(fromDir, asset);
        bits[0] = path.relative(toDir, resolved).replace(/\\/g, '/');
        return bits.join(' ');
      })
      .join(', ');
    return `srcset="${next}"`;
  });
}

function rebaseBlock(block, targetFile) {
  const homeDir = path.dirname(HOMEPAGE);
  const targetDir = path.dirname(targetFile);
  let next = block;
  for (const attr of ['href', 'src', 'poster']) {
    next = rebaseAttr(next, attr, homeDir, targetDir);
  }
  next = rebaseSrcset(next, homeDir, targetDir);
  return next;
}

const homepageHtml = fs.readFileSync(HOMEPAGE, 'utf8');
const homeHeader = extractBlock(homepageHtml, 'header', 'astro-location-header');
const homeFooter = extractBlock(homepageHtml, 'footer', 'astro-location-footer');

for (const file of LOCATION_PAGES) {
  let html = fs.readFileSync(file, 'utf8');
  const pageHeader = extractBlock(html, 'header', 'astro-location-header');
  const pageFooter = extractBlock(html, 'footer', 'astro-location-footer');
  const rebasedHeader = rebaseBlock(homeHeader, file);
  const rebasedFooter = rebaseBlock(homeFooter, file);

  html = html.replace(pageHeader, rebasedHeader);
  html = html.replace(pageFooter, rebasedFooter);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`synced ${path.relative(ROOT, file).replace(/\\/g, '/')}`);
}
