/* WNC Audiology — local static site behaviors (replaces WP/Elementor runtime) */
(function () {
  'use strict';

  /* ── Mobile menu toggle ─────────────────────────────────────────────────── */
  function initMobileMenu() {
    var btn = document.querySelector(
      '.astro-menu-toggle, .menu-toggle, button[aria-label*="enu" i], div[role="button"][aria-label*="enu" i], .hamburger'
    );
    var nav = document.querySelector(
      '.astro-nav-menu--main, .astro-nav-menu, .main-navigation, #main-nav, nav.nav-menu'
    );
    if (!btn) return;

    /* The header has height:0 on mobile; page content starts at y:0 and can
       cover the overflowing nav toggle. Setting z-index on the widget wrapper
       ensures the toggle stays clickable above the hero section.              */
    var wrapper = btn.closest('.astro-widget-nav-menu, .astro-nav-menu--toggle');
    if (wrapper) {
      wrapper.style.position = 'relative';
      /* Must be above the panel (10000) so clicks reach the button when menu is open */
      wrapper.style.zIndex   = '10001';
    }

    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      btn.classList.toggle('astro-active', !expanded);
      if (nav) nav.classList.toggle('menu-open', !expanded);

      /* On mobile/tablet the CSS rule sets position:absolute on the panel,
         confining it to the narrow nav-widget column. When opening on small
         screens, re-position it as a fixed full-width overlay just below the
         header. When closing, strip the inline styles so CSS transitions reset. */
      if (window.innerWidth <= 1024) {
        var panel = btn.nextElementSibling;
        if (panel && panel.classList.contains('astro-nav-menu--dropdown')) {
          if (!expanded) {
            /* Use the button's actual bottom — the header has height:0 on mobile
               so headerEl.getBoundingClientRect().bottom undershoots the button. */
            var panelTop = Math.round(btn.getBoundingClientRect().bottom) + 4;
            panel.style.cssText =
              'position:fixed!important;' +
              'top:' + panelTop + 'px!important;' +
              'left:0!important;right:0!important;width:100%!important;' +
              'z-index:10000!important;background:#fff;' +
              'max-height:calc(100vh - ' + panelTop + 'px)!important;' +
              'overflow-y:auto!important;';
            /* Lock body scroll while menu is open */
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            /* Hide sticky bottom CTA so it doesn't compete with the open menu */
            document.querySelectorAll('[data-settings]').forEach(function (el) {
              try {
                var s = JSON.parse(el.getAttribute('data-settings'));
                if (s.sticky === 'bottom') el.style.display = 'none';
              } catch (e) {}
            });
          } else {
            panel.style.cssText = '';
            /* Restore body scroll */
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            /* Restore sticky bottom CTA */
            document.querySelectorAll('[data-settings]').forEach(function (el) {
              try {
                var s = JSON.parse(el.getAttribute('data-settings'));
                if (s.sticky === 'bottom') el.style.display = '';
              } catch (e) {}
            });
          }
        }
      }
    });
  }

  /* ── Desktop dropdown hover menus ──────────────────────────────────────── */
  /* Uses DIRECT child <ul> only; nested sub-menus open to the right.         */
  /* Skipped on mobile/tablet (≤1024px) where touch "hover" is unreliable.   */
  function initDropdowns() {
    if (!window.matchMedia('(min-width: 1025px)').matches) return;
    document.querySelectorAll(
      '.menu-item-has-children, .astro-item-has-children'
    ).forEach(function (item) {
      /* direct child <ul> of this li — never a deep descendant */
      var sub = null;
      for (var i = 0; i < item.children.length; i++) {
        if (item.children[i].tagName === 'UL') { sub = item.children[i]; break; }
      }
      if (!sub) return;

      /* add container class so CSS .85em font-size rule fires, then undo its overflow clip */
      sub.classList.add('astro-nav-menu__container');
      sub.style.overflow = 'visible';

      /* nested if this item itself sits inside an existing .sub-menu */
      var isNested = !!item.parentElement &&
        !!item.parentElement.closest('ul.sub-menu, ul.astro-nav-menu--dropdown');

      var timer = null;
      item.style.position = 'relative';

      function show() {
        clearTimeout(timer);
        sub.style.display  = 'block';
        sub.style.position = 'absolute';
        sub.style.zIndex   = '99999';
        sub.style.width    = 'max-content';
        if (isNested) {
          sub.style.top  = '0';
          sub.style.left = '100%';
        } else {
          sub.style.top  = '100%';
          sub.style.left = '0';
        }
        sub.style.visibility = 'visible';
        sub.style.opacity    = '1';
      }
      function hide() {
        timer = setTimeout(function () {
          sub.style.display    = 'none';
          sub.style.visibility = '';
          sub.style.opacity    = '';
        }, 150);
      }

      item.addEventListener('mouseenter', show);
      item.addEventListener('mouseleave', hide);
      sub.addEventListener('mouseenter', show);
      sub.addEventListener('mouseleave', hide);
    });
  }

  /* ── Sticky header ──────────────────────────────────────────────────────── */
  /* Adds astro-sticky--effects to the inner element (triggers white CSS)  */
  /* plus a direct white background fallback on the header itself.             */
  function initStickyHeader() {
    var header = document.querySelector('header.astro-location-header') ||
                 document.querySelector('header');
    if (!header) return;

    var headerH  = header.getBoundingClientRect().height;
    var isSticky = false;

    var spacer = document.createElement('div');
    spacer.style.cssText = 'height:0;display:block;flex-shrink:0;pointer-events:none;';
    header.parentNode.insertBefore(spacer, header.nextSibling);

    function applySticky() {
      if (window.scrollY > 5 && !isSticky) {
        isSticky = true;
        header.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:100%!important;z-index:9999!important;background-color:#fff!important;';
        header.classList.add('astro-sticky--active');
        var fx = document.querySelector('.astro-element-0ba7018');
        if (fx) fx.classList.add('astro-sticky--effects');
        spacer.style.height = headerH + 'px';
      } else if (window.scrollY <= 5 && isSticky) {
        isSticky = false;
        header.style.cssText = '';
        header.classList.remove('astro-sticky--active');
        var fx2 = document.querySelector('.astro-element-0ba7018');
        if (fx2) fx2.classList.remove('astro-sticky--effects');
        spacer.style.height = '0';
      }
    }

    window.addEventListener('scroll', applySticky, { passive: true });
    applySticky();
  }

  /* ── Smooth scroll for # anchor links ──────────────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = this.getAttribute('href').slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ── Lazy-load images (data-src) ────────────────────────────────────────── */
  function initLazyImages() {
    var imgs = document.querySelectorAll('img[data-src]');
    if (!imgs.length) return;
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            img.src = img.dataset.src;
            if (img.dataset.srcset) img.srcset = img.dataset.srcset;
            img.removeAttribute('data-src');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });
      imgs.forEach(function (img) { obs.observe(img); });
    } else {
      imgs.forEach(function (img) {
        img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      });
    }
  }

  /* ── Sticky bottom CTA (mobile only) ───────────────────────────────────── */
  /* Elementor's JS would do this — replicate for elements with sticky:bottom */
  function initStickyBottomCTA() {
    document.querySelectorAll('[data-settings]').forEach(function (el) {
      try {
        var s = JSON.parse(el.getAttribute('data-settings'));
        if (s.sticky === 'bottom' && Array.isArray(s.sticky_on) && s.sticky_on.indexOf('mobile') !== -1) {
          el.style.cssText += 'position:fixed!important;bottom:0!important;left:0!important;width:100%!important;z-index:9998!important;';
        }
      } catch (e) {}
    });
  }

  /* ── Mobile footer fixes ────────────────────────────────────────────────── */
  /* 1. Logo: astro-element-a70b853 is width:260px which overflows on narrow   */
  /*    mobile screens — clamp it to 100% of its container.                    */
  /* 2. Bottom bar: astro-element-e6f30fc has justify-content:center from      */
  /*    Elementor CSS, centering the tiny Terms/Privacy/Sitemap nav in the      */
  /*    middle of the screen. Override to left-align on mobile.                 */
  function initMobileFooterFixes() {
    var style = document.createElement('style');
    style.textContent =
      '@media(max-width:1024px){' +
      /* Footer logo column — force full width so logo and description don't   */
      /* overflow. On mobile the column sits at ~50% width (tablet grid),       */
      /* causing the 260px logo to overflow right and text to be clipped.       */
      '.astro-element-94997b5{width:100%!important;max-width:100%!important;}' +
      /* Description text widget — full width so it wraps instead of overflows  */
      '.astro-element-ab2d033{width:100%!important;max-width:100%!important;}' +
      '.astro-element-ab2d033 .astro-widget-container{width:100%!important;}' +
      /* Logo widget — constrain image to column width */
      '.astro-element-a70b853{max-width:100%!important;}' +
      '.astro-element-a70b853 img{max-width:100%!important;height:auto!important;}' +
      /* Bottom bar — stack and left-align on mobile.                           */
      /* e32660c3 and e367df8e are flex-direction:column containers; their       */
      /* align-items (cross-axis = horizontal) must be flex-start, not center.  */
      '.astro-element-e6f30fc{justify-content:flex-start!important;flex-direction:column!important;align-items:flex-start!important;}' +
      '.astro-element-32660c3{align-items:flex-start!important;}' +
      '.astro-element-367df8e{width:100%!important;align-items:flex-start!important;}' +
      /* Copyright text widget — full width + left-align */
      '.astro-element-7580a54{width:100%!important;text-align:left!important;}' +
      '.astro-element-7580a54 .astro-widget-container{text-align:left!important;}' +
      /* Terms nav widget — left-align items (overrides astro-nav-menu__align-center  */
      /* and align-self:center which is set directly on this widget element)           */
      '.astro-element-e2b2e94{text-align:left!important;align-self:flex-start!important;}' +
      '.astro-element-e2b2e94 .astro-nav-menu--main,' +
      '.astro-element-e2b2e94 .astro-nav-menu{justify-content:flex-start!important;text-align:left!important;}' +
      '.astro-element-e2b2e94 .astro-nav-menu li,' +
      '.astro-element-e2b2e94 .astro-nav-menu a{text-align:left!important;}' +
      '}';
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initDropdowns();
    initStickyHeader();
    initSmoothScroll();
    initLazyImages();
    initStickyBottomCTA();
    initMobileFooterFixes();
  });
})();
