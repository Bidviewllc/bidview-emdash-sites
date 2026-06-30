if (process.env.ALLOW_CONTENT_OVERWRITE !== "1") {
	console.error("This script rewrites EmDash content. Run `npm run content:backup` first, then retry with ALLOW_CONTENT_OVERWRITE=1 if you really want to overwrite admin edits.");
	process.exit(1);
}
