const fs = require("fs");
const path = require("path");

const root = process.cwd();
const backupDir = path.join(root, "backups", "emdash-db");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");

function copyIfExists(source, label) {
	if (!fs.existsSync(source)) return false;
	fs.mkdirSync(backupDir, { recursive: true });
	const target = path.join(backupDir, `${stamp}-${label}${path.extname(source) || ".sqlite"}`);
	fs.copyFileSync(source, target);
	console.log(`Backed up ${label} to ${path.relative(root, target)}`);
	return true;
}

copyIfExists(path.join(root, "data.db"), "data-db");

if (fs.existsSync(d1Dir)) {
	for (const file of fs.readdirSync(d1Dir)) {
		if (!file.endsWith(".sqlite") || file === "metadata.sqlite") continue;
		copyIfExists(path.join(d1Dir, file), "wrangler-d1");
	}
}
