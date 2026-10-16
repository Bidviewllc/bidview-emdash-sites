/**
 * Page settings plugin (template-local, trusted).
 *
 * The Pages list holds every page's settings as fields of one collection, so
 * the admin would show "Home: ..." settings on the About record. This plugin
 * adds a field widget, "page-settings:scoped", that shows a field only on the
 * Pages records it belongs to. Each field lists those records in its widget
 * options: { pages: ["home", ...] }. The editing UI is in ./admin.tsx; the
 * plugin is registered in astro.config.mjs.
 */
import { definePlugin } from "emdash";
import type { PluginDefinition } from "emdash";

const definition: PluginDefinition = {
	id: "page-settings",
	version: "0.1.0",
	admin: {
		fieldWidgets: [
			{ name: "scoped", label: "Page setting (shown only on its page)", fieldTypes: ["boolean", "select"] },
			{ name: "text", label: "Page text slot (labelled for its page)", fieldTypes: ["text"] },
		],
	},
};

export function createPlugin() {
	return definePlugin(definition);
}

export default createPlugin;
