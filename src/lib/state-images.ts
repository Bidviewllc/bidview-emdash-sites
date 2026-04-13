/**
 * Returns a curated Unsplash Source URL for each US state.
 * Uses recognizable city/landmark keywords per state.
 * No API key required.
 */

const STATE_KEYWORDS: Record<string, string> = {
	alabama: "alabama,birmingham,southern",
	alaska: "alaska,anchorage,mountains",
	arizona: "arizona,phoenix,desert,grand-canyon",
	arkansas: "arkansas,little-rock,ozarks",
	california: "california,los-angeles,palm-trees",
	colorado: "colorado,denver,rocky-mountains",
	connecticut: "connecticut,hartford,new-england",
	delaware: "delaware,wilmington,coast",
	florida: "florida,miami,beach,palm-trees",
	georgia: "georgia,atlanta,southern",
	hawaii: "hawaii,honolulu,beach,tropical",
	idaho: "idaho,boise,mountains,wilderness",
	illinois: "illinois,chicago,skyline",
	indiana: "indiana,indianapolis,midwest",
	iowa: "iowa,des-moines,farmland",
	kansas: "kansas,wichita,plains",
	kentucky: "kentucky,louisville,bluegrass,horses",
	louisiana: "louisiana,new-orleans,bayou",
	maine: "maine,portland,lighthouse,coast",
	maryland: "maryland,baltimore,harbor",
	massachusetts: "massachusetts,boston,historic",
	michigan: "michigan,detroit,great-lakes",
	minnesota: "minnesota,minneapolis,lakes",
	mississippi: "mississippi,jackson,delta",
	missouri: "missouri,kansas-city,arch",
	montana: "montana,billings,mountains,big-sky",
	nebraska: "nebraska,omaha,plains",
	nevada: "nevada,las-vegas,desert",
	"new-hampshire": "new-hampshire,manchester,white-mountains",
	"new-jersey": "new-jersey,jersey-shore,boardwalk",
	"new-mexico": "new-mexico,santa-fe,desert,adobe",
	"new-york": "new-york,new-york-city,manhattan,skyline",
	"north-carolina": "north-carolina,charlotte,blue-ridge",
	"north-dakota": "north-dakota,fargo,plains,prairie",
	ohio: "ohio,cleveland,cincinnati",
	oklahoma: "oklahoma,oklahoma-city,plains",
	oregon: "oregon,portland,forest,coast",
	pennsylvania: "pennsylvania,philadelphia,liberty",
	"rhode-island": "rhode-island,providence,coast",
	"south-carolina": "south-carolina,charleston,southern,historic",
	"south-dakota": "south-dakota,mount-rushmore,badlands",
	tennessee: "tennessee,nashville,music",
	texas: "texas,austin,houston,skyline",
	utah: "utah,salt-lake-city,mountains,arches",
	vermont: "vermont,burlington,green-mountains,fall",
	virginia: "virginia,richmond,blue-ridge,historic",
	washington: "washington,seattle,space-needle,pacific",
	"west-virginia": "west-virginia,charleston,mountains",
	wisconsin: "wisconsin,milwaukee,lake-michigan",
	wyoming: "wyoming,yellowstone,grand-teton",
	"district-of-columbia": "washington-dc,capitol,monuments",
};

/**
 * Get a hero image URL for a state.
 * Returns a local public/state-images/[slug].jpg path.
 * Falls back to a default image if the state isn't recognized.
 */
export function getStateHeroImage(stateSlug: string, _width = 1200, _height = 800): string {
	const slug = stateSlug.toLowerCase();
	if (STATE_KEYWORDS[slug]) {
		return `/state-images/${slug}.jpg`;
	}
	return `/state-images/default.jpg`;
}

/**
 * Get a city hero image URL.
 * Falls back to the parent state's image since we don't generate per-city images yet.
 */
export function getCityHeroImage(_citySlug: string, stateSlug: string, _width = 1200, _height = 800): string {
	return getStateHeroImage(stateSlug);
}
