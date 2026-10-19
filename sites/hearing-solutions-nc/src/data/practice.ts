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
	/** Fax number (HSNC footer and location card). */
	fax?: string;
	/** Rows for the hours table, as [days, times]. */
	hours: [string, string][];
	/** One-line hours for cards. */
	hoursLine: string;
	mapsUrl: string;
	/** Long-form hours for the office page. */
	hoursLong: string;
	/** Office exterior photo (location page hero). */
	photo?: { src: string; alt: string };
	/** Google Place ID: the weekly review sync and the "Leave us a review" link use it. */
	placeId?: string;
	intro?: string;
	directions?: string;
	accessNotes?: string;
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
	/** Profile bio (rich text). */
	bioRich?: import("../lib/portable-text").PTBlock[];
	/** YouTube or Vimeo link for the intro video. */
	videoUrl?: string;
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
	/** Uploaded photo, if any. */
	heroImage?: { src: string; alt: string };
	intro?: string;
	/** Page content (rich text). */
	content?: import("../lib/portable-text").PTBlock[];
	sidebarText?: string;
	/** Services hub block: heading, when it differs from the name (a line break stays one). */
	hubHeading?: string;
	/** Services hub block: paragraphs (blank line = new paragraph; *italic*, **bold**, [link text](/path)). */
	hubText?: string;
	/** Services hub block: the accordion rows (t = title, d = description). */
	hubItems?: { t: string; d: string }[];
	/** Services hub block: the italic note under the rows (same formatting as hubText). */
	hubNote?: string;
	/** Services hub block: the second button. */
	hubButton?: "pricing" | "question";
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
	/** Uploaded photo, if any. */
	heroImage?: { src: string; alt: string };
	intro?: string;
	modelsIntro?: string;
	accessoriesIntro?: string;
	olderIntro?: string;
	careText?: string;
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
	/** Stars, 1 to 5 (5 when not given). */
	rating?: number;
	/** Office short name (Reviews page filter). */
	loc?: string;
};

export const practice = {
	name: "Hearing Solutions of North Carolina",
	/** The logo wordmark (only used if no logo is uploaded). */
	wordmark: ["Hearing Solutions", "of North Carolina"] as [string, string],
	shortName: "Hearing Solutions",
	city: "Salisbury",
	tagline: "Audiology care in Salisbury, NC.",
	email: "",
	colors: { primary: "#252F5B", accent: "#86BA32", light: "#EFF4E6" },
	rating: { score: "4.9", count: 0 },
	years: "15+ years",
	social: {
		facebook: "https://www.facebook.com/HearingSolutionsofNorthCarolina",
		instagram: "",
		youtube: "https://www.youtube.com/channel/UCaUH-REuaSn0cJEVI1KZwbQ/",
	},
	/** Shows the floating Review controls panel. Off: HSNC is a custom build. */
	reviewControls: false,
};

export const offices: Office[] = [
	{
		slug: "salisbury",
		name: "Hearing Solutions of North Carolina",
		shortName: "Salisbury",
		street: "464 Jake Alexander Boulevard West",
		city: "Salisbury, NC 28147",
		phone: "(704) 633-0023",
		fax: "(704) 705-2363",
		hours: [
			["Monday – Friday", "8:00 a.m. – 5:00 p.m."],
			["Saturday – Sunday", "Closed"],
		],
		hoursLine: "Monday–Friday, 8:00 a.m.–5:00 p.m.",
		hoursLong: "Monday–Friday,<br>8:00 a.m.–5:00 p.m.",
		mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hearing+Solutions+of+North+Carolina+464+Jake+Alexander+Blvd+W+Salisbury+NC+28147",
	},
];

/** Team, in the About page's order. Bios come over from the current site. */
export const providers: Provider[] = [
	{ slug: "lorin-oden", name: "Dr. Lorin S. Oden", title: "Board Certified Audiologist", meet: "Meet Dr. Oden", hasPage: true, tone: "warm", offices: ["salisbury"], short: "Dr. Oden", bio: "", headshot: "/assets/hsnc/team-lorin-oden.jpg" },
	{ slug: "sadie-mussler", name: "Dr. Sadie L. Mussler", title: "Audiologist", meet: "Meet Dr. Mussler", hasPage: true, tone: "sage", offices: ["salisbury"], short: "Dr. Mussler", bio: "", headshot: "/assets/hsnc/team-sadie-mussler.jpg" },
	{ slug: "sierra-carpenter", name: "Dr. Sierra Carpenter", title: "Audiologist", meet: "Meet Dr. Carpenter", hasPage: true, tone: "sky", offices: ["salisbury"], short: "Dr. Carpenter", bio: "", headshot: "/assets/hsnc/team-sierra-carpenter.jpg" },
	{ slug: "jane-walters", name: "Jane Walters, BC-HIS", title: "Board Certified in Hearing Instrument Sciences", meet: "Meet Jane", hasPage: true, tone: "warm", offices: ["salisbury"], short: "Jane", bio: "", headshot: "/assets/hsnc/team-jane-walters.jpg" },
	{ slug: "cheryl-keene", name: "Cheryl Keene, HIS", title: "Hearing Instrument Sciences", meet: "Meet Cheryl", hasPage: true, tone: "sage", offices: ["salisbury"], short: "Cheryl", bio: "", headshot: "/assets/hsnc/team-cheryl-keene.jpg" },
	{ slug: "katlin-futch", name: "Katlin Futch", title: "Audiology Assistant", meet: "Meet Katlin", hasPage: true, tone: "sky", offices: ["salisbury"], short: "Katlin", bio: "", headshot: "/assets/hsnc/team-katlin-futch.jpg" },
	{ slug: "diane-pullium", name: "Diane Pullium", title: "Office Manager", meet: "Meet Diane", hasPage: true, tone: "warm", offices: ["salisbury"], short: "Diane", bio: "", headshot: "/assets/hsnc/team-diane-pullium.jpg" },
	{ slug: "jamie-webb", name: "Jamie Webb", title: "Patient Care Coordinator", meet: "Meet Jamie", hasPage: true, tone: "sage", offices: ["salisbury"], short: "Jamie", bio: "", headshot: "/assets/hsnc/team-jamie-webb.jpg" },
];

