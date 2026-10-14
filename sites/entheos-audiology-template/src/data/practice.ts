// The practice data file. Every practice detail on the site comes from here;
// swapping practices means editing this one file. In phase 2 these records move
// into EmDash (one record per service, brand, provider and office) and the
// shapes below are the fields those records need.
//
// Lakeview Hearing Center is a placeholder practice. Body copy is lorem ipsum
// sized to real practice pages.

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

export type Post = {
	slug: string;
	title: string;
	date: string;
	summary: string;
	tone: string;
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
		mapsUrl: "https://www.google.com/maps/search/?api=1&query=48+Mill+Street+Northfield",
	},
];

export const providers: Provider[] = [
	{ slug: "jordan-ellis", name: "Dr. Jordan Ellis, Au.D.", title: "Owner and Audiologist", meet: "Meet Dr. Ellis", hasPage: true, tone: "warm" },
	{ slug: "priya-raman", name: "Dr. Priya Raman, Au.D.", title: "Audiologist", meet: "Meet Dr. Raman", hasPage: true, tone: "sage" },
	{ slug: "morgan-lee", name: "Morgan Lee", title: "Patient Care Coordinator", meet: "Meet Morgan Lee", hasPage: false, tone: "sky" },
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
];

export const brands: Brand[] = [
	{ slug: "phonak", name: "Phonak", logo: "/assets/brands/phonak.png", logoHeight: "46px", hasPage: true },
	{ slug: "oticon", name: "Oticon", logo: "/assets/brands/oticon.png", logoHeight: "46px", hasPage: true },
	{ slug: "resound", name: "ReSound", logo: "/assets/brands/resound.png", logoHeight: "54px", hasPage: false },
	{ slug: "signia", name: "Signia", logo: "/assets/brands/signia.png", logoHeight: "60px", hasPage: true },
	{ slug: "starkey", name: "Starkey", logo: "/assets/brands/starkey.png", logoHeight: "56px", hasPage: true },
	{ slug: "widex", name: "Widex", logo: "/assets/brands/widex.png", logoHeight: "42px", hasPage: false },
	{ slug: "unitron", name: "Unitron", logo: "/assets/brands/unitron.png", logoHeight: "30px", hasPage: false },
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

export const posts: Post[] = [
	{ slug: "five-early-signs-of-hearing-loss", title: "Five early signs of hearing loss that are easy to explain away", date: "September 22, 2026", summary: "Eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi.", tone: "sage" },
	{ slug: "first-two-weeks-with-new-hearing-aids", title: "What the first two weeks with new hearing aids feel like", date: "September 9, 2026", summary: "Ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum. Dolore eu fugiat.", tone: "sky" },
	{ slug: "otc-vs-prescription-hearing-aids", title: "Over-the-counter vs. prescription hearing aids: an honest comparison", date: "August 28, 2026", summary: "Nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt. Mollit anim id est laborum curabitur.", tone: "stone" },
];

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
	resources: "/patient-resources",
	privacy: "/privacy-policy",
	terms: "/terms-of-use",
	accessibility: "/accessibility",
	sitemap: "/sitemap",
};
