/**
 * Extra on-page content for the queries Search Console already sends here.
 * Rendered by the service and industry templates so it ships with the site,
 * independent of whatever the CMS row still says.
 *
 * No prices, timelines, headcounts, or client results beyond src/lib/proof.ts.
 */

export interface DepthBullet {
	title: string;
	body: string;
}

export interface DepthSection {
	heading: string;
	paragraphs: string[];
	bullets?: DepthBullet[];
}

export interface DepthLink {
	href: string;
	label: string;
	note: string;
}

export interface DepthPage {
	title: string;
	description: string;
	h1: string;
	eyebrow: string;
	lede: string;
	sections: DepthSection[];
	deliverables: DepthBullet[];
	pricingHeading: string;
	pricing: string[];
	faqs: { q: string; a: string }[];
	links: DepthLink[];
}

const seo: DepthPage = {
	title: "Chicago SEO Services",
	description:
		"Chicago SEO services for local businesses. How an SEO agency in Chicago should scope the work, what you actually receive, and how pricing is set. Free audit.",
	h1: "Chicago SEO services",
	eyebrow: "For local businesses",
	lede: "Chicago SEO services should turn search into calls and booked work, not a report you cannot use. An SEO agency in Chicago worth hiring will show you which pages should earn those visits, what to fix first, and what to leave alone.",
	sections: [
		{
			heading: "What SEO services in Chicago actually include",
			paragraphs: [
				"A useful engagement is a set of jobs tied to pages and searches, not a monthly slogan. The searches that bring a Chicago business work fall into three piles: citywide, neighborhood, and suburb. They do not share one page.",
				"Citywide searches are crowded. Neighborhood and suburb searches are where a lot of service businesses actually get the call. SEO services in Chicago start by deciding which page should match which search, and which searches are not worth a page of their own.",
			],
			bullets: [
				{
					title: "Technical foundation",
					body: "Can Google crawl the important URLs, are the titles and headings doing a job, is the page usable on a phone, and are Core Web Vitals in a range that does not fight the rest of the work.",
				},
				{
					title: "Local profile",
					body: "The Google Business Profile, the name-address-phone details you publish, and the pages that match a neighborhood or suburb. Thin doorway pages that only swap the town name are not this.",
				},
				{
					title: "Pages that match the search",
					body: "Service pages, industry pages, and location hubs written for the question the searcher has. A blog post is one tool. It is not a substitute for the page that should rank.",
				},
				{
					title: "Authority you can explain",
					body: "Mentions and links from relevant places, earned because the page is worth citing. Bulk link packages are not part of this offer.",
				},
				{
					title: "A record of what changed",
					body: "Rankings, the pages that moved, and the leads you can attribute. Vanity charts are not the report.",
				},
			],
		},
		{
			heading: "How to judge an SEO agency in Chicago",
			paragraphs: [
				"The useful questions are specific. Ask which existing URL should rank for your main service, and which searches need a new page. Ask how they treat neighborhoods versus suburbs. Ask what they will not take on.",
				"Ask where their proof comes from. The figures on this site are published Bidview Marketing results, with the source linked, and they are not a forecast for your company. An agency that cannot point at a source is asking you to trust a graphic.",
				"Ask how the site and the ads relate. A business buying SEO services in Chicago often also needs the page to convert, or a paid campaign while the organic work compounds. Those are separate scopes, and they should be written that way.",
			],
		},
		{
			heading: "Chicago search is neighborhood-shaped",
			paragraphs: [
				"Chicago has official community areas and a long list of neighborhood names people actually type. A roofer, a dentist, or a law firm that serves three of them needs pages that say something true about those places. A single page that lists twenty towns is a different, weaker document.",
				"This site keeps neighborhood hubs and suburb pages separate on purpose, so a service is not repeated as a thin URL for every town. If you sell in the city and in a suburb, the audit says which of those pages you need and which you do not.",
			],
		},
		{
			heading: "How the work is sequenced",
			paragraphs: [
				"We look at the site, the local profile, and the searches that should be sending work. Then we write down the order: what blocks crawling or clarity, which pages to revise, which pages to add, and what to leave alone.",
				"We do not put a month count on that sequence before we have seen the site. Competitive citywide terms and a neighborhood term for a single location are different jobs. The audit is where that difference gets said out loud.",
			],
		},
	],
	deliverables: [
		{
			title: "A written audit",
			body: "The site, the local profile, and the searches that matter, with the problems ordered by what they block.",
		},
		{
			title: "A query-to-page map",
			body: "Which URL should match which search, including searches that should not get their own page.",
		},
		{
			title: "A fix list",
			body: "Technical and on-page changes, written so a developer or our team can ship them.",
		},
		{
			title: "Outlines for the gaps",
			body: "The pages or sections that are missing, and what each one has to answer.",
		},
		{
			title: "A monthly note",
			body: "What shipped, which queries moved, and what is next. Leads when the tracking can see them.",
		},
	],
	pricingHeading: "How Chicago SEO services are priced",
	pricing: [
		"There is no rate card on this page. SEO here is a monthly engagement scoped after the free audit.",
		"The scope depends on how competitive the queries are, how many locations you serve, and whether the site needs structural work before new pages will help. A one-location shop and a firm bidding on citywide legal terms are not the same proposal.",
		"If paid ads are part of the plan, the media budget is paid to the ad platform. It is not folded into a made-up SEO price. You get a written scope. You can say no.",
	],
	faqs: [
		{
			q: "What are Chicago SEO services?",
			a: "They are the ongoing work of making the right pages show up for the searches your customers use in the city, the neighborhoods, and the suburbs. That includes technical fixes, the local profile, page content, and a record of what changed. It does not include a promise of a specific ranking.",
		},
		{
			q: "Is an SEO agency in Chicago different from a national one?",
			a: "The mechanics of search are the same. The map of queries is not. Chicago businesses get found by neighborhood and suburb names, not only by the city name. A useful agency writes the scope around the places you actually serve.",
		},
		{
			q: "How long do SEO services in Chicago take?",
			a: "We will not put a number of months on it before we have seen the site and the queries. Citywide terms usually move slower than a specific neighborhood term. The audit says which of those you are actually chasing.",
		},
		{
			q: "Do you guarantee the first page?",
			a: "No. Rankings depend on the site, the competition, and what Google does with the query. We will tell you what looks realistic after the audit, and we will not sell a guarantee.",
		},
		{
			q: "Do you work in the suburbs as well as the city?",
			a: "Yes. Neighborhood hubs and suburb pages are separate on this site. The audit says which of those match how you actually sell.",
		},
		{
			q: "What happens after I request the free audit?",
			a: "You send your name, email, and website. Someone from Bidview Marketing follows up within one business day with what to fix first. There is no charge for that review and no storefront visit.",
		},
	],
	links: [
		{ href: "/services/paid-advertising/", label: "Paid advertising", note: "When you need calls while organic work compounds." },
		{ href: "/services/content-marketing/", label: "Content marketing", note: "The pages and articles the query map asks for." },
		{ href: "/services/web-design/", label: "Web design", note: "When the site itself is what blocks the leads." },
		{ href: "/industries/construction/", label: "Construction marketing", note: "How contractors get found for project searches." },
		{ href: "/industries/law-firms/", label: "Law firm marketing", note: "Practice-area search, with claims kept careful." },
		{ href: "/neighborhoods/", label: "Chicago neighborhoods", note: "Local hubs, without a thin service URL per town." },
		{ href: "/suburbs/", label: "Suburbs", note: "Separate town pages for the suburbs this brand sells." },
		{ href: "/results/", label: "Published results", note: "The Bidview figures and quotes, with the source." },
		{ href: "/free-seo-audit/", label: "Free audit", note: "The form, if you would rather send it on its own page." },
	],
};

