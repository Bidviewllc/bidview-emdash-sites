import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// Keep worker warm with cron trigger every 5 minutes
const worker = {
	...handler,
	async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
		// Ping the homepage to keep the worker warm and reduce cold starts
		ctx.waitUntil(fetch("https://thechicagomarketingagency.vince-75c.workers.dev/"));
	},
};

export default worker;
