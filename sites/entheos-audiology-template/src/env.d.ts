/// <reference types="astro/client" />
/// <reference types="emdash/locals" />

declare namespace App {
	interface Locals {
		site: import("./data/site").SiteData;
	}
}
