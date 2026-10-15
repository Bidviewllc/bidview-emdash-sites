/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		site: import("./data/site").SiteData;
	}
}
