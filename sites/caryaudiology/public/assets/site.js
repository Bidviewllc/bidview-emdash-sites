/* Cary Audiology — local static behaviors (replaces stripped WP/Elementor runtime).
   Rebuilds only: FAQ accordion, mobile menu toggle, mobile submenu expand.
   Desktop dropdowns are handled by CSS (:hover / :focus-within) in site.css.
   Vanilla JS, no jQuery. Source of truth: assets-src/site.js (copied into
   local-site/assets/ by scripts/localize.mjs). */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ---------- Collapsibles: accordion + toggle widgets ----------
     accordion = one open at a time, first item open by default (matches live)
     toggle    = each item independent, all closed by default (matches live) */
  function initCollapsible(selector, opts) {
    var oneAtATime = opts.oneAtATime, openFirst = opts.openFirst;
    var itemSel = opts.itemSelector;
    document.querySelectorAll(selector).forEach(function (widget) {
      var titles = Array.prototype.slice.call(widget.querySelectorAll(".elementor-tab-title"));
      if (!titles.length) return;

      function contentFor(title) {
        var item = title.closest(itemSel) || title.parentElement;
        return item ? item.querySelector(".elementor-tab-content") : null;
      }
      function setOpen(title, open) {
        var content = contentFor(title);
        title.classList.toggle("elementor-active", open);
        title.setAttribute("aria-expanded", open ? "true" : "false");
        if (content) content.style.display = open ? "block" : "none";
      }

      titles.forEach(function (title, idx) {
        setOpen(title, openFirst && idx === 0);
        function toggle() {
          var isOpen = title.classList.contains("elementor-active");
          if (oneAtATime) titles.forEach(function (t) { if (t !== title) setOpen(t, false); });
          setOpen(title, !isOpen);
        }
        title.addEventListener("click", toggle);
        title.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
            e.preventDefault();
            toggle();
          }
        });
      });
    });
  }

  function initAccordions() {
    initCollapsible(".elementor-accordion", { oneAtATime: true, openFirst: true, itemSelector: ".elementor-accordion-item" });
    initCollapsible(".elementor-toggle", { oneAtATime: false, openFirst: false, itemSelector: ".elementor-toggle-item" });
  }

  /* ---------- Mobile menu toggle + submenu expand ---------- */
  function initMobileNav() {
    document.querySelectorAll(".elementor-menu-toggle").forEach(function (toggle) {
      var container = toggle.closest(".elementor-widget-container") || toggle.parentElement;
      var panel = container ? container.querySelector("nav.elementor-nav-menu--dropdown") : null;
      if (!panel) return;

      var header = document.querySelector('header[data-elementor-type="header"]')
        || toggle.closest("header") || document.querySelector("header");

      function setToggle(open) {
        toggle.classList.toggle("elementor-active", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        panel.setAttribute("aria-hidden", open ? "false" : "true");
        panel.classList.toggle("is-open", open);
        if (open) {
          // full-width panel below the header (matches live; Elementor's JS did this)
          var top = header ? header.getBoundingClientRect().bottom : 0;
          panel.style.position = "fixed";
          panel.style.left = "0";
          panel.style.right = "0";
          panel.style.width = "100%";
          panel.style.top = top + "px";
          panel.style.maxHeight = "calc(100vh - " + top + "px)";
          panel.style.overflowY = "auto";
          panel.style.zIndex = "9999";
        } else {
          panel.style.position = "";
          panel.style.left = "";
          panel.style.right = "";
          panel.style.width = "";
          panel.style.top = "";
          panel.style.maxHeight = "";
          panel.style.overflowY = "";
          panel.style.zIndex = "";
        }
      }
      setToggle(false);

      function flip() { setToggle(!toggle.classList.contains("elementor-active")); }
      toggle.addEventListener("click", flip);
      toggle.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          flip();
        }
      });

      panel.querySelectorAll("li.menu-item-has-children").forEach(function (li) {
        var sub = li.querySelector(":scope > .sub-menu");
        if (!sub) return;
        sub.style.display = "none";
        var caret = document.createElement("button");
        caret.type = "button";
        caret.className = "cary-submenu-toggle";
        caret.setAttribute("aria-label", "Expand submenu");
        caret.setAttribute("aria-expanded", "false");
        caret.innerHTML = '<span aria-hidden="true"></span>';
        caret.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var open = sub.style.display === "block";
          sub.style.display = open ? "none" : "block";
          caret.setAttribute("aria-expanded", open ? "false" : "true");
          caret.classList.toggle("is-open", !open);
        });
        // insert as a sibling AFTER the link (valid HTML — no nested interactive
        // controls); site.css makes the li center the link + caret inline.
        var link = li.querySelector(":scope > a");
        if (link && link.parentNode) {
          li.classList.add("cary-has-toggle");
          link.parentNode.insertBefore(caret, link.nextSibling);
        }
      });
    });
  }

  /* ---------- Table of Contents (elementor TOC widget "Page Topics") ---------- */
  function initTOC() {
    document.querySelectorAll(".elementor-widget-table-of-contents").forEach(function (toc) {
      var body = toc.querySelector(".elementor-toc__body");
      if (!body) return;

      // scope strictly to article content; do NOT fall back to body (would pull
      // header/footer/sidebar/TOC headings). No content container => no TOC.
      var content = document.querySelector(".elementor-widget-theme-post-content");
      if (!content) {
        body.innerHTML = '<div class="elementor-toc__no-headings-message">No headings were found on this page.</div>';
        return;
      }
      var heads = Array.prototype.slice.call(content.querySelectorAll("h2, h3, h4"))
        .filter(function (h) {
          return h.textContent.trim().length
            && !h.closest(".elementor-widget-table-of-contents");
        });

      if (!heads.length) {
        body.innerHTML = '<div class="elementor-toc__no-headings-message">No headings were found on this page.</div>';
        return;
      }

      // seed with IDs already present on the page so we never collide
      var used = {};
      document.querySelectorAll("[id]").forEach(function (el) { used[el.id] = 1; });
      function slug(t) {
        var s = t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
        if (!s) s = "section";
        var base = s, i = 2;
        while (used[s]) { s = base + "-" + i; i += 1; }
        used[s] = 1;
        return s;
      }
      heads.forEach(function (h) { if (!h.id) h.id = slug(h.textContent); });

      // FLAT list, no nesting — matches live Elementor TOC (all headings at one level)
      var root = document.createElement("ul");
      root.className = "elementor-toc__list-wrapper";
      heads.forEach(function (h) {
        var li = document.createElement("li");
        li.className = "elementor-toc__list-item";
        var a = document.createElement("a");
        a.className = "elementor-toc__list-item-text";
        a.href = "#" + h.id;
        a.textContent = h.textContent.trim();
        li.appendChild(a);
        root.appendChild(li);
      });

      body.innerHTML = "";
      body.appendChild(root);

      root.addEventListener("click", function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var el = document.getElementById(a.getAttribute("href").slice(1));
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          if (history.replaceState) history.replaceState(null, "", a.getAttribute("href"));
        }
      });

      // wire the collapse toggle (minimize_box) if present
      var toggle = toc.querySelector(".elementor-toc__toggle-button");
      if (toggle) {
        toggle.addEventListener("click", function () {
          var collapsed = toc.classList.toggle("elementor-toc--collapsed");
          body.style.display = collapsed ? "none" : "";
        });
      }
    });
  }

  /* ---------- Desktop main-nav dropdown carets (smartmenus injected these) ---------- */
  function initDesktopNavArrows() {
    var SVG = '<svg aria-hidden="true" class="e-font-icon-svg e-fas-angle-down" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z"></path></svg>';
    document.querySelectorAll(".elementor-nav-menu--main li.menu-item-has-children").forEach(function (li) {
      var target = li.querySelector(":scope > a.elementor-item") || li.querySelector(":scope > .elementor-item");
      if (!target || target.querySelector(".sub-arrow")) return;
      var span = document.createElement("span");
      span.className = "sub-arrow";
      span.innerHTML = SVG;
      target.appendChild(span);
    });
  }

  /* ---------- Elementor image gallery (JS applied bg-image + grid sizing) ---------- */
  function initGalleries() {
    document.querySelectorAll(".e-gallery-image[data-thumbnail]").forEach(function (item) {
      var src = item.getAttribute("data-thumbnail");
      if (src) item.style.backgroundImage = 'url("' + src + '")';
      item.classList.add("cary-gallery-ready");
    });
  }

  /* ---------- Video widget (elementor injects the iframe via JS from data-settings) ---------- */
  function initVideos() {
    document.querySelectorAll(".elementor-widget-video").forEach(function (w) {
      var host = w.querySelector(".elementor-video");
      if (!host || host.querySelector("iframe")) return;
      var settings = {};
      try { settings = JSON.parse(w.getAttribute("data-settings") || "{}"); } catch (e) { return; }
      var url = settings.youtube_url || settings.vimeo_url || settings.link || "";
      var src = null;
      var ym = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
      if (ym) src = "https://www.youtube.com/embed/" + ym[1];
      var vm = url.match(/vimeo\.com\/(\d+)/);
      if (vm) src = "https://player.vimeo.com/video/" + vm[1];
      if (!src) return;
      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = "Video";
      iframe.loading = "lazy";
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("allow", "accelerometer; encrypted-media; gyroscope; picture-in-picture");
      iframe.style.cssText = "width:100%;aspect-ratio:16/9;border:0;display:block;";
      host.appendChild(iframe);
    });
  }

  ready(function () {
    initAccordions();
    initMobileNav();
    initTOC();
    initDesktopNavArrows();
    initGalleries();
    initVideos();
  });
})();