/**
 * Services, in the Services page's order. Each one is written out in full on the
 * Services hub (the slug is its anchor there); "own page" is off for launch.
 */
export const services: Service[] = [
	{
		slug: "hearing-loss",
		name: "Hearing Loss",
		navLabel: "Hearing Loss",
		summary: "",
		hasPage: false,
		onHome: false,
		bookLabel: "Call to book",
		ctaHeading: "",
		hubText: "If you are experiencing [hearing loss](#), we like to begin with our *Functional Hearing Assessment*. A beep test only tells us so much. [This assessment](#) goes much further, measuring how your brain processes sound, how it copes with noise, and how hard you're working to keep up. In just two hours, we can see the whole picture.",
		hubItems: [{ t: "Before your visit", d: "[Description to come]" }, { t: "Otoscopic exam", d: "[Description to come]" }, { t: "Tympanometry", d: "[Description to come]" }, { t: "Pure tone audiometry", d: "[Description to come]" }, { t: "Bone conduction testing", d: "[Description to come]" }, { t: "Speech audiometry", d: "[Description to come]" }, { t: "Sound tolerance testing", d: "[Description to come]" }, { t: "Speech-in-noise testing", d: "[Description to come]" }, { t: "Cognitive screening", d: "[Description to come]" }, { t: "Fall risk assessment", d: "[Description to come]" }, { t: "Live device demonstration", d: "[Description to come]" }],
		hubNote: "**Prefer to start smaller?** A [Standard Hearing Evaluation](#) covers the otoscopic exam, tympanometry, and pure tone audiometry. We bill Medicare and Medicaid directly for this shorter visit, and give commercial patients an invoice to submit for reimbursement.",
		hubButton: "pricing",
	},
	{
		slug: "hearing-aids",
		name: "Hearing Aids",
		navLabel: "Hearing Aids",
		summary: "",
		hasPage: false,
		onHome: false,
		bookLabel: "Call to book",
		ctaHeading: "",
		hubText: "If your *Functional Hearing Assessment* points to hearing aids as your answer, we find the perfect match for your ears, your brain, and your life. If you already have hearing aids, we help them do everything they're supposed to within your unique circumstances.",
		hubItems: [{ t: "Hearing aid fittings", d: "[Description to come]" }, { t: "Ongoing care & adjustments", d: "[Description to come]" }, { t: "Hearing aid repairs", d: "[Description to come]" }, { t: "Care for hearing aids bought elsewhere", d: "[Description to come]" }, { t: "Assistive listening devices", d: "[Description to come]" }],
		hubButton: "question",
	},
	{
		slug: "tinnitus",
		name: "Tinnitus",
		navLabel: "Tinnitus",
		summary: "",
		hasPage: false,
		onHome: true,
		bookLabel: "Call to book",
		ctaHeading: "",
		hubText: "If you hear ringing, buzzing, or hissing that no one else can, that's tinnitus. Most people are told there's nothing to be done—that you just have to live with it. That isn't true. Something can be done, and we're here to help.",
		hubItems: [{ t: "Tinnitus evaluation", d: "[Description to come]" }, { t: "Tinnitus treatment", d: "[Description to come]" }],
		hubButton: "pricing",
	},
	{
		slug: "ear-spa",
		name: "Ear Spa (Earwax Removal)",
		navLabel: "Ear Spa (Earwax Removal)",
		summary: "",
		hasPage: false,
		onHome: true,
		bookLabel: "Call to book",
		ctaHeading: "",
		hubText: "Ears feeling clogged, muffled, or full? Sometimes, what looks like hearing loss is just wax—and it's never something to dig at with a Q-tip, which usually pushes it deeper. Our Ear Spa is a 30-minute appointment, and it's exactly as pleasant as it sounds.",
		hubItems: [{ t: "The Earigator™", d: "[Description to come]" }],
		hubButton: "pricing",
	},
	{
		slug: "custom-molds",
		name: "Custom Molds & Hearing Protection",
		navLabel: "Custom Molds & Hearing Protection",
		summary: "",
		hasPage: false,
		onHome: true,
		bookLabel: "Call to book",
		ctaHeading: "",
		hubHeading: "Custom Molds &\nHearing Protection",
		hubText: "We make all kinds of custom earpieces, each molded to fit your ear exactly. Some protect your hearing—on the job, at the range, at concerts. Others solve everyday problems: keeping water out when you swim, blocking noise when you sleep, or, if you're a musician, giving you a precise in-ear monitor fit. Whatever you need, a custom mold seals better and stays more comfortable than anything off the shelf.",
		hubItems: [{ t: "Digital ear scan", d: "[Description to come]" }],
		hubButton: "question",
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
