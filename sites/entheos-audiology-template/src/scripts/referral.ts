// Lead source: how the visitor found the site, kept in the browser for 90 days
// and written into every form's "referral_source" and "referral_detail" hidden
// fields. Ported from Bidview's AudioHelp "Get Referrer" v2.3 (2026-09-30).
// Layers, each used only if the one above found nothing:
//   1. ad click IDs (gclid, msclkid, fbclid, ...)
//   2. UTM parameters, lower-cased and mapped onto the label list
//   3. the referring site (document.referrer), by domain
//   4. Direct - No Referrer
// Unrecognised sources are kept as "Referral - host" or "Other - utm:value".
// Last non-direct source wins; the first touch is kept in the detail.
// Add ?ref_debug=1 to any address to see the stored state in the console.
/* eslint-disable */
// @ts-nocheck
var TTL_DAYS = 90;
var STORE_KEY = "bvReferral";
var OWN_HOSTS = [location.hostname.replace(/^www\./, "")];

var LABEL = {
  SEARCH_ADS:  'Marketing - Digital Search Ads',
  DISPLAY_ADS: 'Marketing - Display Ads',
  META_ADS:    'Marketing - Meta Ads',              // Facebook / Instagram paid
  PAID_SOCIAL: 'Marketing - Paid Social - ',        // + platform, for other paid social
  YELP_ADS:    'Marketing - Yelp Ads',
  OTHER_PAID:  'Marketing - Other Paid',
  ORG_SEARCH:  'Organic - Organic Search Listing',
  ORG_SOCIAL:  'Organic - Organic Social',
  GBP:         'Organic - Google Business Profile',
  EMAIL:       'Marketing - Newsletter',
  LLM:         'LLM Search - ',                     // + assistant name, lower-cased
  DIRECT:      'Direct - No Referrer'
};
var META_NAMES = ['Facebook/Instagram', 'Facebook', 'Instagram'];

var PAID_MEDIUMS   = ['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search', 'sem',
                      'paidsocial', 'paid_social', 'paid-social', 'display', 'cpm', 'banner',
                      'retargeting', 'remarketing'];
var EMAIL_MEDIUMS  = ['email', 'e-mail', 'newsletter'];
var SOCIAL_MEDIUMS = ['social', 'organic_social', 'organic-social'];

// ---- Layer 1: click IDs. [param, label (null = decide paid/organic from utm_medium), platform] ----
var CLICK_IDS = [
  ['gclid',      LABEL.SEARCH_ADS,  'Google Ads'],
  ['gbraid',     LABEL.SEARCH_ADS,  'Google Ads'],
  ['wbraid',     LABEL.SEARCH_ADS,  'Google Ads'],
  ['gad_source', LABEL.SEARCH_ADS,  'Google Ads'],
  ['dclid',      LABEL.DISPLAY_ADS, 'Google Display'],
  ['msclkid',    LABEL.SEARCH_ADS,  'Microsoft Ads'],
  ['ttclid',     LABEL.PAID_SOCIAL + 'TikTok',   'TikTok Ads'],
  ['li_fat_id',  LABEL.PAID_SOCIAL + 'LinkedIn', 'LinkedIn Ads'],
  ['twclid',     LABEL.PAID_SOCIAL + 'X',        'X Ads'],
  ['fbclid',     null,              'Facebook/Instagram'],
  ['fclid',      null,              'Facebook/Instagram'],
  ['epik',       null,              'Pinterest']
];

// ---- Layer 2: utm_source aliases -> [aliases, kind, name] ----
var UTM_SOURCES = [
  [['google', 'google.com', 'adwords', 'googleads', 'google-ads', 'google_ads'], 'search', 'Google'],
  [['bing', 'bing.com', 'microsoft', 'msn', 'bingads'],                          'search', 'Bing'],
  [['yahoo', 'duckduckgo', 'ddg', 'ecosia', 'brave'],                            'search', 'Other search'],
  [['direct'],                                                                    'orgsearch', 'Direct tag'],  // client map: utm_source=direct -> organic
  [['gbp', 'gmb', 'google_business', 'googlebusiness', 'google-business', 'business.google.com'], 'gbp', 'Google Business Profile'],
  [['facebook', 'fb', 'facebook.com', 'meta', 'ig', 'instagram', 'instagram.com'], 'social', 'Facebook/Instagram'],
  [['linkedin', 'linkedin.com'],                                                  'social', 'LinkedIn'],
  [['tiktok'],                                                                    'social', 'TikTok'],
  [['youtube', 'yt'],                                                             'social', 'YouTube'],
  [['twitter', 'x', 'x.com', 't.co'],                                             'social', 'X'],
  [['pinterest'],                                                                 'social', 'Pinterest'],
  [['nextdoor'],                                                                  'social', 'Nextdoor'],
  [['reddit'],                                                                    'social', 'Reddit'],
  [['yelp', 'yelp.com'],                                                          'yelp',   'Yelp'],
  [['newsletter', 'email', 'e-mail', 'mailchimp', 'campaignmonitor', 'campaign_monitor',
    'campaign-monitor', 'createsend', 'klaviyo', 'constantcontact', 'hubspot'],   'email',  'Newsletter'],
  [['chatgpt', 'chatgpt.com', 'openai', 'chat.openai.com'],                       'ai',     'ChatGPT'],
  [['perplexity', 'perplexity.ai'],                                               'ai',     'Perplexity'],
  [['claude', 'claude.ai', 'anthropic'],                                          'ai',     'Claude'],
  [['gemini', 'gemini.google.com', 'bard'],                                       'ai',     'Gemini'],
  [['copilot', 'copilot.microsoft.com'],                                          'ai',     'Copilot'],
  [['healthgrades'],                                                              'directory', 'Healthgrades'],
  [['zocdoc'],                                                                    'directory', 'Zocdoc'],
  [['hearingtracker', 'hearing_tracker', 'hearing-tracker'],                      'directory', 'HearingTracker']
];

