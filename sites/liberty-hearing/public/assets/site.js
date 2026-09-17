/* Liberty Hearing Center — shared client runtime.
   1. style-hover attributes (stand-in for :hover on inline-styled elements)
   2. clinic photo lightbox
   3. SSNHL info modal
   4. GA4 click_phone_number event on tel: links
   The homepage CTA/"Hearing the Call" swap from the design mockup was removed
   on conversion — the launch CTA (#book) is now the only version.

   The contact form is NOT handled here. It is a real POST to /api/contact
   (see src/pages/api/contact.ts), which 303s to /thank-you/. Do not re-add a
   preventDefault() handler — that is what made the form silently swallow
   leads in the design mockup. */
(function () {
  'use strict';

  /* hover styles: style-hover="prop:val;..." applied on pointer enter */
  document.querySelectorAll('[style-hover]').forEach(function (el) {
    var base = el.getAttribute('style') || '';
    var hover = el.getAttribute('style-hover');
    el.addEventListener('mouseenter', function () { el.style.cssText = base + ';' + hover; });
    el.addEventListener('mouseleave', function () { el.style.cssText = base; });
  });

  /* clinic photo lightbox */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCap = document.getElementById('lightbox-cap');
  function closeLightbox() { if (lb) lb.style.display = 'none'; }
  document.querySelectorAll('[data-lightbox-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (!lb) return;
      if (lbImg) { lbImg.src = el.getAttribute('data-full'); lbImg.alt = el.getAttribute('data-alt') || ''; }
      if (lbCap) lbCap.textContent = el.getAttribute('data-alt') || '';
      lb.style.display = 'grid';
    });
  });
  document.querySelectorAll('[data-lightbox-close]').forEach(function (el) {
    el.addEventListener('click', closeLightbox);
  });

  /* SSNHL "sudden hearing loss" info modal */
  var modal = document.getElementById('lhc-ssnhl-modal');
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  if (modal) {
    document.querySelectorAll('[data-lhc-modal-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
      });
    });
    modal.querySelectorAll('[data-lhc-modal-close]').forEach(function (b) {
      b.addEventListener('click', closeModal);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeLightbox();
    if (modal && !modal.hidden) closeModal();
  });

  /* GA4 phone taps (2026-09-17). One delegated listener, so every tel: link on every
     page counts, including any added later. The event name must stay exactly
     click_phone_number: the weekly Lead Health pulse counts that name. gtag is
     defined inline in Base.astro <head>; if it is missing (blocked), do nothing. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (!a || typeof window.gtag !== 'function') return;
    window.gtag('event', 'click_phone_number', {
      link_url: a.getAttribute('href'),
      page_location: window.location.href
    });
  });

})();
