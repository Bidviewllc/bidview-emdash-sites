// Contact page (design/hsnc/Contact.dc.html): text and the hero photo, with the
// design's wording. *Words* in asterisks are italic; a line break stays one.
import { line, para, type HsPage } from "./types";

const page: HsPage = {
	hero: {
		src: "/assets/hsnc/office-exterior.jpg",
		alt: "The front of the Hearing Solutions of North Carolina office at 464 Jake Alexander Boulevard West, with its sign, white columns and green door",
	},
	text: [
		line("contact_label", "Hero – Label (the page’s H1)", "Contact Our {city}, NC Office"),
		line("contact_display", "Hero – Headline", "We're ready when you are."),
		line("contact_card1_heading", "Card 1 (navy, call) – Headline", "Schedule appointment."),
		para("contact_card1_text", "Card 1 (navy, call) – Text", "We're here Monday through Friday, 8:00 to 5:00. Give us a call, and we'll find the right appointment for you."),
		line("contact_card2_heading", "Card 2 (pricing) – Headline", "See your investment."),
		para("contact_card2_text", "Card 2 (pricing) – Text", "Our pricing is published, so you'll know exactly what to expect before you ever walk through the door."),
		line("contact_card2_button", "Card 2 (pricing) – Button", "New patient information"),
		line("contact_card3_heading", "Card 3 (questions) – Headline", "Have a question?"),
		para("contact_card3_text", "Card 3 (questions) – Text", "Ask away. Call during office hours, or send us a note using the form below, and we'll get right back to you."),
		line("contact_card3_button", "Card 3 (questions) – Button", "Call or message us"),
		para("contact_form_intro", "Message form – Intro line", "Our team reads messages every day we're open, and we'll make sure you get a response before the day's over."),
	],
};
export default page;
