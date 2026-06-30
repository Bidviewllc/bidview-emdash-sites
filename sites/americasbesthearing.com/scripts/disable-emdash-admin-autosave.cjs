const fs = require('fs');
const path = 'node_modules/@emdash-cms/admin/dist/index.js';
let source = fs.readFileSync(path, 'utf8');
let changed = false;

if (process.env.ALLOW_ADMIN_BUNDLE_PATCH !== '1') {
  console.error('Refusing to patch the EmDash admin bundle without ALLOW_ADMIN_BUNDLE_PATCH=1.');
  process.exit(1);
}

const replacements = [
  [
    'onAutosave: handleAutosave,',
    'onAutosave: void 0,'
  ],
  [
    'const handleAutosave = (payload) => {\n\t\tautosaveMutation.mutate(payload);\n\t};',
    'const handleAutosave = (_payload) => {\n\t\treturn;\n\t};'
  ],
  [
    'if (isNew || !onAutosave || !item?.id) return;',
    'return;\n\t\tif (isNew || !onAutosave || !item?.id) return;'
  ]
];

for (const [target, replacement] of replacements) {
  if (source.includes(target)) {
    source = source.replace(target, replacement);
    changed = true;
  }
}

if (!changed && source.includes('onAutosave: void 0,') && source.includes('const handleAutosave = (_payload)')) {
  console.log('EmDash admin autosave is already force-disabled.');
  process.exit(0);
}

fs.writeFileSync(path, source);
console.log(changed ? 'Force-disabled EmDash admin autosave.' : 'No autosave patch targets were found.');
