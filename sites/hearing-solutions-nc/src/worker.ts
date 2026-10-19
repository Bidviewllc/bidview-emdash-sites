// Worker entry: the Astro/EmDash fetch handler plus EmDash's scheduled()
// housekeeping, which the hourly cron in wrangler.jsonc drives.
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

export default {
	...handler,
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
