const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mediaRoot = path.join(root, 'public', 'assets', 'media');
const scanRoots = [
  path.join(root, 'src'),
  path.join(root, 'public', 'assets', 'styles'),
  path.join(root, 'seed'),
];
const scanExts = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.json']);
const mediaExts = new Set(['.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.avif']);

function walk(dir, predicate = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

const mediaFiles = walk(mediaRoot, (file) => mediaExts.has(path.extname(file).toLowerCase()));
const scanFiles = scanRoots.flatMap((dir) => walk(dir, (file) => scanExts.has(path.extname(file).toLowerCase())));
const haystacks = scanFiles.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));

const records = mediaFiles.map((file) => {
  const rel = path.relative(path.join(root, 'public'), file).replace(/\\/g, '/');
  const url = '/' + rel;
  const bare = path.basename(file);
  const refs = [];
  for (const item of haystacks) {
    if (item.text.includes(url) || item.text.includes(rel) || item.text.includes(bare)) {
      refs.push(path.relative(root, item.file).replace(/\\/g, '/'));
    }
  }
  const stat = fs.statSync(file);
  return { file: rel, basename: bare, ext: path.extname(file).toLowerCase(), size: stat.size, referenced: refs.length > 0, references: refs };
});

const referenced = records.filter((item) => item.referenced);
const unreferenced = records.filter((item) => !item.referenced);
const basenameGroups = records.reduce((map, item) => {
  const normalized = item.basename
    .replace(/-[a-f0-9]{10,}(?=\.)/i, '')
    .replace(/-\d+x\d+(?=\.)/i, '')
    .toLowerCase();
  (map[normalized] ||= []).push(item);
  return map;
}, {});
const duplicateCandidates = Object.values(basenameGroups).filter((items) => items.length > 1);

const lines = [];
lines.push('# ABH Media Inventory');
lines.push('');
lines.push('Generated from local source references. No files were changed.');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Total media files: ${records.length}`);
lines.push(`- Referenced media files: ${referenced.length}`);
lines.push(`- Unreferenced media files: ${unreferenced.length}`);
lines.push(`- Duplicate-name candidate groups: ${duplicateCandidates.length}`);
lines.push('');
lines.push('## Recommended Next Step');
lines.push('');
lines.push('Register the referenced media files first. Keep unreferenced and duplicate candidates untouched until visual QA confirms they are not used by runtime CSS, scripts, or future templates.');
lines.push('');
lines.push('## Referenced Media');
lines.push('');
for (const item of referenced.sort((a, b) => a.file.localeCompare(b.file))) {
  lines.push(`- ${item.file}`);
  lines.push(`  Referenced by: ${item.references.slice(0, 5).join(', ')}${item.references.length > 5 ? `, plus ${item.references.length - 5} more` : ''}`);
}
lines.push('');
lines.push('## Unreferenced Media Candidates');
lines.push('');
for (const item of unreferenced.sort((a, b) => a.file.localeCompare(b.file))) {
  lines.push(`- ${item.file}`);
}
lines.push('');
lines.push('## Duplicate Candidates');
lines.push('');
for (const group of duplicateCandidates.sort((a, b) => b.length - a.length || a[0].basename.localeCompare(b[0].basename))) {
  lines.push(`- ${group[0].basename.replace(/-[a-f0-9]{10,}(?=\.)/i, '').replace(/-\d+x\d+(?=\.)/i, '')}`);
  for (const item of group) lines.push(`  ${item.referenced ? '[referenced]' : '[unreferenced]'} ${item.file}`);
}

fs.writeFileSync('ABH-media-inventory.md', lines.join('\n') + '\n');
fs.writeFileSync('ABH-media-inventory.json', JSON.stringify({ summary: { total: records.length, referenced: referenced.length, unreferenced: unreferenced.length, duplicateCandidateGroups: duplicateCandidates.length }, records }, null, 2) + '\n');
console.log(`Media inventory complete: ${referenced.length} referenced, ${unreferenced.length} unreferenced, ${duplicateCandidates.length} duplicate candidate groups.`);
