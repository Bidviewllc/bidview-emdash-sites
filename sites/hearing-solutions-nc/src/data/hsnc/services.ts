// Services hub (design/hsnc/Services.dc.html): the page's own text, with the
// design's wording. Each service's block (heading, text, fold-out rows, note,
// second button) lives on its Services record instead; the design's wording for
// those is in src/data/practice.ts. *Words* in asterisks are italic.
import { line, para, type HsPage } from "./types";

const page: HsPage = {
	hero: { src: "/assets/hsnc/earigator.jpg", alt: "A Hearing Solutions team member performing an Earigator earwax removal on a smiling patient" },
	text: [
		line("services_label", "Hero – Label (the page’s H1)", "Hearing Care Services in {city}, NC"),
		line("services_display", "Hero – Headline", "Ear help, whatever the reason."),
		para("services_intro", "Hero – Description", "Hearing loss is most of what we see, but it isn't all of it.\n\nRinging, wax, custom molds, protection for work or shooting, support for or repairs on hearing aids you bought somewhere else—we handle all of it, right here in {city}."),
		line("services_call_heading", "Sidebar call box – Headline", "Let's talk today."),
		para("services_call_text", "Sidebar call box – Text", "Most patients tell us they wish they'd come in sooner."),
		line("services_reviews_heading", "Reviews – Headline", "What our patients say."),
	],
};
export default page;