const paid: DepthPage = {
	title: "Paid Advertising in Chicago",
	description:
		"Paid advertising for Chicago businesses. What the management covers, how the media budget is separate, and when ads are the wrong first spend. Free audit.",
	h1: "Paid advertising for Chicago businesses",
	eyebrow: "Google, Meta, and the rest",
	lede: "Paid advertising is the channel you can turn on this week. It is also the channel that wastes money when the page, the offer, or the tracking is wrong. This page says what we manage, what you receive, and how the fee is separated from the money you pay the ad platform.",
	sections: [
		{
			heading: "What the management covers",
			paragraphs: [
				"Search ads for people who are already looking, and paid social when the offer needs an audience rather than a query. Local services ads are in scope for trades that qualify. Shopping and Performance Max are in scope when you sell products and the feed is fit to use.",
				"The first pass is the account you already have, if there is one: conversion tracking, queries that should be negative, and spend that is not tied to a lead. A new account starts from the offer and the page, not from a default campaign.",
			],
		},
		{
			heading: "When ads are the wrong first spend",
			paragraphs: [
				"If the site cannot take the lead on a phone, or the form is broken, more clicks will not fix it. The audit says that plainly. Sometimes the first month is the page and the tracking. Sometimes it is the ads. They are written as separate scopes so you can see which one you are buying.",
				"SEO and content are the other half of the same question. Ads rent the visit. A page that matches the search can keep earning after the budget pauses. Many Chicago businesses want both. The proposal says which one is first.",
			],
		},
	],
	deliverables: [
		{ title: "Tracking check", body: "What counts as a lead, and whether the account can see it. Calls and forms are not the same event." },
		{ title: "Account notes", body: "Wasted queries, broken settings, and the campaigns worth keeping." },
		{ title: "A campaign plan", body: "Platform, geography, and the offer. Chicago neighborhoods and suburbs are targeted on purpose, not as one giant radius." },
		{ title: "Ads and landing notes", body: "The copy and the page it should hit. A homepage is not always the right URL." },
		{ title: "A monthly note", body: "Spend, leads, cost per lead when the tracking supports it, and what we changed." },
	],
	pricingHeading: "How paid advertising is priced",
	pricing: [
		"Two numbers, kept apart. You pay the ad platform for the media. You pay us to manage it, when that management is in the scope.",
		"We do not publish a minimum spend or a management fee on this page. Both depend on the market, the offer, and whether the account is starting from zero. A single number would be invented.",
		"The free audit is where we recommend a test budget, or where we say the site should be fixed before you buy the clicks.",
	],
	faqs: [
		{
			q: "Which platform do you start with?",
			a: "The one that matches how people buy. Search, when they are already looking. Paid social, when you have to reach them. Local services ads, when the trade qualifies. We recommend after looking at the business. We do not start every account on the same platform.",
		},
		{
			q: "How soon will ads produce leads?",
			a: "Ads can send visits as soon as they are approved. Whether those visits become leads depends on the offer, the page, and the tracking. We will not quote a week count before we have seen the account.",
		},
		{
			q: "Do you guarantee a cost per lead or a return?",
			a: "No. Those numbers depend on your offer and your market, not only on the campaign setup. You get the spend, the leads, and an honest note when something is not working.",
		},
		{
			q: "Is the ad budget included in your fee?",
			a: "No. Media is paid to the platform. Management is separate, and it is quoted after the audit.",
		},
		{
			q: "Can this run next to SEO?",
			a: "Yes. The proposal says which one is first, and it links the ads to the same pages the SEO work is trying to rank.",
		},
	],
	links: [
		{ href: "/services/seo/", label: "Chicago SEO services", note: "The organic side of the same queries." },
		{ href: "/services/content-marketing/", label: "Content marketing", note: "Pages worth sending paid traffic to." },
		{ href: "/services/conversion-optimization/", label: "Conversion optimization", note: "When the visit is happening and the lead is not." },
		{ href: "/industries/construction/", label: "Construction", note: "Project leads, not a generic click." },
		{ href: "/industries/law-firms/", label: "Law firms", note: "Expensive clicks, scoped carefully." },
		{ href: "/free-seo-audit/", label: "Free audit", note: "Tell us the site. We follow up within one business day." },
	],
};

