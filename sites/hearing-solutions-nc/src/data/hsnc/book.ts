// Book appointment page. No HSNC board: built from the HSNC parts (split hero,
// navy call bar, request form, office card). Liz, 2026-10-19: keep the page,
// request form only (HSNC books by phone, no scheduler embed). The intro line is
// the current site's (hearingsolutionsofnc.com/schedule-online).
import { line, para, photo, type HsPage } from "./types";

const page: HsPage = {
	text: [
		line("book_label", "Hero – Label (the page’s H1)", "Request an Appointment"),
		line("book_display", "Hero – Headline", "We're ready when you are."),
		line("book_phone_heading", "Call bar – Headline", "The fastest way to book is to call us."),
		line("book_form_title", "Request form – Heading", "Request an appointment."),
		para("book_form_lead", "Request form – Intro line", "Use the form below to request an appointment. Our staff will reach out to you to finalize your appointment time."),
	],
	photos: [photo("book_hero_photo", "Hero – Photo", "/assets/hsnc/care-coordinator-phone.jpg", "Patient care coordinator on the phone at her desk")],
};
export default page;
