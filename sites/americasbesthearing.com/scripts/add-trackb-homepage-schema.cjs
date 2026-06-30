const fs = require("fs");
const path = require("path");

const seedPath = path.join(process.cwd(), "seed", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const collections = [
	{
		slug: "homepages",
		label: "Homepages",
		labelSingular: "Homepage",
		supports: ["drafts", "revisions", "seo"],
		fields: [
			["hero_eyebrow", "Hero Eyebrow", "string"],
			["hero_headline", "Hero Headline", "text"],
			["hero_cta_text", "Hero Button Text", "string"],
			["hero_cta_url", "Hero Button URL", "url"],
			["intro_kicker", "Intro Kicker", "string"],
			["intro_headline", "Intro Headline", "string"],
			["intro_body", "Intro Body", "text"],
			["intro_primary_cta_text", "Intro Primary Button Text", "string"],
			["intro_primary_cta_url", "Intro Primary Button URL", "url"],
			["intro_secondary_cta_text", "Intro Secondary Button Text", "string"],
			["intro_secondary_cta_url", "Intro Secondary Button URL", "url"],
			["about_heading", "About Heading", "string"],
			["about_body", "About Body", "text"],
			["locations_heading", "Locations Heading", "string"],
			["locations_body", "Locations Body", "text"],
			["audiology_services_heading", "Audiology Services Heading", "string"],
			["hearing_aid_services_heading", "Hearing Aid Services Heading", "string"],
			["faq_heading", "FAQ Heading", "string"],
			["faq_body", "FAQ Body", "text"],
			["testimonials_heading", "Testimonials Heading", "string"],
			["testimonials_subheading", "Testimonials Subheading", "string"],
			["news_kicker", "News Kicker", "string"],
			["news_heading", "News Heading", "string"],
			["news_body", "News Body", "text"],
		].map(([slug, label, type]) => ({ slug, label, type })),
	},
	{
		slug: "homepage_images",
		label: "Homepage Intro Carousel Images",
		labelSingular: "Homepage Intro Carousel Image",
		supports: ["drafts", "revisions"],
		fields: [
			{ slug: "title", label: "Title", type: "string", required: true },
			{ slug: "image", label: "Image", type: "image", required: true },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	},
	{
		slug: "staff",
		label: "Staff",
		labelSingular: "Staff Member",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "name", label: "Name", type: "string", required: true, searchable: true },
			{ slug: "role", label: "Role", type: "string", searchable: true },
			{ slug: "locations", label: "Location Labels", type: "string" },
			{ slug: "location_slugs", label: "Assigned Location Slugs", type: "multiSelect", validation: { options: ["lansing-mi", "portage-mi", "anoka-mn", "eden-prairie-mn", "edina-mn", "maple-grove-mn", "mendota-heights-mn", "new-ulm-mn", "roseville-mn", "willmar-mn", "lake-wales-fl", "sebring-fl", "winter-haven-fl"] } },
			{ slug: "profile_url", label: "Profile URL", type: "url" },
			{ slug: "image", label: "Headshot", type: "image" },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	},
	{
		slug: "locations",
		label: "Locations",
		labelSingular: "Location",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "name", label: "Location Name", type: "string", required: true, searchable: true },
			{ slug: "address", label: "Address", type: "text" },
			{ slug: "phone", label: "Phone Number", type: "string" },
			{ slug: "appointment_url", label: "Appointment URL", type: "url" },
			{ slug: "directions_url", label: "Directions URL", type: "url" },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	},
	{
		slug: "service_items",
		label: "Service Section Items",
		labelSingular: "Service Section Item",
		supports: ["drafts", "revisions", "search"],
		fields: [
			{ slug: "title", label: "Title", type: "string", required: true, searchable: true },
			{ slug: "body", label: "Body", type: "text" },
			{ slug: "group", label: "Group", type: "select", validation: { options: ["audiology", "hearing_aids"] } },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	},
	{
		slug: "faqs",
		label: "FAQs",
		labelSingular: "FAQ",
		supports: ["drafts", "revisions", "search"],
		fields: [
			{ slug: "question", label: "Question", type: "string", required: true, searchable: true },
			{ slug: "answer", label: "Answer", type: "text", searchable: true },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	},
	{
		slug: "testimonials",
		label: "Testimonials",
		labelSingular: "Testimonial",
		supports: ["drafts", "revisions", "search"],
		fields: [
			{ slug: "quote", label: "Quote", type: "text", required: true, searchable: true },
			{ slug: "name", label: "Name", type: "string" },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	},
];

const bySlug = new Map((seed.collections || []).map((collection) => [collection.slug, collection]));
for (const collection of collections) bySlug.set(collection.slug, collection);
seed.collections = Array.from(bySlug.values());

seed.content = seed.content || {};
seed.content.homepages = [
	{
		id: "home",
		slug: "home",
		status: "published",
		data: {
			hero_eyebrow: "Your Hearing, Our Expertise.",
			hero_headline: "Let our hearing professionals help you reconnect to what matters most!",
			hero_cta_text: "Schedule your Appointment",
			hero_cta_url: "/request-an-appointment/",
			intro_kicker: "Michigan, Minnesota, and Florida",
			intro_headline: "Audiologists, Hearing Aid Specialists & Hearing Aids",
			intro_body: "Welcome to America's Best Hearing! Our team of experienced audiologists and hearing specialists are dedicated to helping you reconnect with the sounds you love through advanced hearing tests, personalized hearing solutions, and the latest hearing aid technology.\n\nWith compassionate care and tailored solutions, we make it simple to hear clearly and live confidently every day.",
			intro_primary_cta_text: "View our Services",
			intro_primary_cta_url: "/audiology-services/hearing-aid-services/",
			intro_secondary_cta_text: "Meet Our Team",
			intro_secondary_cta_url: "/our-team/",
			about_heading: "America's Best Hearing",
			about_body: "At America's Best Hearing, we believe life is meant to be heard clearly and fully.\n\nFrom conversations with loved ones to the simple joy of a child's giggle, sound connects us to the world. That's why our expert audiologists and hearing aid specialists are dedicated to restoring your hearing with personalized care and advanced technology.\n\nServing communities across Michigan, Minnesota, and Florida, we aim to provide the best hearing solutions and compassionate support you deserve.",
			locations_heading: "Our Office Locations",
			locations_body: "At America's Best Hearing in Michigan, Minnesota, & Florida, we handle many kinds of hearing problems. If you feel like your hearing is not what it used to be, we are here to help.",
			audiology_services_heading: "Audiology Services Offered at America's Best Hearing in Michigan, Minnesota, and Florida",
			hearing_aid_services_heading: "Our Hearing Aids & Protection Solutions Offered at America's Best Hearing in Michigan, Minnesota, and Florida",
			faq_heading: "Frequently Asked Questions",
			faq_body: "Can't find the answers you're looking for? Contact Us.",
			testimonials_heading: "What Our Patients Are Saying",
			testimonials_subheading: "Real Reviews & Testimonials",
			news_kicker: "From the Experts",
			news_heading: "News & Articles",
			news_body: "Explore the latest hearing health tips, company updates, and industry news to stay informed and connected.",
		},
	},
];

seed.content.service_items = [
	["audiology-hearing-evaluations", "Hearing Evaluations", "America's Best Hearing provides hearing evaluations to better understand your hearing and recommend the right next steps.", "audiology", 1],
	["audiology-hearing-aid-fittings", "Hearing Aid Fittings", "Our specialists fit and program hearing aids so your devices support your everyday listening needs.", "audiology", 2],
	["audiology-ear-wax-removal", "Ear Wax Removal", "We offer professional ear wax removal to help address buildup that may affect hearing or comfort.", "audiology", 3],
	["audiology-hearing-aid-services", "Hearing Aid Services", "Our team provides hearing aid maintenance, adjustments, and ongoing support.", "audiology", 4],
	["hearing-protection", "Hearing Protection", "Protect your hearing with custom solutions for work, music, water, and recreational noise exposure.", "hearing_aids", 1],
	["hearing-aid-brands", "Hearing Aid Brands", "We work with trusted hearing aid brands and help patients choose technology that fits their needs.", "hearing_aids", 2],
	["assistive-listening-devices", "Assistive Listening Devices", "Assistive listening devices can improve communication in specific settings and pair well with hearing aids.", "hearing_aids", 3],
	["custom-ear-protection", "Custom Ear Protection", "Custom ear protection is shaped for comfort and designed for reliable protection.", "hearing_aids", 4],
].map(([id, title, body, group, sort_order]) => ({ id, slug: id, status: "published", data: { title, body, group, sort_order } }));

const serviceCollection = seed.collections.find((collection) => collection.slug === "service_items");
if (serviceCollection) {
	const serviceFields = serviceCollection.fields.filter((field) => field.slug !== "group");
	seed.collections = seed.collections.filter((collection) => collection.slug !== "service_items");
	for (const [slug, label, labelSingular] of [
		["audiology_services", "Audiology Services", "Audiology Service"],
		["hearing_aid_services", "Hearing Aid Services", "Hearing Aid Service"],
	]) {
		seed.collections.push({
			slug,
			label,
			labelSingular,
			supports: serviceCollection.supports,
			fields: serviceFields,
		});
	}
}
seed.content.audiology_services = seed.content.service_items
	.filter((item) => item.data.group === "audiology")
	.map((item) => ({ ...item, data: { title: item.data.title, body: item.data.body, sort_order: item.data.sort_order } }));
seed.content.hearing_aid_services = seed.content.service_items
	.filter((item) => item.data.group === "hearing_aids")
	.map((item) => ({ ...item, data: { title: item.data.title, body: item.data.body, sort_order: item.data.sort_order } }));
delete seed.content.service_items;

seed.content.faqs = [
	["need-hearing-aid", "How do I know if I need a hearing aid?", "If you often struggle to follow conversations, regularly turn up the TV or radio, or feel that people around you are mumbling, it may be time for a hearing evaluation.", 1],
	["without-hearing-test", "Can I get a hearing aid without a hearing test?", "Over-the-counter hearing aids can be purchased without a test, but a professional hearing exam gives you a clearer understanding of your hearing needs and the best treatment options.", 2],
	["how-long-hearing-aids-last", "How long do hearing aids last?", "On average, hearing aids last about 3 to 7 years. Their lifespan depends on the model, how frequently they are used, and how well they are cared for.", 3],
	["hearing-aids-vs-psaps", "What is the difference between hearing aids and personal sound amplification products (PSAPs)?", "Hearing aids are FDA-regulated medical devices designed to treat hearing loss. PSAPs only amplify sound and are not intended to treat diagnosed hearing loss.", 4],
].map(([id, question, answer, sort_order]) => ({ id, slug: id, status: "published", data: { question, answer, sort_order } }));

fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, "\t")}\n`, "utf8");
console.log("Updated seed with Track B homepage schema.");
