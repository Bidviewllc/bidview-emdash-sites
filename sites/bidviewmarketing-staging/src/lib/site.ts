// Site-wide settings for bidviewmarketing.com.
//
// SITE_URL is the PRODUCTION origin. Canonicals, Open Graph URLs, schema @ids and
// the sitemap always point here — including while the site runs on workers.dev —
// so staging can never present itself as the canonical copy of a page.

export const SITE_URL = 'https://www.bidviewmarketing.com';
export const SITE_NAME = 'Bidview Marketing';

/** Google tag already used by the live WordPress site (Site Kit). */
export const GA_TAG_ID = 'GT-TNF2R9W';

/** Search Console verification token, copied from the live homepage. */
export const GSC_VERIFICATION = '5mLVHdEcid6d72MtMEzcsPnaYNxR1sCR5Kzu-Vj1bVA';

/**
 * Where the forms post. While the site is on workers.dev there is no custom
 * domain to route /api/contact through, so the forms go to the forms Worker's
 * own URL (sites/bidviewmarketing-staging/forms-worker). At go-live, add a
 * Workers Route for www.bidviewmarketing.com/api/contact* and change this to
 * '/api/contact'.
 */
export const FORMS_ENDPOINT = 'https://bidviewmarketing-forms.cameron-239.workers.dev/api/contact';

export const ROBOTS_INDEX = 'index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large';

/**
 * True when the request is NOT on the production domain. Staging answers with
 * noindex so it can't compete with (or be crawled as a duplicate of) the live site.
 */
export function isStagingHost(hostname: string): boolean {
  return !/(^|\.)bidviewmarketing\.com$/i.test(hostname);
}

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

/** Every indexable page. Drives the sitemap. Keep in sync when adding pages. */
export const SITEMAP_PATHS = [
  '/',
  '/about/',
  '/contact-us/',
  '/audiology-marketing/',
  '/audiology-marketing/audiology-seo/',
  '/audiology-marketing/audiology-website-design/',
  '/audiology-marketing/audiology-ppc/',
  '/audiology-marketing/audiology-lead-gen/',
  '/audiology-marketing-services/audiology-reputation-management/',
  '/audiology-marketing-services/audiology-social-media/',
  '/cosmetic-healthcare-marketing-services/',
  '/cosmetic-healthcare-marketing-services/cosmetic-healthcare-seo/',
  '/cosmetic-healthcare-digital-marketing/',
  '/cosmetic-website-development-services/',
  '/social-media-marketing-for-cosmetic-clinics/',
  '/privacy-policy/',
  '/terms-of-use/',
];

/** Organization + WebSite graph shared by every native page's schema. */
export function baseSchemaGraph() {
  return [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        '@id': `${SITE_URL}/#logo`,
        url: absoluteUrl('/Assets/bidview-marketing-logo.webp'),
        width: 760,
        height: 220,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
    },
  ];
}

/**
 * Hidden fields every lead form needs: the honeypot (`bv_hp` — `website` is a
 * real field here, so it can't be the honeypot), the time-on-page stamp and the
 * source page. The two stamps are filled by /scripts/lead-forms.js at submit.
 */
export const LEAD_FORM_HIDDEN_FIELDS =
  '<div aria-hidden="true" style="position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden">' +
  '<label>Leave this empty<input type="text" name="bv_hp" tabindex="-1" autocomplete="off" value=""></label>' +
  '</div>' +
  '<input type="hidden" name="bv_fs" value="">' +
  '<input type="hidden" name="page" value="">';
