// The practice data file. Every practice detail on the site comes from here;
// swapping practices means editing this one file. In phase 2 these records move
// into EmDash (one record per service, brand, provider and office) and the
// shapes below are the fields those records need.
//
// Lakeview Hearing Center is a placeholder practice. Body copy is lorem ipsum
// sized to real practice pages.

import { posts as allPosts } from "./blog";
export type { Post } from "./blog";

export type Office = {
	slug: string;
	name: string;
	shortName: string;
	street: string;
	city: string;
	phone: string;
	/** Rows for the hours table, as [days, times]. */
	hours: [string, string][];
	/** One-line hours for cards. */
	hoursLine: string;
	mapsUrl: string;
	/** Long-form hours for the office page. */
	hoursLong: string;
};

export type Provider = {
	slug: string;
	name: string;
	title: string;
	/** Short name for "Meet ..." labels. */
	meet: string;
	/** Has a profile page of their own. */
	hasPage: boolean;
	tone: string;
	/** Offices this person sees patients at (office slugs). */
	offices: string[];
	/** Short name for headings, e.g. "Dr. Ellis". */
	short: string;
	/** Two or three sentences for the team list layout (no profile page needed). */
	bio: string;
	/** Headshot URL; a placeholder shows when there is none. */
	headshot?: string;
};

export type Service = {
	slug: string;
	name: string;
	/** Lower-case label for menus. */
	navLabel: string;
	summary: string;
	/** Own page switch. Off = card shows without a "Learn more" link. */
	hasPage: boolean;
	/** Hide from the services hub and Home grid. */
	hideFromHub?: boolean;
	/** Show on the Home page grid (the hub shows every service). */
	onHome?: boolean;
	bookLabel: string;
	ctaHeading: string;
};

export type Brand = {
	slug: string;
	name: string;
	logo: string;
	/** Max logo height inside the 160 x 60 slot. */
	logoHeight: string;
	hasPage: boolean;
	hideFromHub?: boolean;
	summary: string;
};

export type Association = {
	key: string;
	name: string;
	/** Display height in the trust bar. */
	height: string;
};

export type Review = {
	name: string;
	date: string;
	text: string;
	/** Long enough to need "Read more". */
	long?: boolean;
};

export const practice = {
	name: "Lakeview Hearing Center",
	/** The logo wordmark: first line bold, second line small caps. */
	wordmark: ["Lakeview", "Hearing Center"] as [string, string],
	shortName: "Lakeview",
	city: "Riverside",
	tagline: "Independent audiology care for Riverside and Northfield families.",
	email: "hello@lakeviewhearing.example",
	colors: { primary: "#0F5E6B", accent: "#E0A33B", light: "#F6F1EA" },
	rating: { score: "4.9", count: 210 },
	years: "35+ years",
	social: {
		facebook: "#",
		instagram: "#",
		youtube: "#",
	},
	/** Shows the floating Review controls panel. Off for a real launch. */
	reviewControls: true,
};

export const offices: Office[] = [
	{
		slug: "riverside",
		name: "Riverside office",
		shortName: "Riverside",
		street: "1200 Lakeview Parkway, Suite 210",
		city: "Riverside, ST 00000",
		phone: "(555) 010-0142",
		hours: [
			["Mon – Thu", "8:00 – 5:00"],
			["Fri", "8:00 – 12:00"],
			["Sat – Sun", "Closed"],
		],
		hoursLine: "Mon – Thu 8 am – 5 pm · Fri 8 am – 12 pm",
		hoursLong: "Monday to Thursday, 8:00 am to 5:00 pm<br>Friday, 8:00 am to 12:00 pm",
		mapsUrl: "https://www.google.com/maps/search/?api=1&query=1200+Lakeview+Parkway+Riverside",
	},
	{
		slug: "northfield",
		name: "Northfield office",
		shortName: "Northfield",
		street: "48 Mill Street",
		city: "Northfield, ST 00000",
		phone: "(555) 010-0178",
		hours: [
			["Tue, Thu", "9:00 – 4:00"],
			["Other days", "Closed"],
		],
		hoursLine: "Tue and Thu 9 am – 4 pm",
		hoursLong: "Tuesday and Thursday<br>9:00 am to 4:00 pm",
		mapsUrl: "https://www.google.com/maps/search/?api=1&query=48+Mill+Street+Northfield",
	},
];

