// Review controls settings, read from the page's query string.
//
// A shared link reproduces exactly what the sender saw, so every setting lives
// in the URL. Only non-default values are written, so a default page has a clean
// address. Global settings ride along on every internal link; page settings
// belong to the page they were set on.
//
// Phase 2: the global settings become the EmDash site settings page (palette,
// header and footer style) and the page settings become fields on each record.

import { offices as baseOffices, practice } from "../data/practice";
import type { Palette } from "./color";

export const PALETTES: Record<string, { label: string; colors: Palette }> = {
	teal: { label: "Teal / Amber", colors: { P: "#0F5E6B", A: "#E0A33B", L: "#F6F1EA" } },
	navy: { label: "Navy / Coral", colors: { P: "#1E3A5F", A: "#E8735A", L: "#EEF3F8" } },
	forest: { label: "Forest / Gold", colors: { P: "#2F5D3A", A: "#C9A227", L: "#F7F4EC" } },
};

export const HEADERS = {
	h1: "H1 · Classic two-bar",
	h2: "H2 · Floating pill",
	h3: "H3 · Single row (default)",
	v1: "V1 · Overhanging logo badge",
	v2: "V2 · Centered logo, split nav",
	v3: "V3 · Logo spans two tiers",
	v4: "V4 · Centered stack",
	v5: "V5 · Logo over menu, stacked actions",
	v6: "V6 · Logo over menu, side-by-side actions",
	v7: "V7 · Logo over menu, Book only",
} as const;

export const FOOTERS = {
	f1: "F1 · Classic grouped",
	f2: "F2 · Contact-led split",
	f3: "F3 · Brand-led minimal",
	f4: "F4 · Patient-first",
	f6: "F6 · Multi-location",
	f7: "F7 · Office cards (default)",
} as const;

export const HEROES = {
	photo: "Photo (placeholder)",
	example: "Example photo",
	primary: "No photo · Primary",
	light: "No photo · Light",
} as const;

/** Team card layouts (Home and About "Meet the team"). */
export const TEAM_LAYOUTS = {
	overlay: "Cards · arrow on photo (default)",
	side: "Cards · arrow beside name",
	list: "List · photo left, short bio",
} as const;

export type TeamLayout = keyof typeof TEAM_LAYOUTS;
export type HeaderKey = keyof typeof HEADERS;
export type FooterKey = keyof typeof FOOTERS;
export type HeroKey = keyof typeof HEROES;

/** Global settings and their defaults. These are carried on internal links. */
export const GLOBAL_DEFAULTS = {
	palette: "teal",
	p: practice.colors.primary.slice(1),
	a: practice.colors.accent.slice(1),
	l: practice.colors.light.slice(1),
	header: "h3",
	footer: "f7",
	flogo: "landscape",
	badges: "1",
	offices: "2",
	/** Empty = each page uses its own default hero. */
	hero: "",
	ctaphoto: "1",
	team: "overlay",
	name: practice.name,
	phone: baseOffices[0].phone,
	lshape: "wide",
	panel: "on",
} as const;

export type GlobalKey = keyof typeof GLOBAL_DEFAULTS;
const GLOBAL_KEYS = Object.keys(GLOBAL_DEFAULTS) as GlobalKey[];

const pick = <T extends Record<string, unknown>>(table: T, v: string | null, d: keyof T) =>
	(v && v in table ? v : d) as keyof T;

const isHex = (v: string | null) => !!v && /^[0-9a-fA-F]{6}$/.test(v);

export function getSettings(url: URL) {
	const q = url.searchParams;
	const raw = (k: GlobalKey) => q.get(k) ?? GLOBAL_DEFAULTS[k];

	const paletteKey = q.get("palette") === "custom" ? "custom" : (pick(PALETTES, q.get("palette"), "teal") as string);
	const colors: Palette =
		paletteKey === "custom"
			? {
					P: "#" + (isHex(q.get("p")) ? q.get("p") : GLOBAL_DEFAULTS.p),
					A: "#" + (isHex(q.get("a")) ? q.get("a") : GLOBAL_DEFAULTS.a),
					L: "#" + (isHex(q.get("l")) ? q.get("l") : GLOBAL_DEFAULTS.l),
				}
			: PALETTES[paletteKey].colors;

	const name = (q.get("name") ?? "").trim().slice(0, 60) || practice.name;
	const phone = (q.get("phone") ?? "").trim().slice(0, 24) || baseOffices[0].phone;
	const wordmark: [string, string] =
		name === practice.name
			? practice.wordmark
			: name.includes(" ")
				? [name.slice(0, name.indexOf(" ")), name.slice(name.indexOf(" ") + 1)]
				: [name, ""];

	const officeCount = raw("offices") === "1" ? 1 : 2;
	const offices = baseOffices.slice(0, officeCount).map((o, i) => (i === 0 ? { ...o, phone } : o));

	/** Global values that differ from the default, for carrying on links. */
	const carried = new URLSearchParams();
	for (const k of GLOBAL_KEYS) {
		const v = q.get(k);
		if (v === null || v === GLOBAL_DEFAULTS[k]) continue;
		if ((k === "p" || k === "a" || k === "l") && paletteKey !== "custom") continue;
		carried.set(k, v);
	}

	/** An internal link that keeps the global review settings. */
	const href = (path: string) => {
		const qs = carried.toString();
		if (!qs || /^(https?:|tel:|mailto:|#)/.test(path)) return path;
		const [p, hash] = path.split("#");
		return p + (p.includes("?") ? "&" : "?") + qs + (hash ? "#" + hash : "");
	};

	/** Page-level switches: bool(key, default) and choice(key, options, default). */
	const bool = (k: string, d: boolean) => {
		const v = q.get(k);
		return v === null ? d : v === "1";
	};
	const choice = <T extends string>(k: string, options: readonly T[], d: T): T => {
		const v = q.get(k) as T | null;
		return v && options.includes(v) ? v : d;
	};

	return {
		paletteKey,
		colors,
		header: pick(HEADERS, q.get("header"), "h3") as HeaderKey,
		footer: pick(FOOTERS, q.get("footer"), "f7") as FooterKey,
		footerLogo: raw("flogo") === "vertical" ? ("vertical" as const) : ("landscape" as const),
		footerBadges: raw("badges") !== "0",
		officeCount,
		offices,
		/** This page's hero: the Review controls choice, else the page's own default. */
		heroFor: (pageDefault: HeroKey): HeroKey => {
			const v = q.get("hero");
			return v && v in HEROES ? (v as HeroKey) : pageDefault;
		},
		ctaPhoto: raw("ctaphoto") !== "0",
		team: pick(TEAM_LAYOUTS, q.get("team"), "overlay") as TeamLayout,
		name,
		wordmark,
		phone,
		logoShape: raw("lshape") === "stacked" ? ("stacked" as const) : ("wide" as const),
		showPanel: practice.reviewControls && raw("panel") !== "off",
		href,
		bool,
		choice,
		query: q,
	};
}

export type Settings = ReturnType<typeof getSettings>;
