#!/usr/bin/env node
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const worker = process.env.CF_WORKER_NAME || 'americas-best-hearing-staging';
const url = process.env.CF_WORKER_URL || `https://${worker}.workers.dev/`;
const message = args.join(' ').trim() || 'Safe staging deploy';

const deployArgs = ['wrangler', 'deploy', '--name', worker, '--keep-vars', '--message', message];

const run = spawnSync('npx', deployArgs, {
  stdio: 'pipe',
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const allOut = `${run.stdout || ''}\n${run.stderr || ''}`;
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');

if (run.status !== 0) {
  console.error('\nDeploy failed. Ledger not updated.');
  process.exit(run.status || 1);
}

const m = allOut.match(/Current Version ID:\s*([a-f0-9-]+)/i);
if (!m) {
  console.error('\nDeploy succeeded but version ID was not found. Ledger not updated.');
  process.exit(1);
}

const versionId = m[1];

const gitCommit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', shell: process.platform === 'win32' });
const gitBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', shell: process.platform === 'win32' });

const updateArgs = [
  'scripts/update-deploy-safety-ledger.cjs',
  '--worker', worker,
  '--url', url,
  '--version', versionId,
  '--message', message,
  '--commit', (gitCommit.stdout || '').trim() || 'unknown',
  '--branch', (gitBranch.stdout || '').trim() || 'main',
  '--author', process.env.USERNAME || process.env.USER || 'unknown',
];

const update = spawnSync('node', updateArgs, { stdio: 'inherit', encoding: 'utf8', shell: process.platform === 'win32' });
if (update.status !== 0) {
  process.exit(update.status || 1);
}

console.log(`\nSafe deploy complete. Recorded version: ${versionId}`);