export const providers: Provider[] = [
	{ slug: "jordan-ellis", name: "Dr. Jordan Ellis, Au.D.", title: "Owner and Audiologist", meet: "Meet Dr. Ellis", hasPage: true, tone: "warm", offices: ["riverside"], short: "Dr. Ellis", bio: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt. Ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation. Ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor." },
	{ slug: "priya-raman", name: "Dr. Priya Raman, Au.D.", title: "Audiologist", meet: "Meet Dr. Raman", hasPage: true, tone: "sage", offices: ["northfield", "riverside"], short: "Dr. Raman", bio: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat. Nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa. Qui officia deserunt mollit anim id est laborum curabitur pretium." },
	{ slug: "morgan-lee", name: "Morgan Lee", title: "Patient Care Coordinator", meet: "Meet Morgan Lee", hasPage: false, tone: "sky", offices: ["riverside"], short: "Morgan", bio: "Curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis. Et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin. Mauris integer in mauris eu nibh euismod gravida." },
];

export const services: Service[] = [
	{
		slug: "hearing-evaluations",
		name: "Hearing Evaluations",
		navLabel: "Hearing evaluations",
		summary: "Culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt. Lacus nulla gravida orci a odio nullam varius.",
		hasPage: true,
		bookLabel: "Book a hearing evaluation",
		ctaHeading: "One appointment shows you where your hearing stands",
	},
	{
		slug: "hearing-aid-fittings",
		name: "Hearing Aid Fittings",
		navLabel: "Hearing aid fittings",
		summary: "Turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer. In mauris eu nibh euismod.",
		hasPage: true,
		bookLabel: "Book a hearing aid fitting",
		ctaHeading: "Hearing aids that are set up for your ears and your life",
	},
	{
		slug: "hearing-aid-repairs",
		name: "Hearing Aid Repairs & Services",
		navLabel: "Hearing aid repairs",
		summary: "Gravida praesent blandit odio eu enim pellentesque sed dapibus est sed lacinia sapien. Vel tellus lorem ipsum dolor sit amet.",
		hasPage: false,
		bookLabel: "Book a repair visit",
		ctaHeading: "Get your hearing aids working again",
	},
	{
		slug: "ear-wax-removal",
		name: "Ear Wax Removal",
		navLabel: "Earwax removal",
		summary: "Consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore. Et dolore magna aliqua ut enim ad minim veniam quis.",
		hasPage: true,
		bookLabel: "Book earwax removal",
		ctaHeading: "Clear ears, in one short visit",
	},
	{
		slug: "tinnitus",
		name: "Tinnitus Evaluation & Management",
		navLabel: "Tinnitus care",
		summary: "Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis. Aute irure dolor in reprehenderit in voluptate velit.",
		hasPage: false,
		bookLabel: "Book a tinnitus evaluation",
		ctaHeading: "Relief starts with understanding the ringing",
	},
	{
		slug: "custom-hearing-protection",
		name: "Custom Hearing Protection",
		navLabel: "Custom ear protection",
		summary: "Esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in. Culpa qui officia deserunt mollit.",
		hasPage: false,
		bookLabel: "Book a fitting for ear protection",
		ctaHeading: "Protect the hearing you have",
	},
	{
		slug: "real-ear-measurement",
		name: "Real Ear Measurement",
		navLabel: "Real ear measurement",
		summary: "Pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris. Eu nibh euismod gravida praesent blandit odio eu.",
		hasPage: false,
		onHome: false,
		bookLabel: "Book a fitting check",
		ctaHeading: "Make sure your hearing aids are set for your ears",
	},
	{
		slug: "assistive-listening-devices",
		name: "Assistive Listening Devices",
		navLabel: "Assistive listening devices",
		summary: "Incididunt ut labore et dolore magna aliqua ut enim. Ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea.",
		hasPage: false,
		onHome: false,
		bookLabel: "Book an appointment",
		ctaHeading: "Hear the TV, the phone and the doorbell again",
	},
];

export const brands: Brand[] = [
	{ slug: "phonak", name: "Phonak", logo: "/assets/brands/phonak.png", logoHeight: "46px", hasPage: true, summary: "Ut aliquip ex ea commodo consequat duis aute irure. Dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat." },
	{ slug: "oticon", name: "Oticon", logo: "/assets/brands/oticon.png", logoHeight: "46px", hasPage: true, summary: "Nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id. Est laborum curabitur." },
	{ slug: "resound", name: "ReSound", logo: "/assets/brands/resound.png", logoHeight: "54px", hasPage: false, summary: "Pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra. Est eros bibendum elit nec luctus." },
	{ slug: "signia", name: "Signia", logo: "/assets/brands/signia.png", logoHeight: "60px", hasPage: true, summary: "Magna felis sollicitudin mauris integer in mauris eu nibh euismod gravida. Praesent blandit odio eu enim pellentesque sed dapibus est." },
	{ slug: "starkey", name: "Starkey", logo: "/assets/brands/starkey.png", logoHeight: "56px", hasPage: true, summary: "Sed lacinia sapien vel tellus lorem ipsum dolor sit. Amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore." },
	{ slug: "widex", name: "Widex", logo: "/assets/brands/widex.png", logoHeight: "42px", hasPage: false, summary: "Et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip. Ex ea commodo." },
	{ slug: "unitron", name: "Unitron", logo: "/assets/brands/unitron.png", logoHeight: "30px", hasPage: false, summary: "Consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu. Fugiat nulla pariatur excepteur sint occaecat." },
];

/** Logos come in colour, white and black: /assets/associations/{tone}/{key}.png */
export const associations: Association[] = [
	{ key: "ada", name: "Academy of Doctors of Audiology", height: "34px" },
	{ key: "aaa", name: "American Academy of Audiology", height: "42px" },
	{ key: "aba", name: "American Board of Audiology", height: "46px" },
	{ key: "asha", name: "American Speech-Language-Hearing Association (ASHA)", height: "40px" },
	{ key: "hearingup", name: "HearingUp Network", height: "34px" },
];

export const reviews: Review[] = [
	{ name: "Linda M.", date: "September 2026", text: "Gravida praesent blandit odio eu enim pellentesque sed dapibus est sed lacinia sapien vel. Tellus lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod. Tempor incididunt ut labore et dolore magna aliqua ut enim ad. Minim veniam quis nostrud exercitation ullamco laboris nisi." },
	{ name: "Robert K.", date: "August 2026", long: true, text: "Ut aliquip ex ea commodo consequat duis aute irure. Dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus nulla gravida orci a odio nullam. Varius turpis et commodo pharetra est eros bibendum elit nec luctus." },
	{ name: "Margaret S.", date: "July 2026", text: "Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur sint occaecat." },
	{ name: "David P.", date: "June 2026", text: "Curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra. Est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu nibh euismod." },
	{ name: "Carol W.", date: "June 2026", text: "Gravida orci a odio nullam varius turpis et commodo pharetra est eros. Bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu nibh euismod gravida praesent blandit." },
	{ name: "James T.", date: "May 2026", text: "Lacinia sapien vel tellus lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam." },
];

/** Shorter reviews for the Service detail sidebar. */
export const sidebarReviews: Review[] = [
	{ name: "Diane P.", date: "September 2026", text: "Esse cillum dolore eu fugiat nulla pariatur excepteur sint. Occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id. Est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra. Est." },
	{ name: "James W.", date: "August 2026", text: "Eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu nibh. Euismod gravida praesent blandit odio eu enim pellentesque sed dapibus est sed. Lacinia sapien vel tellus lorem ipsum dolor sit amet consectetur adipiscing. Elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad. Minim veniam quis." },
	{ name: "Carol S.", date: "July 2026", text: "Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute. Irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat." },
];

/** Blog posts live in blog.ts; Home and the sidebars use the newest three. */
export const posts = allPosts.slice(0, 3);

export const faq = [
	{ q: "How long does a hearing evaluation take?", a: "Cupidatat non proident sunt in culpa qui officia deserunt mollit. Anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam. Varius turpis et commodo pharetra est eros bibendum elit nec luctus magna. Felis sollicitudin mauris integer in mauris eu nibh euismod gravida praesent. Blandit odio eu enim pellentesque sed dapibus est sed lacinia sapien vel tellus." },
	{ q: "Does a hearing test hurt?", a: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed. Do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad. Minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure. Dolor in reprehenderit in voluptate velit." },
	{ q: "Should I bring someone with me?", a: "Esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt. In culpa qui officia deserunt mollit anim id est laborum curabitur pretium. Tincidunt lacus nulla gravida orci a odio nullam varius turpis et. Commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris. Eu nibh euismod." },
	{ q: "Will my insurance cover a hearing evaluation?", a: "Gravida praesent blandit odio eu enim pellentesque sed dapibus est sed lacinia sapien. Vel tellus lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore. Et dolore magna aliqua ut enim ad minim veniam quis. Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure. Dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla. Pariatur excepteur sint occaecat cupidatat non proident sunt in." },
];

export const telHref = (phone: string) => "tel:+1" + phone.replace(/\D/g, "");

/** Pages that exist in this build. Anything else gets the "coming in a later step" page. */
export const routes = {
	home: "/",
	services: "/services",
	service: (slug: string) => `/services/${slug}`,
	hearingAids: "/hearing-aids",
	brand: (slug: string) => `/hearing-aids/${slug}`,
	about: "/about",
	provider: (slug: string) => `/about/${slug}`,
	location: (slug: string) => `/locations/${slug}`,
	contact: "/contact",
	book: "/book-appointment",
	reviews: "/reviews",
	blog: "/blog",
	post: (slug: string) => `/blog/${slug}`,
	category: (slug: string) => `/blog/category/${slug}`,
	resource: (slug: string) => `/patient-resources/${slug}`,
	resources: "/patient-resources",
	privacy: "/privacy-policy",
	terms: "/terms-of-use",
	accessibility: "/accessibility",
	sitemap: "/sitemap",
	thankYou: "/thank-you",
};

/** "What to expect at your first visit" (Services hub). */
export const firstVisitSteps = [
	{ t: "We listen first", d: "Commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla. Pariatur excepteur sint occaecat cupidatat non proident sunt in culpa. Qui officia deserunt." },
	{ t: "We test thoroughly", d: "Mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci. A odio nullam varius turpis et commodo pharetra est eros bibendum. Elit nec luctus magna felis sollicitudin mauris." },
	{ t: "We explain your results", d: "Integer in mauris eu nibh euismod gravida praesent blandit. Odio eu enim pellentesque sed dapibus est sed lacinia sapien vel tellus lorem. Ipsum dolor sit amet consectetur adipiscing elit sed." },
	{ t: "We plan next steps together", d: "Do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex. Ea commodo consequat duis aute irure." },
];

/** Hearing aid styles (Hearing aids hub). The drawings live in StyleIllustration.astro. */
export const hearingAidStyles = [
	{ k: "ric", t: "Receiver-in-canal (RIC)", alt: "Illustration: a small case behind the ear with a thin wire to a speaker in the ear canal", d: "Cupidatat non proident sunt in culpa qui officia deserunt mollit anim. Id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis. Et commodo pharetra est." },
	{ k: "bte", t: "Behind-the-ear (BTE)", alt: "Illustration: a larger case behind the ear with a tube to an earmold", d: "Eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu. Nibh euismod gravida praesent blandit odio eu enim pellentesque sed dapibus est sed lacinia sapien vel tellus." },
	{ k: "ite", t: "In-the-ear (ITE)", alt: "Illustration: a custom shell filling the outer bowl of the ear", d: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do. Eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam. Quis nostrud exercitation ullamco laboris nisi." },
	{ k: "cic", t: "Completely-in-canal (CIC)", alt: "Illustration: a tiny device sitting deep in the ear canal", d: "Ut aliquip ex ea commodo consequat duis aute irure dolor in. Reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat. Non proident sunt in." },
] as const;

/** Brand page content, one record per brand. Brands without their own list get placeholder lines. */
export type Model = { n: string; d: string; f?: string[] };
export type BrandDetail = { lines: { t: string; models: Model[] }[]; accessories: string[]; older: string[] };
export const brandDetails: Record<string, BrandDetail> = {
	phonak: {
		lines: [
			{
				t: "Audéo EON Line",
				models: [
					{ n: "Audéo EON R", d: "Ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit. Esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat. Non proident sunt in culpa qui officia deserunt mollit anim id est laborum curabitur pretium. Tincidunt lacus nulla gravida orci a odio nullam varius.", f: ["Mauris integer in mauris eu nibh euismod gravida.", "Praesent blandit odio eu enim pellentesque sed dapibus est.", "Sed lacinia sapien vel tellus lorem ipsum."] },
					{ n: "Audéo EON Sphere", d: "Dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut. Labore et dolore magna aliqua ut enim ad minim veniam quis. Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor.", f: ["Lacus nulla gravida orci a odio nullam varius.", "Turpis et commodo pharetra est eros bibendum elit nec luctus."] },
					{ n: "CROS EON R", d: "Magna felis sollicitudin mauris integer in mauris eu nibh euismod gravida praesent. Blandit odio eu enim pellentesque sed dapibus est sed lacinia sapien. Vel tellus lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt." },
				],
			},
			{
				t: "Infinio Line",
				models: [
					{ n: "Audéo Infinio", d: "Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit. In voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim." },
					{ n: "Virto R Infinio", d: "Pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis. Et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in. Mauris eu nibh euismod gravida praesent blandit odio eu." },
					{ n: "CROS Infinio", d: "Enim ad minim veniam quis nostrud exercitation ullamco laboris nisi. Ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate. Velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat." },
				],
			},
			{
				t: "Lumity Line",
				models: [
					{ n: "Audéo Lumity", d: "Orci a odio nullam varius turpis et commodo pharetra. Est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris. Eu nibh euismod gravida praesent blandit odio eu enim pellentesque sed dapibus est sed lacinia sapien vel." },
					{ n: "Naída Lumity", d: "Consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut. Aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit." },
					{ n: "Sky Lumity", d: "Anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio. Nullam varius turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer." },
					{ n: "Phonak Slim", d: "Enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo. Consequat duis aute irure dolor in reprehenderit in voluptate. Velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non." },
				],
			},
		],
		accessories: ["Roger On", "TV Connector", "PartnerMic", "Charger Case Go", "Phonak Remote Mic"],
		older: ["Audéo Paradise", "Naída Paradise", "Audéo Marvel", "Bolero Marvel", "Virto Marvel"],
	},
};
export const genericBrandDetails = (name: string): BrandDetail => ({
	lines: [
		{
			t: "Premium line",
			models: [
				{ n: `${name} premium rechargeable`, d: "Ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit. Esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat. Non proident sunt in culpa qui officia deserunt mollit anim id est laborum.", f: ["Mauris integer in mauris eu nibh euismod gravida.", "Praesent blandit odio eu enim pellentesque sed dapibus est."] },
				{ n: `${name} premium custom`, d: "Dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut. Labore et dolore magna aliqua ut enim ad minim veniam quis. Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
			],
		},
		{ t: "Essential line", models: [{ n: `${name} essential`, d: "Nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit. In voluptate velit esse cillum dolore eu fugiat nulla pariatur." }] },
	],
	accessories: ["TV streamer", "Partner microphone", "Charging case", "Remote control"],
	older: [`Earlier ${name} rechargeable models`, `Earlier ${name} custom models`],
});
export const brandFaq = (name: string) => [
	{ q: `Are ${name} hearing aids rechargeable?`, a: "Nulla pariatur excepteur sint occaecat cupidatat non proident sunt in. Culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla. Gravida orci a odio nullam varius turpis et commodo pharetra est eros." },
	{ q: `Do ${name} hearing aids work with my phone?`, a: "Enim pellentesque sed dapibus est sed lacinia sapien vel. Tellus lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor. Incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris." },
	{ q: `Which ${name} model is right for me?`, a: "Cupidatat non proident sunt in culpa qui officia deserunt mollit anim. Id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis. Et commodo pharetra est eros bibendum elit nec luctus." },
	{ q: `Can you repair my older ${name} hearing aids?`, a: "Eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam. Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum." },
];

/** About page. */
export const milestones = [
	{ y: "1990", t: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore." },
	{ y: "2004", t: "Magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea." },
	{ y: "2012", t: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat." },
	{ y: "2021", t: "Cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum." },
];
export const values = [
	{ icon: "chat", t: "Time to listen", d: "Nibh euismod gravida praesent blandit odio eu enim pellentesque. Sed dapibus est sed lacinia sapien vel tellus lorem ipsum dolor." },
	{ icon: "checkCircle", t: "Clear answers", d: "Sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut. Enim ad minim." },
	{ icon: "refresh", t: "Care that continues", d: "Veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis. Aute irure dolor in reprehenderit in." },
	{ icon: "pin2", t: "Rooted in Riverside", d: "Voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint. Occaecat cupidatat non proident sunt in culpa qui officia." },
] as const;