const content: DepthPage = {
	title: "Content Marketing in Chicago",
	description:
		"Content marketing for Chicago businesses. Pages and articles tied to real searches, what you receive, and how the work is scoped. Free audit.",
	h1: "Content marketing for Chicago businesses",
	eyebrow: "Pages that answer the search",
	lede: "Content marketing here means the pages and articles that should earn the visit. It is not a quota of posts. The useful question is which search has no honest page yet, and what that page has to say.",
	sections: [
		{
			heading: "What the work is for",
			paragraphs: [
				"A service page, an industry page, a neighborhood hub, or an article. Each one should match a search a customer actually types, and it should help them decide. If a topic does not have a search or a sales job, it does not get a draft.",
				"Chicago content has a local job too. A citywide guide and a page about one neighborhood are different documents. We do not stamp the same article with a new town name and call it a location page.",
			],
		},
		{
			heading: "How it supports SEO and ads",
			paragraphs: [
				"The query map from the SEO work is the editorial calendar. Paid ads should land on a page that matches the click. Content that is not tied to either of those is optional, and we will say so.",
				"You review drafts before they go live. If you have someone who knows the work, we can write from an interview. We do not invent credentials, results, or reviews to make a page sound busier.",
			],
		},
	],
	deliverables: [
		{ title: "A topic map", body: "The searches and the URL that should answer each one, including topics we recommend skipping." },
		{ title: "Outlines before drafts", body: "So you can correct the substance before the writing is finished." },
		{ title: "Drafts", body: "Service pages, industry pages, or articles, with the headings, internal links, and title a searcher should see." },
		{ title: "On-page basics", body: "Title, description, headings, and links to the pages that should pass authority along." },
		{ title: "A note on what earned the visit", body: "Which pieces are getting impressions and which ones should be revised or left alone." },
	],
	pricingHeading: "How content marketing is priced",
	pricing: [
		"A monthly scope, proposed after the audit. It depends on how much research the topics need and how many pages are actually missing.",
		"We do not publish a post count or a per-article price here. A number that ignores the topic would be made up. A short page that answers a local search can be worth more than a long page nobody needs.",
		"You see the list of pieces before the month starts. You can cut it.",
	],
	faqs: [
		{
			q: "Do you write the content?",
			a: "Yes. You review it before it is published. If your team has the subject knowledge, we can draft from notes or a call.",
		},
		{
			q: "How many pieces a month?",
			a: "As many as the scope says, and not a fixed package. The audit is where we recommend the list. Quality and the search it serves come before a count.",
		},
		{
			q: "How long until a new page shows in search?",
			a: "We will not quote a week count. A new page on a site Google already trusts usually moves sooner than a page on a new domain, and a crowded citywide term moves slower than a specific one. The audit says which situation you are in.",
		},
		{
			q: "Is this only for blog posts?",
			a: "No. Service pages and industry pages are often the higher-value documents. Articles support them when the search is a question, not a service.",
		},
		{
			q: "Can this work for a professional firm?",
			a: "Yes. Firms get hired after someone has read. The pages have to be accurate, and they have to avoid claims the firm cannot stand behind. Law firms have a separate page on this site for that reason.",
		},
	],
	links: [
		{ href: "/services/seo/", label: "Chicago SEO services", note: "The query map this content is written from." },
		{ href: "/services/paid-advertising/", label: "Paid advertising", note: "Send the click to a page that matches it." },
		{ href: "/industries/law-firms/", label: "Law firms", note: "Content that has to stay inside advertising rules." },
		{ href: "/blog/", label: "Blog", note: "Notes we have already published." },
		{ href: "/free-seo-audit/", label: "Free audit", note: "We will tell you which pages are actually missing." },
	],
};