// ---- Layer 3: referring hostname -> [regex, kind, name]. More specific hosts first. ----
var REF_HOSTS = [
  [/^gemini\.google\.com$/,          'ai',        'Gemini'],
  [/^copilot\.microsoft\.com$/,      'ai',        'Copilot'],
  [/(^|\.)chatgpt\.com$/,            'ai',        'ChatGPT'],
  [/(^|\.)openai\.com$/,             'ai',        'ChatGPT'],
  [/(^|\.)perplexity\.ai$/,          'ai',        'Perplexity'],
  [/(^|\.)claude\.ai$/,              'ai',        'Claude'],
  [/(^|\.)meta\.ai$/,                'ai',        'Meta AI'],
  [/(^|\.)grok\.com$/,               'ai',        'Grok'],
  [/(^|\.)you\.com$/,                'ai',        'You.com'],
  [/^business\.google\.com$/,        'gbp',       'Google Business Profile'],
  [/(^|\.)google\.[a-z.]+$/,         'search',    'Google'],
  [/(^|\.)bing\.com$/,               'search',    'Bing'],
  [/(^|\.)yahoo\.com$/,              'search',    'Yahoo'],
  [/(^|\.)duckduckgo\.com$/,         'search',    'DuckDuckGo'],
  [/(^|\.)ecosia\.org$/,             'search',    'Ecosia'],
  [/(^|\.)brave\.com$/,              'search',    'Brave'],
  [/(^|\.)aol\.com$/,                'search',    'AOL'],
  [/(^|\.)facebook\.com$/,           'social',    'Facebook'],
  [/(^|\.)fb\.com$/,                 'social',    'Facebook'],
  [/(^|\.)instagram\.com$/,          'social',    'Instagram'],
  [/(^|\.)linkedin\.com$/,           'social',    'LinkedIn'],
  [/(^|\.)lnkd\.in$/,                'social',    'LinkedIn'],
  [/(^|\.)tiktok\.com$/,             'social',    'TikTok'],
  [/(^|\.)youtube\.com$/,            'social',    'YouTube'],
  [/(^|\.)youtu\.be$/,               'social',    'YouTube'],
  [/(^|\.)(x|twitter)\.com$/,        'social',    'X'],
  [/^t\.co$/,                        'social',    'X'],
  [/(^|\.)pinterest\.[a-z.]+$/,      'social',    'Pinterest'],
  [/(^|\.)reddit\.com$/,             'social',    'Reddit'],
  [/(^|\.)nextdoor\.com$/,           'social',    'Nextdoor'],
  [/(^|\.)threads\.net$/,            'social',    'Threads'],
  [/(^|\.)yelp\.com$/,               'directory', 'Yelp'],
  [/(^|\.)healthgrades\.com$/,       'directory', 'Healthgrades'],
  [/(^|\.)zocdoc\.com$/,             'directory', 'Zocdoc'],
  [/(^|\.)webmd\.com$/,              'directory', 'WebMD'],
  [/(^|\.)vitals\.com$/,             'directory', 'Vitals'],
  [/(^|\.)hearingtracker\.com$/,     'directory', 'HearingTracker'],
  [/(^|\.)yellowpages\.com$/,        'directory', 'Yellow Pages'],
  [/(^|\.)mapquest\.com$/,           'directory', 'MapQuest'],
  [/(^|\.)bbb\.org$/,                'directory', 'BBB'],
  [/(^|\.)apple\.com$/,              'directory', 'Apple Maps']
];

