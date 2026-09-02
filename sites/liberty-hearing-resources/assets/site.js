/* Liberty Hearing Center — static runtime for the Claude Design mockup.
   Applies style-hover attributes, the home CTA/Hearing-the-Call swap,
   the clinic photo lightbox, and the contact form thank-you state. */
(function () {
  'use strict';

  /* hover styles: style-hover="prop:val;..." applied on pointer enter */
  document.querySelectorAll('[style-hover]').forEach(function (el) {
    var base = el.getAttribute('style') || '';
    var hover = el.getAttribute('style-hover');
    el.addEventListener('mouseenter', function () {
      el.style.cssText = base + ';' + hover;
    });
    el.addEventListener('mouseleave', function () {
      el.style.cssText = base;
    });
  });

  /* home: swap between the launch CTA (#book) and Hearing the Call sections */
  var book = document.getElementById('book');
  var htc = document.getElementById('hearing-the-call');
  function swapSections() {
    if (!book || !htc) return;
    var showHtc = htc.style.display === 'none';
    htc.style.display = showHtc ? '' : 'none';
    book.style.display = showHtc ? 'none' : '';
  }
  document.querySelectorAll('[data-swap], [data-swap-only]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (el.hasAttribute('data-swap-only')) e.stopPropagation();
      swapSections();
    });
  });
  document.querySelectorAll('[data-stop]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  /* home: clinic photo lightbox */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCap = document.getElementById('lightbox-cap');
  document.querySelectorAll('[data-lightbox-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (!lb) return;
      if (lbImg) { lbImg.src = el.getAttribute('data-full'); lbImg.alt = el.getAttribute('data-alt') || ''; }
      if (lbCap) lbCap.textContent = el.getAttribute('data-alt') || '';
      lb.style.display = 'grid';
    });
  });
  document.querySelectorAll('[data-lightbox-close]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('img') && !e.target.closest('[data-lightbox-close] button')) {
        /* clicking the enlarged photo itself shouldn't close via bubbling twice */
      }
      if (lb) lb.style.display = 'none';
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb) lb.style.display = 'none';
  });

  /* contact: front-end-only appointment request form */
  var form = document.getElementById('request-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = document.getElementById('form-status');
      if (status) {
        status.textContent = 'Thank you — your request is in. We will follow up the same business day.';
        status.style.color = 'var(--navy)';
        status.style.fontWeight = '700';
      }
    });
  }
})();
