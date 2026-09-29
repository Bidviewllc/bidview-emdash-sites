/* GA4 lead events (2026-09-29). Phone taps were never tracked, and the appointment
   form's form_submit never reached GA4 (see TRAP below).

   TRAP: Base.astro sets up GA with <script define:vars>, which Astro wraps in a function,
   so `gtag` is NOT global there and `typeof gtag === 'function'` is false in every other
   script. Send events through dataLayer directly (what gtag itself does) instead.

   window.bvGtag(...) is a global stand-in for gtag, shared with page scripts (the appointment form in SiteFooter uses it).
   Phone taps: one delegated listener covers every tel: link on every page, including
   links added later. Event names must stay exactly click_phone_number / form_submit:
   the weekly Lead Health pulse counts those names. */
(function () {
  window.bvGtag = function () {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  };
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (!link) return;
    window.bvGtag('event', 'click_phone_number', {
      link_url: link.getAttribute('href'),
      page_location: window.location.href
    });
  });
})();
