export interface PlaceProfile {
	slug: string;
	name: string;
	county: string;
	overview: string;
	districts: string;
	industries: string;
	landmarks: string;
	search: string;
}

/** North and west suburbs where this brand actually sells. Facts are public geography, not client results. */
export const SUBURBS: PlaceProfile[] = [
	{
		slug: "libertyville",
		name: "Libertyville",
		county: "Lake County",
		overview:
			"Libertyville is a Lake County village on the Milwaukee District North Metra line. The walkable downtown sits on Milwaukee Avenue, and a lot of day-to-day business still happens there rather than in a mall.",
		districts:
			"Downtown Milwaukee Avenue and Cook Park are the local center. The commercial strips along Milwaukee Avenue, and the roads toward Mundelein and Vernon Hills, are where auto, medical, and home-service businesses actually sit.",
		industries:
			"Independent professional services, medical and dental practices, restaurants, and home services that cover Libertyville plus the nearby unincorporated pockets. Bidview Marketing, the team that does this work, is based in this Libertyville and Chicago area.",
		landmarks:
			"Independence Grove Forest Preserve, the Adler Arts Center, Cook Park, and the downtown Metra station are the reference points residents use when they give directions.",
		search:
			"People search the village name, not a Chicago neighborhood. The same category is often compared with Mundelein and Vernon Hills, so a Libertyville page has to say which town it means.",
	},
	{
		slug: "mundelein",
		name: "Mundelein",
		county: "Lake County",
		overview:
			"Mundelein sits between Libertyville and Vernon Hills. Downtown is on Lake Street, Diamond Lake is on the west side, and a lot of commerce is on the Route 45 and Route 60/83 corridors rather than on a single main street.",
		districts:
			"Lake Street downtown, the Diamond Lake area, and the retail and light-industrial frontage on Routes 45, 60, and 83. Those corridors are different markets from the downtown blocks.",
		industries:
			"Trades and light industrial along the highways, neighborhood retail, schools-driven family services, and medical offices that draw from both Mundelein and the surrounding townships.",
		landmarks:
			"Diamond Lake, the downtown Metra station on the Milwaukee District North line, and the Carmel Catholic / Mundelein High School area are the usual landmarks.",
		search:
			"Searches are town-specific. A business on Route 45 is not the same query as a business on Lake Street, and residents also compare Mundelein with Libertyville.",
	},
	{
		slug: "vernon-hills",
		name: "Vernon Hills",
		county: "Lake County",
		overview:
			"Vernon Hills is a retail and office suburb more than a traditional downtown. Hawthorn and the Milwaukee Avenue strip carry most of the commercial traffic.",
		districts:
			"Hawthorn Mall and the Milwaukee Avenue retail frontage are the public face. Office buildings, including the CDW headquarters campus, sit off that same corridor.",
		industries:
			"Regional retail, healthcare, corporate offices, and the restaurants and services that feed them. Local home services compete with firms that advertise to all of central Lake County.",
		landmarks:
			"Hawthorn, the Milwaukee Avenue commercial strip, and the CDW campus are the names people use instead of a neighborhood.",
		search:
			"Queries use Vernon Hills or Hawthorn. Shoppers are often willing to drive from Libertyville, Mundelein, or Lincolnshire, so the town name and the mall name both show up.",
	},
	{
		slug: "lake-forest",
		name: "Lake Forest",
		county: "Lake County",
		overview:
			"Lake Forest is a North Shore suburb on the Union Pacific North Metra line. Market Square and the streets around it are the commercial center, and the residential blocks are deliberately low-density.",
		districts:
			"Market Square and Western Avenue are the downtown. A second cluster of medical and professional offices sits near Northwestern Medicine Lake Forest Hospital.",
		industries:
			"Professional services, private medical practices, home services for large properties, and a smaller set of boutiques and restaurants. The buyer is local and comparison-heavy.",
		landmarks:
			"Market Square, the Metra station, Lake Forest College, and Northwestern Medicine Lake Forest Hospital.",
		search:
			"The modifier is Lake Forest, not a Chicago neighborhood and not 'near me' alone. People also distinguish downtown Market Square from the west side of town toward I-94.",
	},
	{
		slug: "highland-park",
		name: "Highland Park",
		county: "Lake County",
		overview:
			"Highland Park's downtown is the Central Avenue and St. Johns corridor, with Port Clinton Square as the public plaza. It is on the Union Pacific North line, between Highwood and Glencoe.",
		districts:
			"Downtown Central Avenue, the Ravinia area on the south side of town, and the commercial frontage nearer the highway. Summer hospitality around Ravinia is a different calendar from the year-round downtown.",
		industries:
			"Professional services, medical offices, restaurants, specialty retail, and home services. Ravinia season adds short-stay hospitality demand that the rest of the year does not have.",
		landmarks:
			"Port Clinton Square, the downtown Metra station, Ravinia Festival, and the lakefront parks.",
		search:
			"Searches use Highland Park, downtown Highland Park, or Ravinia. Residents do not describe themselves with a Chicago community-area name.",
	},
	{
		slug: "evanston",
		name: "Evanston",
		county: "Cook County",
		overview:
			"Evanston is the first suburb north of Chicago and the home of Northwestern University. It has several business districts, not one downtown, and the university calendar changes foot traffic.",
		districts:
			"Downtown Evanston at Davis Street and the Metra and Purple Line, Central Street, Main Street, Dempster Street, and the Chicago Avenue corridor. Each one has its own storefront mix.",
		industries:
			"Restaurants, professional services, healthcare, campus-adjacent retail, and home services for both houses and multi-unit buildings. A campaign for downtown is not a campaign for Central Street.",
		landmarks:
			"Northwestern University, the Davis Street station, the lakefront, and the Dempster Street commercial stretch.",
		search:
			"People search Evanston, a street name, or 'near Northwestern.' Chicago neighborhood terms do not capture it.",
	},
	{
		slug: "skokie",
		name: "Skokie",
		county: "Cook County",
		overview:
			"Skokie has a village downtown on Oakton and a separate regional shopping district at Old Orchard. Those two places do not share customers in the way a single main street would.",
		districts:
			"Downtown Skokie along Oakton and Lincoln, the Dempster Street corridor, and Westfield Old Orchard on the east side near Evanston.",
		industries:
			"Diverse retail and restaurants, medical offices, professional services, and home services. Old Orchard pulls regional shoppers; downtown Skokie is more local.",
		landmarks:
			"Westfield Old Orchard, the Illinois Holocaust Museum, downtown Oakton Street, and the Yellow Line terminus at Dempster-Skokie.",
		search:
			"Queries split between Skokie, Old Orchard, and Dempster. Some searches say 'near Evanston' because Old Orchard sits on that border.",
	},
	{
		slug: "glenview",
		name: "Glenview",
		county: "Cook County",
		overview:
			"Glenview has an older downtown on Glenview Road and a newer district, The Glen, built on the former Naval Air Station. They are miles apart and show up as different searches.",
		districts:
			"Downtown Glenview at Glenview Road and the Metra Milwaukee District North station, The Glen Town Center, and the Golf Road office and retail corridor.",
		industries:
			"Corporate offices, medical practices, family retail, restaurants, and home services. Office-park businesses on Golf Road are a different sale from a downtown storefront.",
		landmarks:
			"The Glen Town Center, the former naval air station site, downtown Glenview, and the Glenview Metra station.",
		search:
			"People say Glenview, The Glen, or Golf Road. A single 'Glenview' page has to name which district it is talking about.",
	},
	{
		slug: "northbrook",
		name: "Northbrook",
		county: "Cook County",
		overview:
			"Northbrook's local downtown is on Shermer Road. A separate commercial world sits at Northbrook Court and along the Lake-Cook Road corporate corridor.",
		districts:
			"Downtown Shermer Road, Northbrook Court, and the Lake-Cook Road office parks that straddle the Cook and Lake county line.",
		industries:
			"Corporate campuses, professional services, retail, medical offices, and home services for a high-income residential base. Lake-Cook businesses often serve both Northbrook and Deerfield.",
		landmarks:
			"Northbrook Court, downtown Shermer Road, and the Lake-Cook Road office corridor.",
		search:
			"Searches use Northbrook, Northbrook Court, or Lake-Cook Road. Commuters search from the office park, not from a Chicago-style neighborhood name.",
	},
	{
		slug: "arlington-heights",
		name: "Arlington Heights",
		county: "Cook County",
		overview:
			"Downtown Arlington Heights is built around the Union Pacific Northwest Metra station. The rest of the village's commerce is on Golf Road, Rand Road, and the former Arlington Park site.",
		districts:
			"The Vail Avenue and Campbell Street blocks by the station, the Northwest Highway frontage, Golf Road, Rand Road, and the Arlington Park redevelopment.",
		industries:
			"Downtown dining and personal services, corridor retail, medical offices, and home services. The downtown evening crowd and the Golf Road errand traffic are not the same customer.",
		landmarks:
			"The downtown Metra station, North School Park, and the Arlington Park property.",
		search:
			"The high-intent modifier is often 'downtown Arlington Heights,' not the village name alone. Corridor businesses get 'Golf Road' and 'Rand Road' queries.",
	},
	{
		slug: "schaumburg",
		name: "Schaumburg",
		county: "Cook County",
		overview:
			"Schaumburg is one of the largest suburban job centers in the region. Woodfield and the I-90 office parks are the landmarks, and there is no single walkable downtown that stands in for the village.",
		districts:
			"Woodfield Mall and Streets of Woodfield, the Golf Road and Higgins Road corridors, and the I-90 office parks. Each corridor has its own traffic pattern.",
		industries:
			"Regional retail, corporate offices, hotels, restaurants that feed the office parks, medical campuses, and home services covering a very large village.",
		landmarks:
			"Woodfield Mall, Streets of Woodfield, and the I-90 / Golf Road office cluster. IKEA is a common direction-giver on the retail side.",
		search:
			"People search Schaumburg, Woodfield, or a road name. They do not search it as a Chicago neighborhood, and a Chicago-only page will not match the query.",
	},
	{
		slug: "naperville",
		name: "Naperville",
		county: "DuPage County",
		overview:
			"Naperville is a large DuPage city with a nationally known downtown on the Riverwalk and a separate retail world on Route 59 and Ogden Avenue. Those are different markets.",
		districts:
			"Downtown Naperville and the Riverwalk, the Ogden Avenue corridor, and the Route 59 retail strip on the south side. Residents treat them as separate places.",
		industries:
			"Professional services, medical groups, home services, restaurants, and specialty retail. Downtown is competitive and foot-traffic driven. The south corridors are auto-oriented.",
		landmarks:
			"The Riverwalk, the Naperville Metra station on the BNSF line, and the Route 59 shopping area.",
		search:
			"Naperville is a high-volume town modifier. Downtown queries and Route 59 queries should not be written as if they were the same business district.",
	},
	{
		slug: "oak-brook",
		name: "Oak Brook",
		county: "DuPage County",
		overview:
			"Oak Brook is a small village with an outsized office and retail base. Oakbrook Center and the I-88 / 22nd Street / Butterfield Road campuses are the commercial map, not a residential main street.",
		districts:
			"Oakbrook Center, the 22nd Street retail frontage, and the Butterfield Road and I-88 office corridor.",
		industries:
			"Headquarters and professional services, retail at the mall, hotels, and business services that sell to the office campuses. Consumer storefronts are a smaller share than in a town like Naperville.",
		landmarks:
			"Oakbrook Center and the Butterfield Road office corridor. People give directions by the mall or by an office campus, not by a neighborhood grid.",
		search:
			"Searches are Oak Brook, Oakbrook Center, or the name of a campus. A lot of the demand is weekday and B2B.",
	},
	{
		slug: "waukegan-gurnee",
		name: "Waukegan and Gurnee",
		county: "Lake County",
		overview:
			"Waukegan and Gurnee share a border and almost none of the same commercial identity. Waukegan is a lakefront city with a downtown and a harbor. Gurnee is a regional retail and tourism stop on Grand Avenue.",
		districts:
			"Waukegan: downtown Genesee Street and the harbor. Gurnee: Gurnee Mills, Six Flags Great America, and the Grand Avenue retail strip. Home-service companies often cover both. A retailer usually does not.",
		industries:
			"Waukegan has local services, healthcare, and industrial employment tied to the lakefront city. Gurnee has outlet retail, entertainment, hotels, and the restaurants around them.",
		landmarks:
			"Waukegan Harbor, the Genesee Street downtown, the Waukegan Metra and Amtrak station, Gurnee Mills, and Six Flags Great America.",
		search:
			"People search one town or the other. A page that only says Waukegan will miss Gurnee Mills queries, and a page that only says Gurnee will miss the lakefront city. This hub covers both and keeps them distinct.",
	},
];

