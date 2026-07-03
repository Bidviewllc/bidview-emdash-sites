(function () {
  function closest(element, selector) {
    if (element && element.nodeType !== 1) {
      element = element.parentElement;
    }
    while (element && element.nodeType === 1) {
      if (element.matches(selector)) return element;
      element = element.parentElement;
    }
    return null;
  }

  function updateHeaderHeight() {
    var header = document.querySelector(".astro-location-header");
    if (!header) return;
    document.documentElement.style.setProperty("--local-header-height", header.offsetHeight + "px");
  }

  updateHeaderHeight();
  window.addEventListener("load", updateHeaderHeight);
  window.addEventListener("resize", updateHeaderHeight);

  function accordionRegion(item) {
    if (!item) return null;
    for (var index = 0; index < item.children.length; index += 1) {
      if (item.children[index].getAttribute("role") === "region") return item.children[index];
    }
    return item.querySelector('[role="region"]');
  }

  function setAccordionExpanded(item, expanded) {
    var summary = item ? item.querySelector("summary.e-n-accordion-item-title") : null;
    if (summary) summary.setAttribute("aria-expanded", String(expanded));
  }

  function openAccordionItem(item) {
    if (!item) return;
    var region = accordionRegion(item);
    item.removeAttribute("data-local-accordion-closing");
    item.removeAttribute("data-local-accordion-token");
    item.setAttribute("open", "");
    item.open = true;
    setAccordionExpanded(item, true);
    if (!region) return;
    region.style.overflow = "hidden";
    region.style.maxHeight = "0px";
    region.style.opacity = "0";
    region.offsetHeight;
    region.style.maxHeight = region.scrollHeight + "px";
    region.style.opacity = "1";
    window.setTimeout(function () {
      if (item.open && !item.hasAttribute("data-local-accordion-closing")) {
        region.style.maxHeight = "none";
        region.style.overflow = "";
      }
    }, 500);
  }

  function closeAccordionItem(item) {
    if (!item || !item.open || item.hasAttribute("data-local-accordion-closing")) return;
    var region = accordionRegion(item);
    setAccordionExpanded(item, false);
    if (!region) {
      item.removeAttribute("open");
      item.open = false;
      return;
    }
    var token = String(Date.now()) + String(Math.random());
    item.setAttribute("data-local-accordion-closing", "true");
    item.setAttribute("data-local-accordion-token", token);
    region.style.overflow = "hidden";
    region.style.maxHeight = region.scrollHeight + "px";
    region.style.opacity = "1";
    region.offsetHeight;
    region.style.maxHeight = "0px";
    region.style.opacity = "0";
    window.setTimeout(function () {
      if (item.getAttribute("data-local-accordion-token") === token) {
        item.removeAttribute("open");
        item.open = false;
        item.removeAttribute("data-local-accordion-closing");
        item.removeAttribute("data-local-accordion-token");
        region.style.maxHeight = "";
        region.style.opacity = "";
        region.style.overflow = "";
      }
    }, 500);
  }

  function closeAccordionSiblings(item) {
    var accordion = closest(item, ".e-n-accordion");
    if (!accordion) return;
    Array.prototype.forEach.call(accordion.querySelectorAll("details.e-n-accordion-item[open]"), function (sibling) {
      if (sibling !== item) closeAccordionItem(sibling);
    });
  }

  function closeMenuBranch(item) {
    if (!item) return;
    item.classList.remove("is-open");
    Array.prototype.forEach.call(item.querySelectorAll(".menu-item-has-children.is-open"), function (child) {
      child.classList.remove("is-open");
    });
  }

  function mobileDropdownNav(widget) {
    return widget ? widget.querySelector(".astro-widget-container > nav.astro-nav-menu--dropdown.astro-nav-menu__container") : null;
  }

  function setMobileMenuOpen(widget, open) {
    if (!widget) return;
    var nav = mobileDropdownNav(widget);
    var toggle = widget.querySelector(".astro-menu-toggle");
    widget.classList.toggle("menu-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (nav) {
      nav.setAttribute("aria-hidden", String(!open));
      Array.prototype.forEach.call(nav.querySelectorAll("a"), function (link) {
        if (open) {
          link.removeAttribute("tabindex");
        } else {
          link.setAttribute("tabindex", "-1");
        }
      });
      if (!open) {
        Array.prototype.forEach.call(nav.querySelectorAll(".menu-item-has-children.is-open"), closeMenuBranch);
      }
    }
  }

  function setupDesktopNavHover() {
    Array.prototype.forEach.call(document.querySelectorAll(".astro-element-a679b45 .astro-nav-menu--main .menu-item-has-children"), function (item) {
      var closeTimer = null;
      function isDesktopNav() {
        return window.matchMedia("(min-width: 1025px)").matches;
      }
      function openItem() {
        if (!isDesktopNav()) return;
        window.clearTimeout(closeTimer);
        if (item.parentElement) {
          Array.prototype.forEach.call(item.parentElement.children, function (sibling) {
            if (sibling !== item && sibling.classList) sibling.classList.remove("is-hovered");
          });
        }
        item.classList.add("is-hovered");
      }
      function scheduleClose() {
        if (!isDesktopNav()) return;
        window.clearTimeout(closeTimer);
        closeTimer = window.setTimeout(function () {
          if (!item.matches(":hover") && !item.contains(document.activeElement)) {
            item.classList.remove("is-hovered");
          }
        }, 500);
      }
      item.addEventListener("pointerenter", openItem);
      item.addEventListener("pointerleave", scheduleClose);
      item.addEventListener("focusin", openItem);
      item.addEventListener("focusout", scheduleClose);
    });
  }

  setupDesktopNavHover();

  document.addEventListener("click", function (event) {
    var tocLink = closest(event.target, "a[data-local-toc-link]");
    if (tocLink) {
      var targetId = tocLink.getAttribute("data-target") || tocLink.getAttribute("href").replace(/^#/, "");
      var target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    var accordionSummary = closest(event.target, "summary.e-n-accordion-item-title");
    if (accordionSummary) {
      var accordionItem = closest(accordionSummary, "details.e-n-accordion-item");
      if (accordionItem) {
        event.preventDefault();
        var willOpen = !accordionItem.open || accordionItem.hasAttribute("data-local-accordion-closing");
        if (willOpen) {
          closeAccordionSiblings(accordionItem);
          openAccordionItem(accordionItem);
        } else {
          closeAccordionItem(accordionItem);
        }
        return;
      }
    }

    var toggle = closest(event.target, ".astro-menu-toggle");
    if (toggle) {
      event.preventDefault();
      var widget = closest(toggle, ".astro-widget-nav-menu");
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      setMobileMenuOpen(widget, !expanded);
      return;
    }

    var submenuToggle = closest(event.target, ".menu-item-has-children > a");
    if (submenuToggle && window.matchMedia("(max-width: 1024px)").matches) {
      var item = closest(submenuToggle, ".menu-item-has-children");
      var mobileNav = closest(submenuToggle, "nav.astro-nav-menu--dropdown.astro-nav-menu__container");
      if (item && mobileNav && item.querySelector(".sub-menu")) {
        event.preventDefault();
        var open = !item.classList.contains("is-open");
        if (item.parentElement) {
          Array.prototype.forEach.call(item.parentElement.children, function (sibling) {
            if (sibling !== item && sibling.classList && sibling.classList.contains("is-open")) closeMenuBranch(sibling);
          });
        }
        item.classList.toggle("is-open", open);
      }
    }
  }, true);

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (form && form.matches('form[data-local-static-form="true"]')) {
      event.preventDefault();
      return false;
    }
  });
})();