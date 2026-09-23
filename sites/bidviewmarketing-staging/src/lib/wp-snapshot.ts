// Turns a converted WordPress page (converted/*.html — a 1:1 copy of the live
// Elementor page with its assets mirrored under /lib/) into the page this site
// serves. The markup and CSS are kept exactly, so the page looks identical to
// live; only what depends on WordPress is changed:
//
//  - canonical / og:url / og:image / schema URLs become absolute production URLs
//  - robots becomes noindex when served from a non-production host (staging)
//  - WordPress-only head links are removed (REST "bv-json" link, shortlink,
//    RSS/comment feeds, speculation rules, the WPMU hosting analytics tracker)
//  - the Gravity Form posts to the forms Worker instead of WordPress, with the
//    reCAPTCHA (keyed to the WordPress install) removed
//
// Every step that edits markup checks that it found what it expected and throws
// otherwise, so a changed snapshot fails loudly instead of shipping a dead form.

import { FORMS_ENDPOINT, LEAD_FORM_HIDDEN_FIELDS, ROBOTS_INDEX, SITE_URL } from './site';

export interface SnapshotOptions {
  /** The page's own path, e.g. "/audiology-marketing/". */
  path: string;
  /** True when the request is not on the production domain. */
  staging: boolean;
}

const abs = (u: string) => (u === '' ? SITE_URL : u.startsWith('/') ? SITE_URL + u : u);

function replaceOnce(html: string, pattern: RegExp, replacement: string | ((...m: string[]) => string), what: string) {
  if (!pattern.test(html)) throw new Error(`wp-snapshot: ${what} not found`);
  pattern.lastIndex = 0;
  return html.replace(pattern, replacement as any);
}

/** Absolute URLs + no WordPress author archive in the Rank Math schema graph. */
function fixSchema(json: string): string {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return json; // leave unparseable schema as-is rather than failing the page
  }
  const walk = (node: any): any => {
    if (Array.isArray(node)) return node.map(walk).filter((v) => v !== '');
    if (node && typeof node === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string' && ['@id', 'url', 'contentUrl', 'item', 'target'].includes(k)) {
          out[k] = v.startsWith('/author/') ? `${SITE_URL}/#author-${v.split('/')[2]}` : abs(v);
        } else {
          out[k] = walk(v);
        }
      }
      // An author archive page does not exist on this site — keep the person, drop the link.
      if (typeof out['@id'] === 'string' && out['@id'].includes('/#author-')) {
        delete out.url;
        if (Array.isArray(out.sameAs) && out.sameAs.length === 0) delete out.sameAs;
      }
      return out;
    }
    return node;
  };
  return JSON.stringify(walk(data)).replace(/</g, '\\u003c');
}

export function renderSnapshot(raw: string, { path, staging }: SnapshotOptions): string {
  let html = raw.split(String.fromCharCode(0xfeff)).join(''); // byte-order mark

  // --- head: canonical, Open Graph, robots -------------------------------
  html = replaceOnce(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${SITE_URL}${path}" />`, 'canonical');
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${SITE_URL}${path}" />`);
  html = html.replace(
    /<meta (property="og:image(?::secure_url)?"|name="twitter:image") content="(\/[^"]*)"\s*\/>/g,
    (_m, attr, url) => `<meta ${attr} content="${SITE_URL}${url}" />`,
  );
  html = replaceOnce(
    html,
    /<meta name="robots" content="[^"]*"\s*\/>/,
    `<meta name="robots" content="${staging ? 'noindex, nofollow' : ROBOTS_INDEX}"/>`,
    'robots meta',
  );

  // --- head: schema --------------------------------------------------------
  html = html.replace(
    /(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,
    (_m, open, json, close) => open + fixSchema(json) + close,
  );

  // --- head/body: WordPress-only bits --------------------------------------
  html = html
    .replace(/<link rel="alternate" title="JSON"[^>]*bv-json[^>]*\/>\s*/g, '')
    .replace(/<link rel='shortlink'[^>]*\/>\s*/g, '')
    .replace(/<link rel="alternate" type="application\/rss\+xml"[^>]*\/>\s*/g, '')
    .replace(/<link rel="profile" href="https:\/\/gmpg\.org\/xfn\/11">\s*/g, '')
    .replace(/<script type="speculationrules">[\s\S]*?<\/script>\s*/g, '')
    .replace(/<script id="gform_recaptcha-js"[^>]*><\/script>\s*/g, '')
    // WPMU DEV hosting analytics — belongs to the WordPress host, not this site.
    .replace(/<script type="text\/javascript">\s*var _paq[\s\S]*?<\/script>\s*/g, '');

  // The conversion renamed every "wp-" to "bv-", including the Trustindex loader's
  // mode flag. Trustindex only knows "?wp-widget" — with "?bv-widget" the Google
  // reviews box renders "Widget not found".
  html = html.replace('cdn.trustindex.io/loader.js?bv-widget', 'cdn.trustindex.io/loader.js?wp-widget');

  // Google tag (Site Kit): production only, so staging visits stay out of live GA.
  if (staging) {
    html = html
      .replace(/<script id="google_gtagjs-js"[^>]*><\/script>\s*/g, '')
      .replace(/<script id="google_gtagjs-js-after">[\s\S]*?<\/script>\s*/g, '');
  }

  // --- the lead form ---------------------------------------------------------
  html = replaceOnce(
    html,
    /<form method='post' enctype='multipart\/form-data'\s+id='gform_2'\s+action='[^']*'([^>]*)>/,
    // `novalidate` dropped so the browser enforces the required fields
    (_m, rest) =>
      `<form method='post' id='gform_2' class='lead-form' action='${FORMS_ENDPOINT}'${rest.replace(/\s*novalidate/, '')}>${LEAD_FORM_HIDDEN_FIELDS}`,
    'Gravity Form #2',
  );
  for (const [from, to] of [
    ['input_3.3', 'name'],
    ['input_5', 'phone'],
    ['input_6', 'email'],
    ['input_8', 'website'],
  ]) {
    html = replaceOnce(html, new RegExp(`name='${from.replace('.', '\\.')}'`), `name='${to}' required`, `form field ${from}`);
  }
  html = replaceOnce(html, /<div id="field_2_11"[\s\S]*?<\/div><\/div>/, '', 'reCAPTCHA field');
  html = replaceOnce(html, / onclick='gform\.submission\.handleButtonClick\(this\);'/, '', 'submit button handler');
  html = html.replace(/\s*<input type='hidden'[^>]*class='gform_hidden'[^>]*\/>/g, '');
  html = html.replace(/\s*<input type='hidden' name='gform_field_values' value='' \/>/g, '');

  // time-on-page stamp for the forms Worker's bot check
  html = replaceOnce(html, /<\/body>/, '<script src="/scripts/lead-forms.js"></script>\n</body>', '</body>');

  return html;
}