// ---------------------------------------------------------------------------------------
function labelFor(kind, name, paid) {
  switch (kind) {
    case 'search':    return paid ? LABEL.SEARCH_ADS : LABEL.ORG_SEARCH;
    case 'orgsearch': return LABEL.ORG_SEARCH;
    case 'social':
      if (!paid) return LABEL.ORG_SOCIAL;
      return META_NAMES.indexOf(name) !== -1 ? LABEL.META_ADS : LABEL.PAID_SOCIAL + name;
    case 'gbp':       return LABEL.GBP;
    case 'yelp':      return LABEL.YELP_ADS;
    case 'email':     return LABEL.EMAIL;
    case 'ai':        return LABEL.LLM + name.toLowerCase();
    case 'directory': return 'Directory - ' + name;
  }
  return 'Other - ' + name;
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; }
}
function isOwn(host) {
  for (var i = 0; i < OWN_HOSTS.length; i++) {
    var d = OWN_HOSTS[i];
    if (host === d || host.slice(-(d.length + 1)) === '.' + d) return true;
  }
  return false;
}
function matchUtmSource(src) {
  var i, j, aliases;
  for (i = 0; i < UTM_SOURCES.length; i++) {            // exact alias match first
    aliases = UTM_SOURCES[i][0];
    for (j = 0; j < aliases.length; j++) if (src === aliases[j]) return UTM_SOURCES[i];
  }
  for (i = 0; i < UTM_SOURCES.length; i++) {            // then "contains", for aliases of 4+ chars
    aliases = UTM_SOURCES[i][0];
    for (j = 0; j < aliases.length; j++) if (aliases[j].length >= 4 && src.indexOf(aliases[j]) !== -1) return UTM_SOURCES[i];
  }
  return null;
}
function matchHost(host) {
  for (var i = 0; i < REF_HOSTS.length; i++) if (REF_HOSTS[i][0].test(host)) return REF_HOSTS[i];
  return null;
}

// Returns {label, ev} or null when this page view carries no new information (in-site navigation).
function classify(loc, referrer) {
  var p = new URLSearchParams(loc.search || '');
  function get(k) { var v = p.get(k); return v ? v.trim().toLowerCase() : ''; }
  var src = get('utm_source'), med = get('utm_medium'), camp = get('utm_campaign');
  var paid = PAID_MEDIUMS.indexOf(med) !== -1;
  var refHost = hostOf(referrer || '');
  var internal = !!refHost && isOwn(refHost);
  var ev = { src: src, med: med, camp: camp, clickid: '', platform: '', ref: internal ? '' : refHost, landing: loc.pathname };
  function done(label) { return { label: label, ev: ev }; }

  for (var i = 0; i < CLICK_IDS.length; i++) {                              // 1. click IDs
    var c = CLICK_IDS[i];
    if (p.has(c[0])) {
      ev.clickid = c[0]; ev.platform = c[2];
      if (c[1]) return done(c[1]);
      return done(labelFor('social', c[2], paid));
    }
  }
  if (src) {                                                                 // 2. UTM
    var m = matchUtmSource(src);
    if (m) { ev.platform = m[2]; return done(labelFor(m[1], m[2], paid)); }
    if (paid) return done(LABEL.OTHER_PAID);
    if (EMAIL_MEDIUMS.indexOf(med) !== -1) return done(LABEL.EMAIL);
    if (SOCIAL_MEDIUMS.indexOf(med) !== -1) return done(LABEL.ORG_SOCIAL);
    return done('Other - utm:' + src);
  }
  if (med) {
    if (paid) return done(LABEL.OTHER_PAID);
    if (EMAIL_MEDIUMS.indexOf(med) !== -1) return done(LABEL.EMAIL);
  }
  if (refHost && !internal) {                                                // 3. referrer
    var r = matchHost(refHost);
    if (r) { ev.platform = r[2]; return done(labelFor(r[1], r[2], false)); }
    return done('Referral - ' + refHost);
  }
  if (internal) return null;                                                 // in-site click: keep what we have
  return done(LABEL.DIRECT);                                                 // 4. direct
}

function load() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    var o = JSON.parse(raw);
    if (!o || !o.last || Date.now() - o.last > TTL_DAYS * 864e5) return null;
    return o;
  } catch (e) { return null; }
}
function save(o) { try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) {} }

function update() {
  var stored = load();
  var c = classify(window.location, document.referrer);
  var now = Date.now();
  if (c) {
    if (!stored) {
      stored = { label: c.label, firstLabel: c.label, first: now, last: now, ev: c.ev };
    } else if (c.label !== LABEL.DIRECT) {
      stored.label = c.label; stored.last = now; stored.ev = c.ev;   // last non-direct touch wins
    } else {
      stored.last = now;                                             // direct return visit keeps prior source
    }
    save(stored);
  }
  return stored;
}

function detailString(s) {
  var ev = s.ev || {}, parts = [], keys = ['src', 'med', 'camp', 'clickid', 'platform', 'ref', 'landing'];
  for (var i = 0; i < keys.length; i++) if (ev[keys[i]]) parts.push(keys[i] + '=' + ev[keys[i]]);
  parts.push('first=' + new Date(s.first).toISOString().slice(0, 10));
  if (s.firstLabel && s.firstLabel !== s.label) parts.push('firstLabel=' + s.firstLabel);
  return parts.join('; ').slice(0, 500);
}


/** The stored lead source, updated for this page view. */
export function referral() {
  var s = update();
  return s ? { source: s.label, detail: detailString(s) } : { source: "", detail: "" };
}
if (/[?&]ref_debug=1/.test(location.search)) console.log("[Lead source]", load());
