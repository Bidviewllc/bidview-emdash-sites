// One entry per site. Adding a client or a template site is a new entry here
// plus a D1 binding in wrangler.jsonc. Nothing else in the Worker is site-specific.
export const SITES = [
  {
    site: "new-leaf",
    dbBinding: "DB_NEW_LEAF",
    locations: [
      { key: "arvada", label: "Arvada", placeId: "ChIJB_NQqgeJa4cRS2-mBlxuxKE", depth: 50, expectedTitleIncludes: ["New Leaf"] },
      { key: "littleton", label: "Littleton", placeId: "ChIJf-CBToGBbIcRScDxPPAH700", depth: 50, expectedTitleIncludes: ["New Leaf"] },
    ],
  },
  {
    site: "ontario",
    dbBinding: "DB_ONTARIO",
    locations: [
      { key: "brighton", label: "Brighton", placeId: "ChIJq-Dls6fK1okRjkByx9QR3n8", depth: 50, expectedTitleIncludes: ["Ontario Hearing"] },
    ],
  },
  {
    site: "duet",
    dbBinding: "DB_DUET",
    locations: [
      // The Google listing still carries the pre-rebrand name "Lake Forest Hearing Professionals".
      { key: "lake-forest", label: "Lake Forest", placeId: "ChIJ1foTYNnqD4gRYzWwaQPCG_Q", depth: 50, expectedTitleIncludes: ["Duet", "Lake Forest Hearing"] },
    ],
  },
];
