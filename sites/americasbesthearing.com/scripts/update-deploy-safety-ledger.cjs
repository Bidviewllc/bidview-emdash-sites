#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ledgerPath = path.join(root, 'EMDASH-DEPLOY-SAFETY-LEDGER.md');

const args = process.argv.slice(2);
function getArg(name, fallback = '') {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return process.env[name.toUpperCase()] || fallback;
}

const worker = getArg('worker', 'americas-best-hearing-staging');
const url = getArg('url', `https://${worker}.workers.dev/`);
const versionId = getArg('version');
const message = getArg('message', 'Manual deploy');
const author = getArg('author', process.env.USERNAME || process.env.USER || 'unknown');
const commit = getArg('commit', process.env.GIT_COMMIT || 'unknown');
const branch = getArg('branch', process.env.GIT_BRANCH || 'main');

if (!versionId) {
  console.error('Missing required --version <version-id>');
  process.exit(1);
}

function readCurrentRecent(content) {
  const recentBlock = content.match(/## Recent Good Version[\s\S]*?## Previous Good Version/m);
  if (!recentBlock) return null;
  const b = recentBlock[0];
  const map = {
    version: (b.match(/- Version ID: `([^`]+)`/) || [])[1],
    deployedAt: (b.match(/- Deployed At: `([^`]+)`/) || [])[1],
    worker: (b.match(/- Worker: `([^`]+)`/) || [])[1],
    url: (b.match(/- URL: `([^`]+)`/) || [])[1],
    message: (b.match(/- Message: (.+)/) || [])[1],
    author: (b.match(/- Deployed By: `([^`]+)`/) || [])[1],
    commit: (b.match(/- Git Commit: `([^`]+)`/) || [])[1],
    branch: (b.match(/- Git Branch: `([^`]+)`/) || [])[1],
  };
  if (!map.version || map.version === 'N/A') return null;
  return map;
}

function buildTemplate() {
  return `# EmDash Deploy Safety Ledger (Template)\n\nUse this file as the single source of truth for safe deploy/rollback state.\n\n## Purpose\n- Keep the latest known-good Cloudflare deploy version.\n- Keep one previous known-good version for fast rollback.\n- Record enough context so AI can execute safe rollback commands correctly.\n\n## Rollback Rules for AI\n- If user says \`rollback\`, target \`Recent Good Version\` unless user specifies otherwise.\n- If \`Recent\` is broken, rollback to \`Previous Good Version\`.\n- Never guess worker/database names. Use values in this file.\n- Never run destructive local git resets for rollback unless explicitly requested.\n\n## Deploy Target\n- Worker: \`${worker}\`\n- URL: \`${url}\`\n\n## Recent Good Version\n- Version ID: \`N/A\`\n- Deployed At: \`N/A\`\n- Worker: \`${worker}\`\n- URL: \`${url}\`\n- Message: N/A\n- Deployed By: \`N/A\`\n- Git Commit: \`N/A\`\n- Git Branch: \`main\`\n\n## Previous Good Version\n- Version ID: \`N/A\`\n- Deployed At: \`N/A\`\n- Worker: \`${worker}\`\n- URL: \`${url}\`\n- Message: N/A\n- Deployed By: \`N/A\`\n- Git Commit: \`N/A\`\n- Git Branch: \`main\`\n\n## Canonical Rollback Command\n\`\`\`powershell\nnpx wrangler rollback <VERSION_ID> --name ${worker} --message "Rollback to known good"\n\`\`\`\n\n## Safe Deploy Checklist\n1. Build locally: \`npm run build\`\n2. Deploy to correct worker only.\n3. Verify smoke pages (homepage + key template pages + admin login).\n4. Update this ledger automatically.\n\n## Last Auto-Update\n- Timestamp: \`N/A\`\n`;
}

function writeUpdated(content) {
  const now = new Date().toISOString();
  const recent = readCurrentRecent(content);
  const prev = recent || {
    version: 'N/A',
    deployedAt: 'N/A',
    worker,
    url,
    message: 'N/A',
    author: 'N/A',
    commit: 'N/A',
    branch: 'main',
  };

  const nextRecent = {
    version: versionId,
    deployedAt: now,
    worker,
    url,
    message,
    author,
    commit,
    branch,
  };

  const updated = content
    .replace(/## Recent Good Version[\s\S]*?## Previous Good Version/m,
`## Recent Good Version
- Version ID: \`${nextRecent.version}\`
- Deployed At: \`${nextRecent.deployedAt}\`
- Worker: \`${nextRecent.worker}\`
- URL: \`${nextRecent.url}\`
- Message: ${nextRecent.message}
- Deployed By: \`${nextRecent.author}\`
- Git Commit: \`${nextRecent.commit}\`
- Git Branch: \`${nextRecent.branch}\`

## Previous Good Version`)
    .replace(/## Previous Good Version[\s\S]*?## Canonical Rollback Command/m,
`## Previous Good Version
- Version ID: \`${prev.version}\`
- Deployed At: \`${prev.deployedAt}\`
- Worker: \`${prev.worker || worker}\`
- URL: \`${prev.url || url}\`
- Message: ${prev.message || 'N/A'}
- Deployed By: \`${prev.author || 'N/A'}\`
- Git Commit: \`${prev.commit || 'N/A'}\`
- Git Branch: \`${prev.branch || 'main'}\`

## Canonical Rollback Command`)
    .replace(/## Last Auto-Update[\s\S]*$/m,
`## Last Auto-Update
- Timestamp: \`${now}\`
- Updated By: \`scripts/update-deploy-safety-ledger.cjs\``);

  return updated;
}

let content = fs.existsSync(ledgerPath)
  ? fs.readFileSync(ledgerPath, 'utf8')
  : buildTemplate();

if (!content.includes('## Recent Good Version') || !content.includes('## Previous Good Version')) {
  content = buildTemplate();
}

const out = writeUpdated(content);
fs.writeFileSync(ledgerPath, out, 'utf8');
console.log(`Updated deploy safety ledger: ${ledgerPath}`);
console.log(`Recent: ${versionId}`);
