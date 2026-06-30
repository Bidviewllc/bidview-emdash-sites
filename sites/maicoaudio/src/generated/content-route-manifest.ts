export const contentRouteMap = {
  "/audiology-services/": {
    "collection": "services",
    "slug": "audiology-services",
    "template": "internal"
  },
  "/audiology-services/hearing-aid-services/": {
    "collection": "services",
    "slug": "audiology-services/hearing-aid-services",
    "template": "internal"
  },
  "/audiology-services/hearing-tests/": {
    "collection": "services",
    "slug": "audiology-services/hearing-tests",
    "template": "internal"
  },
  "/audiology-services/hearing-aid-fittings/": {
    "collection": "services",
    "slug": "audiology-services/hearing-aid-fittings",
    "template": "internal"
  },
  "/audiology-services/real-ear-measurement/": {
    "collection": "services",
    "slug": "audiology-services/real-ear-measurement",
    "template": "internal"
  },
  "/audiology-services/sensorineural-hearing-loss/": {
    "collection": "services",
    "slug": "audiology-services/sensorineural-hearing-loss",
    "template": "internal"
  },
  "/audiology-services/tinnitus-support/": {
    "collection": "services",
    "slug": "audiology-services/tinnitus-support",
    "template": "internal"
  },
  "/hearing-aids-products/": {
    "collection": "services",
    "slug": "hearing-aids-products",
    "template": "internal"
  },
  "/hearing-aids-products/hearing-aid-alternatives/": {
    "collection": "services",
    "slug": "hearing-aids-products/hearing-aid-alternatives",
    "template": "internal"
  },
  "/hearing-aids-products/hearing-aid-batteries/": {
    "collection": "services",
    "slug": "hearing-aids-products/hearing-aid-batteries",
    "template": "internal"
  },
  "/custom-hearing-protection/": {
    "collection": "services",
    "slug": "custom-hearing-protection",
    "template": "internal"
  },
  "/hearing-aid/phonak/": {
    "collection": "hearing_aid_brands",
    "slug": "hearing-aid/phonak",
    "template": "internal"
  },
  "/hearing-aid/oticon/": {
    "collection": "hearing_aid_brands",
    "slug": "hearing-aid/oticon",
    "template": "internal"
  },
  "/hearing-aid/resound/": {
    "collection": "hearing_aid_brands",
    "slug": "hearing-aid/resound",
    "template": "internal"
  },
  "/hearing-aid/starkey/": {
    "collection": "hearing_aid_brands",
    "slug": "hearing-aid/starkey",
    "template": "internal"
  },
  "/hearing-aid/unitron/": {
    "collection": "hearing_aid_brands",
    "slug": "hearing-aid/unitron",
    "template": "internal"
  },
  "/hearing-aid/widex/": {
    "collection": "hearing_aid_brands",
    "slug": "hearing-aid/widex",
    "template": "internal"
  },
  "/hearing-aid/signia/": {
    "collection": "hearing_aid_brands",
    "slug": "hearing-aid/signia",
    "template": "internal"
  },
  "/ear-candles-what-you-need-to-know/": {
    "collection": "blog_post",
    "slug": "ear-candles-what-you-need-to-know",
    "template": "blog"
  },
  "/hearing-aids-for-tinnitus/": {
    "collection": "blog_post",
    "slug": "hearing-aids-for-tinnitus",
    "template": "blog"
  },
  "/hyperacusis-symptoms-diagnosis-risk-factors/": {
    "collection": "blog_post",
    "slug": "hyperacusis-symptoms-diagnosis-risk-factors",
    "template": "blog"
  },
  "/pressure-in-the-ear-causes-care-and-when-to-see-an-audiologist/": {
    "collection": "blog_post",
    "slug": "pressure-in-the-ear-causes-care-and-when-to-see-an-audiologist",
    "template": "blog"
  },
  "/rechargeable-hearing-aids-features-benefits/": {
    "collection": "blog_post",
    "slug": "rechargeable-hearing-aids-features-benefits",
    "template": "blog"
  },
  "/swimmers-ear/": {
    "collection": "blog_post",
    "slug": "swimmers-ear",
    "template": "blog"
  },
  "/the-best-way-to-clean-your-ears/": {
    "collection": "blog_post",
    "slug": "the-best-way-to-clean-your-ears",
    "template": "blog"
  },
  "/privacy-policy/": {
    "collection": "utility_pages",
    "slug": "privacy-policy",
    "template": "internal"
  },
  "/terms-of-use/": {
    "collection": "utility_pages",
    "slug": "terms-of-use",
    "template": "internal"
  },
  "/insurance-and-billing-faqs/": {
    "collection": "utility_pages",
    "slug": "insurance-and-billing-faqs",
    "template": "internal"
  },
  "/audiologist-hearing-aids-newport-news-va/": {
    "collection": "locations",
    "slug": "audiologist-hearing-aids-newport-news-va",
    "template": "location"
  },
  "/audiologist-hearing-aids-chesapeake-va/": {
    "collection": "locations",
    "slug": "audiologist-hearing-aids-chesapeake-va",
    "template": "location"
  },
  "/audiologist-hearing-aids-smithfield-va/": {
    "collection": "locations",
    "slug": "audiologist-hearing-aids-smithfield-va",
    "template": "location"
  },
  "/hearing-instrument-specialist/jenny-flamini/": {
    "collection": "team",
    "slug": "hearing-instrument-specialist/jenny-flamini",
    "template": "team"
  },
  "/audiologist/stephanie-howard/": {
    "collection": "team",
    "slug": "audiologist/stephanie-howard",
    "template": "team"
  },
  "/audiologist/tracey-hudson/": {
    "collection": "team",
    "slug": "audiologist/tracey-hudson",
    "template": "team"
  },
  "/contact/": {
    "collection": "contact_page",
    "slug": "contact",
    "template": "contact"
  },
  "/about/": {
    "collection": "about",
    "slug": "about",
    "template": "about"
  }
} as const;

export type ContentRoute = keyof typeof contentRouteMap;
