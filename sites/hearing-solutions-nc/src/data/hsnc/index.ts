// Every HSNC page module, keyed by its PAGES slug (src/data/page-settings.ts).
import type { HsPage } from "./types";
import about from "./about";
import book from "./book";
import contact from "./contact";
import home from "./home";
import newPatients from "./new-patients";
import services from "./services";

export const HS_PAGES: Record<string, HsPage> = {
	home,
	about,
	services,
	"patient-resources": newPatients,
	contact,
	"book-appointment": book,
};
