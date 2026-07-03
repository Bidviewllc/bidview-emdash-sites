(function () {
  'use strict';

  // ── Mobile hamburger menu ────────────────────────────────────────────────
  var toggle = document.querySelector('.astro-menu-toggle');
  var mobileNav = document.querySelector('.astro-nav-menu--dropdown.astro-nav-menu__container');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      mobileNav.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      toggle.classList.toggle('astro-menu-toggle--active', !isOpen);
    });
  }

  // ── Mobile submenu accordion ─────────────────────────────────────────────
  if (mobileNav) {
    var mobileParents = mobileNav.querySelectorAll('.menu-item-has-children > a');
    mobileParents.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href === '#') {
          e.preventDefault();
        }
        var li = link.parentElement;
        var sub = li.querySelector('.sub-menu');
        if (sub) {
          var open = li.classList.contains('astro-active');
          // Close siblings
          var siblings = li.parentElement.querySelectorAll('.menu-item-has-children');
          siblings.forEach(function (s) {
            s.classList.remove('astro-active');
            var ssub = s.querySelector(':scope > .sub-menu');
            if (ssub) ssub.style.display = '';
          });
          li.classList.toggle('astro-active', !open);
          sub.style.display = open ? '' : 'block';
        }
      });
    });
  }

  // ── Desktop dropdown hover (gap-tolerant) ────────────────────────────────
  // The submenu is position:absolute;top:100% with a ~5px gap below the parent.
  // Hiding immediately on mouseleave closes it before the pointer reaches the
  // submenu. A short hide-delay (cancelled on re-enter) keeps it usable, and
  // listening on the submenu itself covers the gap.
  var desktopNav = document.querySelector('.astro-nav-menu--main');
  if (desktopNav) {
    var parents = desktopNav.querySelectorAll('.menu-item-has-children');
    parents.forEach(function (li) {
      var sub = li.querySelector(':scope > .sub-menu');
      if (!sub) return;
      var hideTimer;
      var show = function () { clearTimeout(hideTimer); sub.style.display = 'block'; };
      var hide = function () { clearTimeout(hideTimer); hideTimer = setTimeout(function () { sub.style.display = ''; }, 320); };
      li.addEventListener('mouseenter', show);
      li.addEventListener('mouseleave', hide);
      sub.addEventListener('mouseenter', show);
      sub.addEventListener('mouseleave', hide);
    });
  }

  // ── Table of Contents (Elementor builds this client-side; replicate it) ──
  document.querySelectorAll('.astro-widget-table-of-contents').forEach(function (widget) {
    var body = widget.querySelector('.astro-toc__body');
    if (!body || body.querySelector('.astro-toc__list-wrapper')) return;
    // Scope headings to the article column (the sibling of the TOC's sidebar column).
    var inner = widget.closest('.e-con-inner') || document.body;
    var sidebarCol = widget;
    while (sidebarCol && sidebarCol.parentElement !== inner) sidebarCol = sidebarCol.parentElement;
    var heads = [].slice.call(inner.querySelectorAll('h2, h3')).filter(function (h) {
      return !h.closest('header') && !h.closest('footer') &&
             !h.closest('.astro-widget-table-of-contents') &&
             !(sidebarCol && sidebarCol.contains(h));
    });
    if (!heads.length) return;
    var used = {};
    function slug(t) { var s = t.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section'; while (used[s]) s += '-x'; used[s] = 1; return s; }
    var wrapper = document.createElement('ul');
    wrapper.className = 'astro-toc__list-wrapper';
    var currentTop = null;
    heads.forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent);
      var li = document.createElement('li');
      li.className = 'astro-toc__list-item' + (h.tagName === 'H2' ? ' astro-toc__top-level' : '');
      var a = document.createElement('a');
      a.className = 'astro-toc__list-item-text astro-toc__list-item-text-clickable';
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      a.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: h.getBoundingClientRect().top + window.pageYOffset - 120, behavior: 'smooth' });
        if (history.replaceState) history.replaceState(null, '', '#' + h.id);
      });
      li.appendChild(a);
      if (h.tagName === 'H2') { wrapper.appendChild(li); currentTop = li; }
      else if (currentTop) {
        var nested = currentTop.querySelector(':scope > ul.astro-toc__list-wrapper');
        if (!nested) { nested = document.createElement('ul'); nested.className = 'astro-toc__list-wrapper'; currentTop.appendChild(nested); }
        nested.appendChild(li);
      } else { wrapper.appendChild(li); }
    });
    body.innerHTML = '';
    body.appendChild(wrapper);
  });
  // TOC expand/collapse toggle
  document.querySelectorAll('.astro-toc__toggle-button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var w = btn.closest('.astro-widget-table-of-contents');
      if (w) w.classList.toggle('astro-toc--collapsed');
    });
  });

  // ── Sticky header ────────────────────────────────────────────────────────
  var stickyEl = document.querySelector('[data-settings*="sticky"]');
  if (stickyEl) {
    var stickyTop = stickyEl.offsetTop || 0;
    window.addEventListener('scroll', function () {
      if (window.scrollY > stickyTop) {
        stickyEl.classList.add('astro-sticky--active');
      } else {
        stickyEl.classList.remove('astro-sticky--active');
      }
    }, { passive: true });
  }

  // ── Location tabs (contact page) ─────────────────────────────────────────
  // CSS hides via .e-n-tabs-content>.e-con:not(.e-active){display:none}
  // Panels use id="e-n-tab-content-*", not class="e-n-tab-content"
  var tabs = document.querySelectorAll('.e-n-tabs-heading .e-n-tab-title');
  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var tabGroup = tab.closest('.e-n-tabs');
        if (!tabGroup) return;
        // Mark tabs as activated so CSS stops force-showing first panel
        tabGroup.classList.add('e-activated');
        // Deactivate all tabs
        tabGroup.querySelectorAll('.e-n-tab-title').forEach(function (t) {
          t.setAttribute('aria-selected', 'false');
          t.classList.remove('e-active');
          t.setAttribute('tabindex', '-1');
        });
        // Hide all panels by removing e-active
        tabGroup.querySelectorAll('[id^="e-n-tab-content-"]').forEach(function (c) {
          c.classList.remove('e-active');
          c.setAttribute('aria-hidden', 'true');
        });
        // Activate clicked tab
        tab.setAttribute('aria-selected', 'true');
        tab.classList.add('e-active');
        tab.setAttribute('tabindex', '0');
        // Show target panel
        var targetId = tab.getAttribute('aria-controls');
        if (targetId) {
          var panel = document.getElementById(targetId);
          if (panel) {
            panel.classList.add('e-active');
            panel.setAttribute('aria-hidden', 'false');
          }
        }
      });
    });
  }

  // ── Accordion / nested-tabs fallback ────────────────────────────────────
  document.querySelectorAll('.astro-toggle-title, .astro-tab-title').forEach(function (title) {
    title.style.cursor = 'pointer';
    title.addEventListener('click', function () {
      var parent = title.closest('.astro-toggle, .astro-tab');
      if (parent) parent.classList.toggle('astro-active');
    });
  });

}());