const construction: DepthPage = {
	title: "Construction Marketing Agency in Chicago",
	description:
		"Construction marketing for Chicago contractors and remodelers. The searches that bring project leads, what the site has to show, and how the work is scoped. Free audit.",
	h1: "Construction marketing for Chicago contractors",
	eyebrow: "For contractors and remodelers",
	lede: "Construction marketing has one job: a conversation about a project. A homeowner planning a remodel, a property manager, or a general contractor looking for a trade. This page covers how those people look for you in Chicago, what your site has to show them, and how a construction marketing agency should scope the work.",
	sections: [
		{
			heading: "What a project lead actually searches",
			paragraphs: [
				"A useful search names the work and the place: a kitchen remodel in a neighborhood, a commercial contractor in the city, a roof replacement in a suburb. Someone typing construction marketing on its own is usually looking for an agency. Your customers name the project.",
				"Planned work and urgent work are different. A remodel can take weeks of reading. A broken pipe or a leaking roof is a call today. The page, the local profile, and any ads have to match that difference. One homepage cannot do both jobs well.",
			],
			bullets: [
				{
					title: "Project type",
					body: "Remodel, addition, concrete, roofing, a specific trade. The page should say what you build and what you do not.",
				},
				{
					title: "Place",
					body: "The neighborhoods and suburbs you will actually drive to. A list of every town in the metro is not a service area.",
				},
				{
					title: "Buyer",
					body: "Homeowner, property manager, or GC. The proof they want is not the same, and the follow-up is not the same.",
				},
			],
		},
		{
			heading: "What the website has to do",
			paragraphs: [
				"People checking a contractor look for proof of the work, a way to ask for a bid, and a sense that the company is real. The site has to load on a phone, because a lot of this research happens away from a desk.",
				"The photos should be your projects. Stock photography of a jobsite does not answer the question. If you want to show a license, insurance, or a union affiliation, put the facts you can stand behind. We will not invent credentials, reviews, or project counts.",
				"The ask should be obvious: call, form, or both. A form that demands a novel before you will reply loses the lead. Name, a way to reach them, and the project is enough to start.",
			],
		},
		{
			heading: "Residential remodel and commercial work are different campaigns",
			paragraphs: [
				"Residential leads often start in Google search, the map, and reviews. The person wants to see finished rooms and know you work in their town.",
				"Commercial leads often start with a relationship, a general contractor's list, or a property manager who already knows the building type. A direct note can matter more than a map pack. If you do both kinds of work, the proposal splits them. One campaign aimed at everyone in the city is how the budget disappears.",
			],
		},
		{
			heading: "What to fix before you buy ads",
			paragraphs: [
				"Ads can bring a remodel lead quickly. They cannot fix a site that hides the phone number or shows someone else's projects. The audit looks at the page and the local profile before it recommends spend.",
				"Directories and lead marketplaces are a separate decision. Some contractors use them. They are not a substitute for a site you own, and we do not promise they will replace your own pipeline.",
			],
		},
		{
			heading: "How to judge a construction marketing agency",
			paragraphs: [
				"Ask them to name the searches a homeowner uses for your kind of project, and the searches a GC uses. Ask which page on your site should match each one. Ask what they will photograph or need from you, because construction marketing without your own project photos is a brochure.",
				"Ask where any result they cite comes from. The figures on this site are published Bidview Marketing results. They are not construction-only numbers, and they are not a prediction for your bid board. An agency that pastes a percentage on a hard-hat photo without a source is decorating.",
			],
		},
	],
	deliverables: [
		{ title: "Audit of the site and the local profile", body: "What a prospect sees, what Google can see, and what is missing before anyone should buy clicks." },
		{ title: "A search map", body: "Project-type and place searches worth a page, and the URLs that should match them." },
		{ title: "A photo and proof list", body: "Which of your projects need to be on the site, and which claims you should not make." },
		{ title: "A lead path", body: "Call, form, or both, and how you will know which channel booked the conversation." },
		{ title: "A monthly note", body: "What shipped, which searches moved, and the leads the tracking can see." },
	],
	pricingHeading: "How construction marketing is priced",
	pricing: [
		"A monthly scope, written after the audit. The variables are the mix of residential and commercial work, how many trades you want found, whether the site can take a lead on a phone, and whether paid search is included.",
		"We do not publish a monthly price for construction marketing. A range that ignores those differences would be invented. You get a written proposal.",
		"If ads are included, you pay the platform for the media. Management is a separate line. You can approve the site work and decline the ads, or the other way around.",
	],
	faqs: [
		{
			q: "What is construction marketing, in practice?",
			a: "It is the work of getting the right project inquiries: the site, the local profile, the pages that match project-and-place searches, and ads when the page is ready for them. The goal is a bid conversation, not a pile of clicks.",
		},
		{
			q: "How do Chicago contractors get found online?",
			a: "Homeowners usually start with a search that names the project and the area, plus the map and reviews. Commercial buyers often start with a referral, a GC, or a narrower search. The audit says which of those match your work.",
		},
		{
			q: "Do I need a new website first?",
			a: "Not always. If the current site shows your work, loads on a phone, and makes it easy to ask for a bid, we can market it. If it does none of those, the audit will say the site is the first project.",
		},
		{
			q: "Can you market commercial construction and residential remodeling together?",
			a: "We can, and we will not pretend they are one campaign. The buyers, the searches, and the follow-up are different. The proposal splits them.",
		},
		{
			q: "What does a construction marketing agency cost in Chicago?",
			a: "We do not publish a price. After the free audit you get a scope based on your trades, your service area, and whether ads are included. Media spend, if any, is paid to the ad platform.",
		},
		{
			q: "Will you promise a cost per lead?",
			a: "No. Lead cost depends on the trade, the area, and the offer. We will tell you what the tracking shows after the work is running. We will not invent a number to win the first call.",
		},
	],
	links: [
		{ href: "/services/seo/", label: "Chicago SEO services", note: "Project-and-place pages, and the technical work under them." },
		{ href: "/services/paid-advertising/", label: "Paid advertising", note: "For the searches that cannot wait on organic." },
		{ href: "/services/web-design/", label: "Web design", note: "When the site cannot show the work or take the lead." },
		{ href: "/industries/home-services/", label: "Home services", note: "Related trades with a similar call-driven search." },
		{ href: "/industries/hvac/", label: "HVAC", note: "Seasonal and emergency searches, scoped differently." },
		{ href: "/neighborhoods/", label: "Neighborhoods", note: "Where a remodel search actually names the place." },
		{ href: "/suburbs/", label: "Suburbs", note: "Town pages for contractors who work outside the city." },
		{ href: "/results/", label: "Published results", note: "Bidview's figures, with the source. Not a construction average." },
		{ href: "/free-seo-audit/", label: "Free audit", note: "Send the site. We follow up within one business day." },
	],
};

