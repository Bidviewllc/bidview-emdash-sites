// About page (design/hsnc/About.dc.html): text, lists and photos, with the
// design's wording. *Words* in asterisks are italic; a line break stays one.
// The team grid comes from the Providers collection, not from here.
import { line, para, photo, type HsPage } from "./types";

const page: HsPage = {
	hero: { src: "/assets/hsnc/team-outside.jpg", alt: "The Hearing Solutions of North Carolina team outside the office" },
	text: [
		line("about_label", "Hero – Label (the page’s H1)", "About Hearing Solutions of North Carolina"),
		line("about_display", "Hero – Headline", "You have our full attention."),
		para(
			"about_story_body",
			"Our story – Text",
			"Walking through our door can be the hardest part. It often means admitting something you've silently managed for years: the TV creeping louder, the smiling and nodding, the dinners out you've started to dread. If any of that sounds familiar, you're in good hands now.\n\nWhen you come see us, we start by listening. Not the rushed kind of checklist listening, but the kind where we genuinely want to know what you've been missing and what you'd most love to hear again.\n\nThen, we take the time to find the right solution.\n\n“Right” isn't a figure of speech here. It's two hours of testing instead of fifteen minutes. It's measuring how your brain processes sound, not just whether your ears detect it. It's choosing from every major brand instead of the one we happen to contract with. It's staying with you forever, for every bit of fine-tuning you need along the way.\n\nBecause hearing isn't just sound. It's connection.\nAnd *that* deserves our full attention.",
		),
		line("about_shared_heading", "Hearing, shared. – Headline", "Hearing, shared."),
		para(
			"about_shared_text",
			"Hearing, shared. – Text",
			"If you end up needing hearing aids and choose our subscription plan, there's a built-in bonus for our community.\n\nWhen your hearing aids come back to us at the end of your term, we send them to the manufacturer to be fully serviced, then pass them on through Hearing the Call—a nonprofit that gets working hearing aids to people right here who can't afford them. That way, the technology that brought your world back to you can do the same for a neighbor.",
		),
		line("about_gallery_heading", "Where it all happens. – Headline", "Where it all happens."),
		line("about_gallery_intro", "Where it all happens. – Description", "We want you to feel comfortable before you ever walk in, so here's a look around."),
		line("about_team_title", "Meet your team. – Headline", "Meet your team."),
		para(
			"about_team_intro",
			"Meet your team. – Description (the people: Providers)",
			"Here, you're the whole team's patient—and with both audiologists and hearing instrument specialists on staff, someone's always the right fit for what you need, right when you need it.",
		),
		line("about_reviews_heading", "Reviews – Headline", "What our patients say."),
		line("about_location_heading", "Location – Headline", "Visit us in {city}."),
		line("about_closing_heading", "Closing – Headline", "Come sit with us."),
		para("about_closing_text", "Closing – Text", "Whenever you're ready, we're here—with the time, the team, and the attention you deserve."),
	],
	lists: [
		{
			after: "about_story_body",
			field: "about_values",
			label: "Value cards (three, in order: clock, people, handshake icons)",
			sub: [{ slug: "t", label: "Heading (*italic*)" }, { slug: "d", label: "Text", type: "text" }],
			default: [
				{ t: "You have our *time.*", d: "We won't rush you through your visit to get to the next. Understanding your hearing takes as long as it takes." },
				{ t: "You have our *devotion.*", d: "We don't stop at “good enough.” We work until it's the best we can offer, and we don't disappear once we find it." },
				{ t: "You have our *word.*", d: "Our prices are published, plain as day, and our advice is honest. We'll never try to sell you something you don't need." },
			],
		},
	],
	photos: [
		photo("about_story_photo", "Our story – Photo", "/assets/hsnc/dr-oden-door.jpg", "Dr. Lorin Oden smiling as she holds the front door of the Hearing Solutions office open"),
		photo("about_shared_photo", "Hearing, shared. – Photo", "/assets/hsnc/fitting-hearing-shared.jpg", "Audiologist fitting a hearing aid on a smiling patient"),
		photo("about_gallery_1", "Office gallery – Photo 1", "/assets/hsnc/office-testing-room.jpg", "Testing room with seating, a wheelchair ramp and the open sound booth door"),
		photo("about_gallery_2", "Office gallery – Photo 2", "/assets/hsnc/office-sound-booth.jpg", "Sound booth with an accessible ramp beside the audiologist desk"),
		photo("about_gallery_3", "Office gallery – Photo 3", "/assets/hsnc/office-testing-room-2.jpg", "Second testing room with a sound booth and testing computer"),
		photo("about_gallery_4", "Office gallery – Photo 4", "/assets/hsnc/office-consultation.jpg", "Consultation office with a desk, certificates and a display of hearing devices"),
		photo("about_gallery_5", "Office gallery – Photo 5", "/assets/hsnc/office-consultation-bright.jpg", "Bright consultation office with an oval desk and two windows"),
		photo("about_gallery_6", "Office gallery – Photo 6", "/assets/hsnc/office-check-in.jpg", "Front check-in window and the hallway to the exam rooms"),
		photo("about_gallery_7", "Office gallery – Photo 7", "/assets/hsnc/office-photo-wall.jpg", "Better Together wall of patient photos above a round table"),
		photo("about_gallery_8", "Office gallery – Photo 8", "/assets/hsnc/office-waiting-area.jpg", "Waiting area with Hearing the Call outreach photos on the wall"),
		photo("about_gallery_9", "Office gallery – Photo 9", "/assets/hsnc/office-community-wall.jpg", "Community wall showing the practice's local sponsorships and volunteer work"),
		photo("about_gallery_10", "Office gallery – Photo 10", "/assets/hsnc/office-coffee.jpg", "Coffee and refreshment station for patients"),
		photo("about_gallery_11", "Office gallery – Photo 11", "/assets/hsnc/office-restroom.jpg", "Accessible restroom with grab bars"),
		photo("about_gallery_12", "Office gallery – Photo 12", "/assets/hsnc/office-lounge.jpg", "Quiet lounge with armchairs and plants"),
		photo("about_closing_photo", "Closing – Photo", "/assets/hsnc/team-chatting-patient.jpg", "Team member chatting with a patient wearing a hearing aid in the office"),
	],
};
export default page;