export interface NeighborhoodNotes {
	overview: string;
	points: string[];
}

/** Public geography for the Chicago neighborhood hubs. No client counts. */
export const NEIGHBORHOOD_NOTES: Record<string, NeighborhoodNotes> = {
	"lincoln-park": {
		overview: "Lincoln Park runs along the lakefront from North Avenue toward Diversey, with the park and the zoo on the east and DePaul's Lincoln Park campus inland. Armitage, Halsted, and Clark are the main retail streets.",
		points: [
			"Retail streets: Armitage Avenue, Lincoln Avenue, Clark Street, and the Halsted corridor near DePaul.",
			"The mix is restaurants, boutiques, medical and professional offices, and services aimed at a dense residential neighborhood.",
			"Landmarks people use: Lincoln Park Zoo, the Conservatory, North Avenue Beach, and the DePaul campus.",
			"Searches use Lincoln Park, a street name, or 'near the zoo.' The neighborhood name is the modifier, not the city alone.",
		],
	},
	"wicker-park": {
		overview: "Wicker Park is the Milwaukee, North, and Damen crossroads on the Blue Line. The commercial core is a few blocks in each direction from that intersection.",
		points: [
			"The six corners at Milwaukee, North, and Damen, plus Division Street and the Blue Line Damen stop.",
			"Independent retail, restaurants, bars, and creative studios. Chains are present, but the search demand is still for the independent corridor.",
			"Landmarks: the Damen Blue Line station, Wicker Park itself, and the Milwaukee Avenue diagonal.",
			"People search Wicker Park or the intersection. Bucktown, the next neighborhood north, is a different query.",
		],
	},
	"logan-square": {
		overview: "Logan Square centers on the boulevard circle and the Blue Line station. Milwaukee Avenue is the long commercial spine, and Logan Boulevard is a separate residential and small-business edge.",
		points: [
			"The circle at Logan and Milwaukee, the Logan Square Blue Line, and the Milwaukee Avenue stretch toward the square.",
			"Restaurants, bars, professional services, and newer retail along Milwaukee. The boulevard blocks are quieter than the square.",
			"Landmarks: the Illinois Centennial Monument in the square, the Blue Line station, and Logan Boulevard.",
			"Searches say Logan Square or Milwaukee Avenue. Avondale to the north and Wicker Park to the south are adjacent but not interchangeable.",
		],
	},
	"river-north": {
		overview: "River North is the gallery and restaurant district north of the river, roughly from the Merchandise Mart area up toward Chicago Avenue and Oak Street.",
		points: [
			"The gallery rows near Superior and Huron, the Ontario and Ohio restaurant streets, and the State Street and Wells corridors.",
			"Hospitality, galleries, showrooms, and professional offices. A lot of demand is visitor and after-work, not only residents.",
			"Landmarks: the Merchandise Mart, the Chicago River, and the Brown and Purple Line stops at Merchandise Mart.",
			"Searches use River North or a street. The Loop, across the river, is a separate business district.",
		],
	},
	"the-loop": {
		overview: "The Loop is Chicago's downtown core inside the elevated tracks, plus the blocks that share its office and retail market. Weekday commuters and weekend visitors are different audiences.",
		points: [
			"State Street, the pedway and underground retail, Wabash, and the financial blocks along LaSalle.",
			"Offices, professional services, retail, hotels, and restaurants that live and die by the weekday lunch and commute.",
			"Landmarks: the 'L' loop, Millennium Park on the east edge, and the downtown Metra terminals.",
			"Searches say the Loop, downtown, or a building or street. A neighborhood page for a residential area will not match a Loop query.",
		],
	},
	"west-loop": {
		overview: "The West Loop runs west of the river through the Fulton Market food corridor and the older Randolph and Lake Street blocks. It is one of the city's main restaurant and office growth areas.",
		points: [
			"Fulton Market, Randolph Street's restaurant row, and the Lake Street and Washington office conversions.",
			"Restaurants, hospitality, creative and tech offices, and showrooms. The Google and McDonald's campuses anchor the office side.",
			"Landmarks: the Morgan Green and Pink Line station, Fulton Market, and the Randolph restaurant strip.",
			"People search West Loop or Fulton Market. They are not the same phrase as 'the Loop.'",
		],
	},
	"bucktown": {
		overview: "Bucktown is north of Wicker Park, along the Milwaukee Avenue and Damen corridor toward the Western Blue Line. The commercial feel is adjacent to Wicker Park but the name in search is different.",
		points: [
			"Damen Avenue, Milwaukee Avenue north of North Avenue, and the Western Blue Line area.",
			"Restaurants, design-oriented retail, professional services, and home services for the houses off the avenues.",
			"Landmarks: the 606 trail on the north edge, the Western Blue Line, and the Damen retail blocks.",
			"Searches that say Bucktown should not be answered with a Wicker Park page, even though the neighborhoods touch.",
		],
	},
	lakeview: {
		overview: "Lakeview is a large North Side community area. Wrigleyville, Southport, and Broadway are different business strips inside it, and the lake edge is another one.",
		points: [
			"Wrigleyville on Clark, the Southport Corridor, Broadway, and the Belmont and Addison Red Line stops.",
			"Restaurants, bars, fitness, professional services, and retail. Game-day traffic around Wrigley is not the Southport weekday pattern.",
			"Landmarks: Wrigley Field, the Southport shops, and Belmont Harbor.",
			"People search Lakeview, Wrigleyville, or Southport. Those three are not one query.",
		],
	},
	"old-town": {
		overview: "Old Town sits south of Lincoln Park and north of the Near North Side, around Wells Street and the historic district near North Avenue.",
		points: [
			"Wells Street, North Avenue, and the Sedgwick Brown Line area.",
			"Restaurants, entertainment venues, and neighborhood services between the Second City and Steppenwolf corridor and the residential blocks.",
			"Landmarks: the Second City, Steppenwolf Theatre, and the Wells Street strip.",
			"Searches use Old Town or Wells Street. Lincoln Park to the north is the neighboring query, not the same one.",
		],
	},
	"gold-coast": {
		overview: "The Gold Coast is the high-rise residential district along the lake between Oak Street and North Avenue, with Oak Street and Rush Street as the commercial edges.",
		points: [
			"Oak Street, Rush Street, and the Clark and State residential edges.",
			"Luxury retail, hospitality, professional services, and building-level services for high-rises.",
			"Landmarks: Oak Street Beach, the Oak Street retail row, and the lakefront park edge.",
			"Searches say Gold Coast, Oak Street, or Rush Street. The tone of the query is different from a neighborhood like Logan Square.",
		],
	},
	streeterville: {
		overview: "Streeterville is the lakefront district east of Michigan Avenue, between the river and Oak Street. Navy Pier, Northwestern Memorial, and the Magnificent Mile edge define it.",
		points: [
			"Michigan Avenue's east side, Grand Avenue toward Navy Pier, and the hospital campus.",
			"Healthcare, hotels, tourism retail, and professional offices. A large share of searches come from visitors and patients, not only residents.",
			"Landmarks: Navy Pier, Northwestern Memorial Hospital, and the Magnificent Mile.",
			"People search Streeterville, Navy Pier, or 'near Northwestern.' A Michigan Avenue page and a hospital-campus page are different intents.",
		],
	},
	"hyde-park": {
		overview: "Hyde Park is the South Side neighborhood around the University of Chicago, between the lakefront and Washington Park. 53rd and 55th Streets are the main commercial streets.",
		points: [
			"53rd Street, 55th Street, and the Harper Court area next to campus.",
			"Campus-adjacent retail, restaurants, professional services, and medical offices tied to the university and the hospital.",
			"Landmarks: the University of Chicago, the Museum of Science and Industry, and Promontory Point.",
			"Searches use Hyde Park or 53rd Street. It is not reached by a downtown or North Side term.",
		],
	},
	pilsen: {
		overview: "Pilsen is centered on 18th Street and the Pink Line. The commercial heart is 18th, with Halsted and Ashland as the north-south edges.",
		points: [
			"18th Street, the Pink Line 18th station, and the Halsted and Ashland crossings.",
			"Restaurants, galleries, independent retail, and neighborhood services with a long Mexican and Mexican-American business base.",
			"Landmarks: the 18th Street Pink Line, the National Museum of Mexican Art, and the 18th Street commercial strip.",
			"Searches say Pilsen or 18th Street. The neighborhood name matters more than the city name for local intent.",
		],
	},
	bridgeport: {
		overview: "Bridgeport sits along the south branch of the river, with Halsted and 35th as the familiar commercial crossroads and the ballpark on the northeast edge.",
		points: [
			"Halsted Street, 31st, and 35th Street, plus the blocks toward the Orange Line at Halsted.",
			"Neighborhood restaurants, bars, trades, and services for a residential community that also gets ballpark traffic on game days.",
			"Landmarks: Rate Field (Guaranteed Rate Field), the Halsted corridor, and the river's south branch.",
			"People search Bridgeport or 35th Street. Game-day searches are a slice of the market, not the whole market.",
		],
	},
	andersonville: {
		overview: "Andersonville is the Clark Street district in Edgewater, roughly from Foster to Bryn Mawr. It functions as its own shopping street even though it sits inside a larger community area.",
		points: [
			"Clark Street between Foster and Bryn Mawr, with Berwyn as a cross street people name.",
			"Independent retail, restaurants, and professional services on a walkable street with limited parking.",
			"Landmarks: the Clark Street retail strip and the Berwyn Red Line a few blocks east.",
			"Searches say Andersonville or Clark Street. An Edgewater page does not substitute for it.",
		],
	},
	uptown: {
		overview: "Uptown is the North Side community around the Lawrence, Argyle, and Wilson Red Line stops. Argyle is a Vietnamese and Southeast Asian business strip. Broadway and Lawrence are separate corridors.",
		points: [
			"Argyle Street, Broadway, Lawrence Avenue, and the Wilson and Lawrence Red Line stations.",
			"Restaurants and retail on Argyle, entertainment venues on Broadway, and neighborhood services for a dense residential area.",
			"Landmarks: the Argyle Red Line, the Uptown Theatre, and Montrose Beach to the east.",
			"Searches split between Uptown, Argyle, and Broadway. Treating them as one block of copy misses the Argyle strip.",
		],
	},
	edgewater: {
		overview: "Edgewater runs along the lake north of Uptown. Bryn Mawr, Granville, and Broadway are the commercial streets, and Andersonville's Clark Street is the western edge people often mean instead.",
		points: [
			"Bryn Mawr Avenue, Broadway, and the Berwyn and Granville Red Line stops.",
			"Neighborhood retail, medical offices, restaurants, and services for lakefront high-rises and houses.",
			"Landmarks: the lakefront at Bryn Mawr, the Broadway Armory area, and the Red Line.",
			"People search Edgewater, Bryn Mawr, or Andersonville. Those are neighboring queries, not duplicates.",
		],
	},
	"rogers-park": {
		overview: "Rogers Park is the city's far northeast corner, from Devon north to Evanston and from the lake to west of Clark. Clark, Devon, and Morse are different business streets.",
		points: [
			"Clark Street, Devon Avenue's east end, Morse Avenue, and the Loyola and Morse Red Line stops.",
			"Loyola University traffic, immigrant-owned retail, restaurants, and neighborhood services. Devon and Clark do not serve the same shopper.",
			"Landmarks: Loyola University, the Morse Red Line, and the lakefront beaches.",
			"Searches use Rogers Park, Loyola, or a street. Evanston, immediately north, is a different city and a different page.",
		],
	},
	ravenswood: {
		overview: "Ravenswood is the Metra and Brown Line corridor between Lincoln Square and Uptown. The commercial strips are on Montrose, Lawrence, and the streets by the Ravenswood Metra stop.",
		points: [
			"The Ravenswood Metra station area, Montrose Avenue, and Lawrence Avenue.",
			"Small professional offices, restaurants, light industrial leftovers turned into studios, and neighborhood services.",
			"Landmarks: the Ravenswood Metra station, the Brown Line at Montrose and Damen, and the manor district side streets.",
			"People search Ravenswood or Lincoln Square. The two touch, and the station name is often the landmark in the query.",
		],
	},
	"lincoln-square": {
		overview: "Lincoln Square's center is the Lincoln, Lawrence, and Western intersection, with the Lincoln Avenue square and the Western Brown Line.",
		points: [
			"Lincoln Avenue at the square, Lawrence Avenue, and Western Avenue at the Brown Line.",
			"Restaurants, independent retail, professional services, and family-oriented neighborhood businesses.",
			"Landmarks: the Lincoln Square fountain and arch, the Western Brown Line, and the Old Town School of Folk Music nearby.",
			"Searches say Lincoln Square. Ravenswood to the east and North Center to the south are the adjacent names.",
		],
	},
	"albany-park": {
		overview: "Albany Park is a Northwest Side neighborhood along Lawrence Avenue and the Brown Line at Kimball. Lawrence is one of the city's most diverse commercial streets.",
		points: [
			"Lawrence Avenue, Kedzie, and the Kimball Brown Line terminal.",
			"Immigrant-owned restaurants and retail, professional services, and neighborhood home services. The street is not a single-cuisine corridor.",
			"Landmarks: the Kimball Brown Line, Lawrence Avenue, and the north branch of the river on the east edge.",
			"Searches use Albany Park or Lawrence Avenue. A generic 'Northwest Side' page is too broad for this street.",
		],
	},
	"irving-park": {
		overview: "Irving Park stretches along Irving Park Road and the Blue Line, with Six Corners at Irving, Cicero, and Milwaukee as a historic commercial node and the villa district to the east.",
		points: [
			"Six Corners, Irving Park Road, and the Irving Park Blue Line.",
			"Corridor retail, restaurants, professional services, and home services for the houses off the main road.",
			"Landmarks: Six Corners, the Blue Line station, and the Irving Park Metra stop farther east.",
			"People search Irving Park or Six Corners. The road name and the neighborhood name are the same words, which makes the district name matter.",
		],
	},
	avondale: {
		overview: "Avondale is northwest of Logan Square, with Milwaukee Avenue continuing as the commercial diagonal and the Blue Line at Belmont as a transit point.",
		points: [
			"Milwaukee Avenue through Avondale, Belmont Avenue, and the Belmont Blue Line.",
			"Restaurants, light industrial businesses, and neighborhood services between Logan Square and the farther northwest corridors.",
			"Landmarks: the Belmont Blue Line and the Milwaukee Avenue diagonal.",
			"Searches say Avondale. Logan Square to the southeast is the neighbor people confuse with it.",
		],
	},
	"humboldt-park": {
		overview: "Humboldt Park is the neighborhood around the park of the same name on the West Side. The park, Paseo Boricua on Division, and North Avenue are the reference points.",
		points: [
			"Division Street's Paseo Boricua, North Avenue, and the streets facing Humboldt Park.",
			"Puerto Rican and Latino-owned restaurants and retail, neighborhood services, and organizations clustered on Division.",
			"Landmarks: Humboldt Park, the Paseo Boricua flags on Division, and the park's boathouse.",
			"Searches use Humboldt Park or Division Street. The park name and the neighborhood name are the same, so copy has to say which it means.",
		],
	},
	"ukrainian-village": {
		overview: "Ukrainian Village is west of West Town, around Chicago Avenue and the historic church corridor. Western and Chicago Avenues are the main commercial edges.",
		points: [
			"Chicago Avenue, Western Avenue, and the residential blocks of the historic district.",
			"Restaurants, bars, small professional services, and home services for a neighborhood of houses and two-flats.",
			"Landmarks: the Ukrainian churches on Chicago Avenue and the Western Avenue commercial edge.",
			"People search Ukrainian Village. West Town and Wicker Park are the names to the east and north, not substitutes.",
		],
	},
	"west-town": {
		overview: "West Town is the larger community area that includes the Chicago Avenue corridor between the West Loop and Ukrainian Village. Grand, Chicago, and Ashland are the commercial frames.",
		points: [
			"Chicago Avenue, Grand Avenue, and Ashland Avenue.",
			"A mix of restaurants, creative businesses, and long-standing neighborhood services between the expressway and the western neighborhoods.",
			"Landmarks: the Chicago Avenue corridor and the Grand Avenue industrial-turned-commercial blocks.",
			"Searches say West Town, or they name Ukrainian Village, Wicker Park, or the West Loop instead. The community-area name is broader than those.",
		],
	},
	"south-loop": {
		overview: "The South Loop is the residential and institutional district south of the elevated tracks, from Grant Park toward Chinatown, with Printers Row and the Museum Campus as distinct pieces.",
		points: [
			"Printers Row on Dearborn, Michigan Avenue facing Grant Park, and the Roosevelt Road collection of retail.",
			"High-rise residential services, universities, hotels, and restaurants that serve both residents and museum traffic.",
			"Landmarks: the Museum Campus, Grant Park, Printers Row, and the Roosevelt Green, Orange, and Red Line station.",
			"Searches use South Loop, Printers Row, or Museum Campus. The Loop to the north is a different district.",
		],
	},
	bronzeville: {
		overview: "Bronzeville is the historic Black neighborhood along the State Street and Martin Luther King Drive corridors south of the Stevenson, with 35th, 43rd, and 47th as commercial streets.",
		points: [
			"35th Street near the Green Line and the ballpark edge, 43rd Street, and 47th Street.",
			"Neighborhood restaurants, professional services, cultural institutions, and local retail rebuilding along those streets.",
			"Landmarks: the Illinois Institute of Technology, the 35th-Bronzeville-IIT Green Line, and Victory Monument on King Drive.",
			"Searches say Bronzeville or a numbered street. A South Side page is too vague for this corridor.",
		],
	},
	chinatown: {
		overview: "Chinatown's commercial core is the Wentworth and Cermak intersection and the Archer Avenue approach, with the Red Line at Cermak-Chinatown.",
		points: [
			"Wentworth Avenue, Cermak Road, and Archer Avenue.",
			"Restaurants, grocery and specialty retail, professional services, and businesses that draw both the neighborhood and visitors from across the region.",
			"Landmarks: the Chinatown Gate, the Cermak-Chinatown Red Line, and Ping Tom Park.",
			"Searches say Chinatown or Wentworth. Visitor queries and neighborhood-resident queries are both real and not identical.",
		],
	},
	"little-italy": {
		overview: "Little Italy on the Near West Side is the Taylor Street corridor next to the University of Illinois Chicago campus and the medical district.",
		points: [
			"Taylor Street, the UIC campus edge, and the Illinois Medical District to the west.",
			"Restaurants on Taylor Street, campus-adjacent services, and medical-district offices. The restaurant strip and the hospital campus are different buyers.",
			"Landmarks: Taylor Street, UIC, and the medical district.",
			"People search Little Italy, Taylor Street, or UIC. The Near West Side name is rarely what they type.",
		],
	},
};