const law: DepthPage = {
	title: "Law Firm Marketing in Chicago",
	description:
		"Marketing for Chicago law firms. Practice-area search, what the pages can say, what you receive, and how the work is scoped. Free audit.",
	h1: "Marketing for law firms in Chicago",
	eyebrow: "Law firms",
	lede: "Law firm marketing in Chicago is competitive, and the words on the page have to be ones the firm can defend. This is a lighter brief than a full legal-marketing manual: what the work includes, how claims are handled, and how a scope gets written.",
	sections: [
		{
			heading: "What the pages are allowed to do",
			paragraphs: [
				"Illinois advertising rules apply to the site, the ads, and the content. We do not draft around them. The firm, or its compliance reviewer, owns the final say on anything that could be read as a result, a guarantee, or a comparison.",
				"We will not invent case results, verdict amounts, or win rates to make a page convert. If a claim cannot be sourced and reviewed, it does not ship.",
			],
		},
		{
			heading: "What the engagement includes",
			paragraphs: [
				"Practice-area pages that match how people search, a site that can take a consultation request, and paid search when the firm wants to buy the click and the tracking can tell a consultation from a tire-kicker. Content supports the practice areas. It is not a separate blog for its own sake.",
				"Personal injury, family law, and a business practice do not share one landing page. If the firm has several practices, the proposal says which ones are in scope.",
			],
		},
	],
	deliverables: [
		{ title: "Audit", body: "The site, the local profile, and the practice-area searches that should have a page." },
		{ title: "A page map", body: "Which practice areas get a URL, and which claims need a reviewer before they are published." },
		{ title: "Consultation path", body: "The form or call, and what is tracked. Volume is not the same as a matter the firm wants." },
		{ title: "Ads, if they are in scope", body: "Search campaigns with negatives, and a landing page that matches the query. Media is paid to the platform." },
		{ title: "A monthly note", body: "What was published, what was reviewed, and the consultations the tracking can see." },
	],
	pricingHeading: "How law firm marketing is priced",
	pricing: [
		"A written scope after the audit. It depends on how many practice areas are in play, whether the site needs to be rebuilt, and whether paid search is included.",
		"We do not publish a cost-per-click or a monthly retainer on this page. Legal clicks in Chicago vary too much by practice area for a single number to be honest.",
		"The audit is free. A proposal follows only if the work is a fit.",
	],
	faqs: [
		{
			q: "Do Illinois advertising rules apply to this work?",
			a: "Yes. The site, the ads, and the articles have to be ones the firm can defend. We build with that in mind, and the firm's reviewer has the last word on claims.",
		},
		{
			q: "Will you project a return on ad spend?",
			a: "No. We track cost per consultation when the account can see it. We do not quote a multiple on this page.",
		},
		{
			q: "How long does the organic work take?",
			a: "We will not put a month count on a practice-area term before we have seen the site and the competition. The audit says what looks slow and what can move sooner.",
		},
		{
			q: "Can one firm market several practice areas?",
			a: "Yes. Each area that is in scope gets its own page and, if you buy ads, its own campaign. We do not point every query at the homepage.",
		},
		{
			q: "Do you work with solo practices?",
			a: "Yes, when the work is a fit. The scope is written to the practice, not to a headcount.",
		},
	],
	links: [
		{ href: "/services/seo/", label: "Chicago SEO services", note: "Practice-area pages and the technical work under them." },
		{ href: "/services/paid-advertising/", label: "Paid advertising", note: "Search ads, with the media budget kept separate." },
		{ href: "/services/content-marketing/", label: "Content marketing", note: "Articles a reviewer can actually approve." },
		{ href: "/services/web-design/", label: "Web design", note: "A site that can take a consultation." },
		{ href: "/free-seo-audit/", label: "Free audit", note: "Send the site. We follow up within one business day." },
	],
};

const services: Record<string, DepthPage> = {
	seo,
	"paid-advertising": paid,
	"content-marketing": content,
};

const industries: Record<string, DepthPage> = {
	construction,
	"law-firms": law,
};

export function serviceDepth(slug: string): DepthPage | undefined {
	return services[slug];
}

export function industryDepth(slug: string): DepthPage | undefined {
	return industries[slug];
}
