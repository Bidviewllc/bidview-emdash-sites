(function () {
  var body = document.body;
  var headerNav = document.querySelector(".astro-location-header .astro-element-e14e10a");
  var topBar = document.querySelector(".astro-location-header .astro-element-2c7138b");
  var menuToggle = document.querySelector(".astro-location-header .astro-element-4da6423 .astro-menu-toggle");
  var menuToggles = document.querySelectorAll(".astro-location-header .astro-element-4da6423 .astro-menu-toggle");
  var mobilePopupIcon = document.querySelector(".astro-location-header .astro-element-997cec5 a");
  var dropdownMenu = document.querySelector(".astro-location-header .astro-element-4da6423 nav.astro-nav-menu--dropdown");
  var mobilePopup = null;
  var mobilePopupPanel = null;

  function syncHeader() {
    var width = window.innerWidth + "px";
    var isMobile = window.innerWidth <= 767;

    if (!isMobile && body.classList.contains("local-mobile-popup-open")) {
      setMobilePopupState(false);
    }

    if (headerNav) {
      headerNav.style.width = width;
      headerNav.style.left = "0px";
      headerNav.style.right = "0px";
      headerNav.style.top = isMobile ? "0px" : "36px";
    }

    if (topBar) {
      topBar.style.width = width;
      topBar.style.left = "0px";
      topBar.style.right = "0px";
    }

    body.classList.toggle("local-scrolled", window.scrollY > 8);
  }

  function normalizeButtonText(button) {
    var textNode = button.querySelector(".astro-button-text");
    return (textNode ? textNode.textContent : button.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function ensureButtonIcon(button) {
    var wrapper = button.querySelector(".astro-button-content-wrapper") || button;
    var icon = button.querySelector(".astro-button-icon");

    if (!icon) {
      icon = document.createElement("span");
      icon.className = "astro-button-icon";
      wrapper.appendChild(icon);
    }

    if (!icon.querySelector("i")) {
      icon.innerHTML = '<i aria-hidden="true" class="fas fa-arrow-right-long local-fa-arrow-right-long"></i>';
    }
  }

  function normalizeFontAwesomeLongArrows(root) {
    (root || document).querySelectorAll("i.fa-long-arrow-right").forEach(function (icon) {
      icon.classList.remove("fa-long-arrow-right");
      icon.classList.add("fa-arrow-right-long", "local-fa-arrow-right-long");
      if (!icon.classList.contains("fas") && !icon.classList.contains("fa")) {
        icon.classList.add("fas");
      }
    });
  }


  function applyGlobalAppointmentLinks(root) {
    var appointmentUrl = document.body && document.body.getAttribute("data-appointment-url");
    if (!appointmentUrl) return;
    (root || document).querySelectorAll(".astro-button").forEach(function (button) {
      var text = normalizeButtonText(button);
      if (text === "schedule your appointment") {
        button.setAttribute("href", appointmentUrl);
      }
    });
  }
  function applyButtonIconClasses(root) {
    (root || document).querySelectorAll(".astro-button").forEach(function (button) {
      var text = normalizeButtonText(button);
      var useLongArrow = text === "schedule your appointment" || text === "get directions" || text === "contact us";
      var useShortArrow = text === "learn more" || text === "read more";

      button.classList.remove("local-icon-arrow-right-long", "local-icon-arrow-right");

      if (useLongArrow || useShortArrow) {
        ensureButtonIcon(button);
        button.classList.add(useLongArrow ? "local-icon-arrow-right-long" : "local-icon-arrow-right");
        if (useLongArrow) {
          var icon = button.querySelector(".astro-button-icon i");
          if (icon) {
            icon.classList.remove("fa-long-arrow-right");
            icon.classList.add("fas", "fa-arrow-right-long", "local-fa-arrow-right-long");
          }
        }
      }
    });
  }

  function isMobilePopupViewport() {
    return window.innerWidth <= 767;
  }

  function setPopupSubmenuState(item, isOpen) {
    var link = item.querySelector(":scope > a");
    var submenu = item.querySelector(":scope > .sub-menu");

    item.classList.toggle("local-submenu-open", isOpen);
    if (link) {
      link.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    if (submenu) {
      submenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
      submenu.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  }

  function wirePopupSubmenus(root) {
    root.querySelectorAll("li").forEach(function (item) {
      var submenu = item.querySelector(":scope > .sub-menu");
      var link = item.querySelector(":scope > a");

      if (!submenu || !link) {
        return;
      }

      setPopupSubmenuState(item, false);
      link.addEventListener("click", function (event) {
        event.preventDefault();
        setPopupSubmenuState(item, !item.classList.contains("local-submenu-open"));
      });
    });
  }

  function buildMobilePopup() {
    if (mobilePopup) {
      return mobilePopup;
    }

    var logo = document.querySelector(".astro-location-header .astro-element-6c8f7f2 a");
    var popupNavSource = dropdownMenu || document.querySelector(".astro-location-header .astro-element-4da6423 .astro-nav-menu--main .astro-nav-menu");
    var cta = document.querySelector(".astro-location-header .astro-element-3146a90 .astro-button");

    mobilePopup = document.createElement("div");
    mobilePopup.id = "local-mobile-menu-popup";
    mobilePopup.className = "local-mobile-menu-popup astro-popup-modal dialog-type-lightbox";
    mobilePopup.setAttribute("aria-hidden", "true");
    mobilePopup.setAttribute("role", "dialog");
    mobilePopup.setAttribute("aria-modal", "true");

    var content = document.createElement("div");
    content.className = "dialog-widget-content dialog-lightbox-widget-content animated";

    var close = document.createElement("button");
    close.className = "dialog-close-button dialog-lightbox-close-button";
    close.type = "button";
    close.setAttribute("aria-label", "Close menu");
    close.innerHTML = '<svg aria-hidden="true" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M742 167L500 408 258 167C246 154 233 150 217 150 196 150 179 158 167 167 154 179 150 196 150 212 150 229 154 242 171 254L408 500 167 742C138 771 138 800 167 829 196 858 225 858 254 829L496 587 738 829C750 842 767 846 783 846 800 846 817 842 829 829 842 817 846 804 846 783 846 767 842 750 829 737L588 500 833 258C863 229 863 200 833 171 804 137 775 137 742 167Z"></path></svg>';
    close.addEventListener("click", function () {
      setMobilePopupState(false);
    });

    var message = document.createElement("div");
    message.className = "dialog-message dialog-lightbox-message";

    mobilePopupPanel = document.createElement("div");
    mobilePopupPanel.className = "astro astro-4647 astro-location-popup local-mobile-menu-panel";

    var inner = document.createElement("div");
    inner.className = "local-mobile-menu-inner";

    if (logo) {
      var logoWrap = document.createElement("div");
      logoWrap.className = "astro-element astro-element-3c5cf45 local-mobile-menu-logo";
      logoWrap.appendChild(logo.cloneNode(true));
      inner.appendChild(logoWrap);
    }

    if (popupNavSource) {
      var nav = document.createElement("nav");
      nav.className = "astro-element astro-element-6955646 astro-nav-menu--dropdown astro-nav-menu__container local-mobile-menu-nav";
      nav.setAttribute("aria-label", "Mobile Menu");
      nav.setAttribute("aria-hidden", "false");

      var sourceList = popupNavSource.matches && popupNavSource.matches("ul") ? popupNavSource : popupNavSource.querySelector(".astro-nav-menu");
      if (sourceList) {
        var list = sourceList.cloneNode(true);
        list.removeAttribute("id");
        list.querySelectorAll("[id]").forEach(function (node) {
          node.removeAttribute("id");
        });
        list.querySelectorAll("[aria-controls], [aria-labelledby]").forEach(function (node) {
          node.removeAttribute("aria-controls");
          node.removeAttribute("aria-labelledby");
        });
        list.querySelectorAll("a").forEach(function (link) {
          link.removeAttribute("tabindex");
        });
        nav.appendChild(list);
        wirePopupSubmenus(nav);
      }

      inner.appendChild(nav);
    }

    if (cta) {
      var ctaWrap = document.createElement("div");
      ctaWrap.className = "astro-element astro-element-9e19929 local-mobile-menu-cta";
      ctaWrap.appendChild(cta.cloneNode(true));
      inner.appendChild(ctaWrap);
    }

    mobilePopupPanel.appendChild(inner);
    message.appendChild(mobilePopupPanel);
    content.appendChild(close);
    content.appendChild(message);
    mobilePopup.appendChild(content);
    document.body.appendChild(mobilePopup);
    applyButtonIconClasses(mobilePopup);

    mobilePopup.addEventListener("click", function (event) {
      if (event.target === mobilePopup) {
        setMobilePopupState(false);
      }
    });

    return mobilePopup;
  }

  function setMobilePopupState(isOpen) {
    buildMobilePopup();
    body.classList.toggle("local-mobile-popup-open", isOpen);
    body.classList.toggle("local-menu-open", false);

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    menuToggles.forEach(function (toggle) {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    if (dropdownMenu) {
      dropdownMenu.setAttribute("aria-hidden", "true");
    }
    if (mobilePopup) {
      mobilePopup.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }

    if (isOpen && mobilePopupPanel) {
      var firstLink = mobilePopupPanel.querySelector("a, button");
      if (firstLink) {
        setTimeout(function () {
          firstLink.focus();
        }, 160);
      }
    }
  }

  function setMenuState(isOpen) {
    if (isMobilePopupViewport()) {
      setMobilePopupState(isOpen);
      return;
    }

    body.classList.toggle("local-mobile-popup-open", false);
    body.classList.toggle("local-menu-open", isOpen);
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    menuToggles.forEach(function (toggle) {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    if (dropdownMenu) {
      dropdownMenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  }

  function toggleMenu(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (isMobilePopupViewport()) {
      setMobilePopupState(!body.classList.contains("local-mobile-popup-open"));
      return;
    }

    setMenuState(!body.classList.contains("local-menu-open"));
  }

  menuToggles.forEach(function (toggle) {
    toggle.addEventListener("click", toggleMenu);
    toggle.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        toggleMenu(event);
      }
    });
  });

  if (mobilePopupIcon) {
    mobilePopupIcon.addEventListener("click", toggleMenu);
  }

  if (dropdownMenu) {
    dropdownMenu.querySelectorAll("li").forEach(function (item) {
      var submenu = item.querySelector(":scope > .sub-menu");
      var link = item.querySelector(":scope > a");

      if (!submenu || !link) {
        return;
      }

      link.addEventListener("click", function (event) {
        if (window.innerWidth > 1024) {
          return;
        }

        event.preventDefault();
        item.classList.toggle("local-submenu-open");
        link.setAttribute("aria-expanded", item.classList.contains("local-submenu-open") ? "true" : "false");
      });
    });
  }

  function closeDesktopSubmenus(exceptItem) {
    document.querySelectorAll(".astro-location-header .astro-element-4da6423 .astro-nav-menu--main li.local-submenu-open").forEach(function (item) {
      if (exceptItem && (item === exceptItem || item.contains(exceptItem))) {
        return;
      }

      item.classList.remove("local-submenu-open");
      var link = item.querySelector(":scope > a");
      var submenu = item.querySelector(":scope > .sub-menu");
      if (link) {
        link.setAttribute("aria-expanded", "false");
      }
      if (submenu) {
        submenu.setAttribute("aria-hidden", "true");
        submenu.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll(".astro-location-header .astro-element-4da6423 .astro-nav-menu--main li").forEach(function (item) {
    var submenu = item.querySelector(":scope > .sub-menu");
    var link = item.querySelector(":scope > a");

    if (!submenu || !link) {
      return;
    }

    function setDesktopSubmenu(isOpen) {
      if (window.innerWidth <= 1024) {
        return;
      }

      if (isOpen) {
        closeDesktopSubmenus(item);
      }

      item.classList.toggle("local-submenu-open", isOpen);
      link.setAttribute("aria-expanded", isOpen ? "true" : "false");
      submenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
      submenu.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    item.addEventListener("mouseenter", function () {
      setDesktopSubmenu(true);
    });

    item.addEventListener("mouseleave", function () {
      setDesktopSubmenu(false);
    });

    item.addEventListener("focusin", function () {
      setDesktopSubmenu(true);
    });

    link.addEventListener("click", function (event) {
      if (window.innerWidth <= 1024) {
        return;
      }

      if (!item.classList.contains("local-submenu-open")) {
        event.preventDefault();
        setDesktopSubmenu(true);
      }
    });
  });

  document.addEventListener("click", function (event) {
    if (window.innerWidth > 1024 && !event.target.closest(".astro-location-header .astro-element-4da6423")) {
      closeDesktopSubmenus(null);
    }

    if (body.classList.contains("local-mobile-popup-open")) {
      if (event.target.closest("#local-mobile-menu-popup") || event.target.closest(".astro-location-header")) {
        return;
      }
      setMobilePopupState(false);
      return;
    }

    if (!body.classList.contains("local-menu-open")) {
      return;
    }
    if (event.target.closest(".astro-location-header")) {
      return;
    }
    setMenuState(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && body.classList.contains("local-mobile-popup-open")) {
      setMobilePopupState(false);
    }
  });

  function initTableOfContents() {
    document.querySelectorAll("body:not(.home) .astro-widget-table-of-contents").forEach(function (toc) {
      if (toc.dataset.localTocReady === "true") {
        return;
      }

      var bodyEl = toc.querySelector(".astro-toc__body");
      var expand = toc.querySelector(".astro-toc__toggle-button--expand");
      var collapse = toc.querySelector(".astro-toc__toggle-button--collapse");
      var header = toc.querySelector(".astro-toc__header");

      if (!bodyEl || (!expand && !collapse && !header)) {
        return;
      }

      toc.dataset.localTocReady = "true";

      function setOpen(isOpen) {
        toc.classList.toggle("astro-toc--collapsed", !isOpen);
        bodyEl.style.display = isOpen ? "block" : "none";
        bodyEl.hidden = !isOpen;

        [expand, collapse].forEach(function (button) {
          if (!button) return;
          button.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
      }

      function toggle(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        setOpen(toc.classList.contains("astro-toc--collapsed") || bodyEl.style.display === "none");
      }

      [expand, collapse].forEach(function (trigger) {
        if (!trigger) return;
        trigger.addEventListener("click", toggle);
        trigger.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            toggle(event);
          }
        });
      });

      if (header) {
        header.addEventListener("click", function (event) {
          event.preventDefault();
          setOpen(toc.classList.contains("astro-toc--collapsed") || bodyEl.style.display === "none");
        });
        header.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(toc.classList.contains("astro-toc--collapsed") || bodyEl.style.display === "none");
          }
        });
      }

      toc.querySelectorAll(".astro-toc__list-item-text").forEach(function (link) {
        link.addEventListener("click", function () {
          setOpen(false);
        });
      });

      setOpen(!toc.classList.contains("astro-toc--collapsed") && bodyEl.style.display !== "none");
    });
  }


  function initContactForm() {
    var form = document.querySelector(".astro-contact-form");
    if (!form || form.dataset.astroContactBound === "true") return;
    form.dataset.astroContactBound = "true";

    var submit = form.querySelector(".astro-contact-form__submit");
    var grid = form.querySelector(".astro-contact-form__grid") || form;
    var status = form.querySelector(".astro-contact-form__status");
    if (!status) {
      status = document.createElement("div");
      status.className = "astro-contact-form__status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      grid.appendChild(status);
    }

    ["name", "email", "message"].forEach(function (fieldName) {
      var field = form.querySelector('[name="' + fieldName + '"]');
      if (field) field.setAttribute("required", "required");
    });

    function setStatus(message, type) {
      status.textContent = message || "";
      status.classList.remove("astro-contact-form__status--success", "astro-contact-form__status--error");
      if (type) status.classList.add("astro-contact-form__status--" + type);
    }

    function value(name) {
      var field = form.querySelector('[name="' + name + '"]');
      return field ? field.value.trim() : "";
    }

    form.removeAttribute("onsubmit");
    if (submit) submit.removeAttribute("aria-disabled");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();

      var payload = {
        name: value("name"),
        email: value("email"),
        phone: value("phone"),
        subject: value("subject"),
        message: value("message")
      };

      if (!payload.name || !payload.email || !payload.message) {
        setStatus("Please complete your name, email, and message.", "error");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        setStatus("Please enter a valid email address.", "error");
        return;
      }

      var previousText = submit ? submit.textContent : "";
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Sending...";
      }
      setStatus("", null);

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (result) {
            if (!response.ok || !result.ok) throw new Error(result.error || "We couldn't send your message right now. Please try again.");
            return result;
          });
        })
        .then(function () {
          form.reset();
          setStatus("Message sent. Thank you for reaching out.", "success");
        })
        .catch(function (error) {
          setStatus(error.message || "We couldn't send your message right now. Please try again or call (813) 851-2311.", "error");
        })
        .finally(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = previousText || "Send";
          }
        });
    }, true);
  }

  function initStaffCarousel() {
    var root = document.querySelector(".astro-element-c146eba");
    if (!root || root.dataset.localCarouselReady === "true") {
      return;
    }

    var viewport = root.querySelector(".swiper");
    var wrapper = root.querySelector(".swiper-wrapper");
    var prev = root.querySelector(".astro-swiper-button-prev, .elementor-swiper-button-prev");
    var next = root.querySelector(".astro-swiper-button-next, .elementor-swiper-button-next");
    var pagination = root.querySelector(".swiper-pagination");

    if (!viewport || !wrapper) {
      return;
    }

    root.dataset.localCarouselReady = "true";

    var originalsByKey = {};
    Array.prototype.slice.call(wrapper.children).forEach(function (slide) {
      if (!slide.classList.contains("swiper-slide")) {
        slide.remove();
        return;
      }

      var key = slide.getAttribute("data-swiper-slide-index") || slide.getAttribute("aria-label") || String(Object.keys(originalsByKey).length);
      var isDuplicate = slide.classList.contains("swiper-slide-duplicate");
      if (!originalsByKey[key] || originalsByKey[key].classList.contains("swiper-slide-duplicate") && !isDuplicate) {
        if (originalsByKey[key] && originalsByKey[key] !== slide) {
          originalsByKey[key].remove();
        }
        originalsByKey[key] = slide;
      } else {
        slide.remove();
      }
    });

    var originals = Object.keys(originalsByKey)
      .sort(function (a, b) { return Number(a) - Number(b); })
      .map(function (key) { return originalsByKey[key]; });

    if (!originals.length) {
      return;
    }

    wrapper.innerHTML = "";

    var cloneCount = originals.length;
    var trackSlides = [];
    var logicalIndex = 0;
    var trackIndex = cloneCount;
    var slideWidth = 0;
    var gap = 10;
    var offset = 0;
    var startX = 0;
    var currentX = 0;
    var dragging = false;
    var suppressClick = false;

    function prepareSlide(slide, index, isClone) {
      slide.classList.remove(
        "swiper-slide-duplicate-active",
        "swiper-slide-duplicate-next",
        "swiper-slide-duplicate-prev",
        "swiper-slide-active",
        "swiper-slide-next",
        "swiper-slide-prev"
      );
      slide.classList.toggle("swiper-slide-duplicate", isClone);
      slide.removeAttribute("aria-hidden");
      slide.removeAttribute("inert");
      slide.setAttribute("data-swiper-slide-index", String(index));
      return slide;
    }

    function rebuildTrack() {
      wrapper.innerHTML = "";
      trackSlides = [];

      originals.slice(-cloneCount).forEach(function (slide, i) {
        var originalIndex = originals.length - cloneCount + i;
        var clone = prepareSlide(slide.cloneNode(true), originalIndex, true);
        wrapper.appendChild(clone);
        trackSlides.push(clone);
      });

      originals.forEach(function (slide, index) {
        var original = prepareSlide(slide, index, false);
        wrapper.appendChild(original);
        trackSlides.push(original);
      });

      originals.slice(0, cloneCount).forEach(function (slide, index) {
        var clone = prepareSlide(slide.cloneNode(true), index, true);
        wrapper.appendChild(clone);
        trackSlides.push(clone);
      });
    }

    function getPerView() {
      if (window.innerWidth <= 767) return 1;
      if (window.innerWidth <= 1024) return 2;
      return 3;
    }

    function getOffset() {
      if (window.innerWidth <= 767) return 50;
      if (window.innerWidth <= 1024) return 60;
      return 0;
    }

    function getGap() {
      return window.innerWidth <= 767 ? 4 : 10;
    }

    function normalizeLogical(value) {
      return (value % originals.length + originals.length) % originals.length;
    }

    function updateClasses() {
      logicalIndex = normalizeLogical(trackIndex - cloneCount);
      trackSlides.forEach(function (slide, slideIndex) {
        slide.classList.toggle("swiper-slide-active", slideIndex === trackIndex);
        slide.classList.toggle("swiper-slide-next", slideIndex === trackIndex + 1);
        slide.classList.toggle("swiper-slide-prev", slideIndex === trackIndex - 1);
      });

      if (pagination) {
        Array.prototype.slice.call(pagination.children).forEach(function (bullet, bulletIndex) {
          bullet.classList.toggle("swiper-pagination-bullet-active", bulletIndex === logicalIndex);
          bullet.setAttribute("aria-current", bulletIndex === logicalIndex ? "true" : "false");
        });
      }
    }

    function setTransform(extra) {
      var translate = -trackIndex * (slideWidth + gap) + (extra || 0);
      wrapper.style.transform = "translate3d(" + translate + "px, 0, 0)";
    }

    function jumpTo(newTrackIndex) {
      trackIndex = newTrackIndex;
      wrapper.style.transitionDuration = "0ms";
      setTransform();
      updateClasses();
    }

    function goToTrack(newTrackIndex, animate) {
      trackIndex = newTrackIndex;
      wrapper.style.transitionDuration = animate === false ? "0ms" : "500ms";
      setTransform();
      updateClasses();
    }

    function settleLoopPosition() {
      if (trackIndex >= cloneCount + originals.length) {
        jumpTo(trackIndex - originals.length);
      } else if (trackIndex < cloneCount) {
        jumpTo(trackIndex + originals.length);
      }
    }

    function layout() {
      var perView = getPerView();
      offset = getOffset();
      gap = getGap();
      slideWidth = Math.max(0, (viewport.clientWidth - offset * 2 - gap * (perView - 1)) / perView);

      trackSlides.forEach(function (slide) {
        slide.style.setProperty("width", slideWidth + "px", "important");
        slide.style.setProperty("margin-right", gap + "px", "important");
      });
      wrapper.style.setProperty("width", trackSlides.length * (slideWidth + gap) + "px", "important");

      if (pagination) {
        pagination.innerHTML = "";
        originals.forEach(function (_slide, bulletIndex) {
          var bullet = document.createElement("span");
          bullet.className = "swiper-pagination-bullet";
          bullet.setAttribute("role", "button");
          bullet.setAttribute("tabindex", "0");
          bullet.setAttribute("aria-label", "Go to slide " + (bulletIndex + 1));
          bullet.addEventListener("click", function () {
            goToTrack(cloneCount + bulletIndex, true);
          });
          bullet.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              goToTrack(cloneCount + bulletIndex, true);
            }
          });
          pagination.appendChild(bullet);
        });
      }

      wrapper.style.transitionDuration = "0ms";
      setTransform();
      updateClasses();
    }

    rebuildTrack();

    wrapper.addEventListener("transitionend", settleLoopPosition);

    if (prev) {
      prev.addEventListener("click", function () {
        goToTrack(trackIndex - 1, true);
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        goToTrack(trackIndex + 1, true);
      });
    }

    viewport.addEventListener("click", function (event) {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);

    viewport.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      dragging = true;
      suppressClick = false;
      startX = event.clientX;
      currentX = startX;
      viewport.classList.add("local-dragging");
      wrapper.style.transitionDuration = "0ms";

      if (viewport.setPointerCapture && event.pointerId !== undefined) {
        viewport.setPointerCapture(event.pointerId);
      }
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      event.preventDefault();
      currentX = event.clientX;
      if (Math.abs(currentX - startX) > 6) suppressClick = true;
      setTransform(currentX - startX);
    });

    function endDrag(event) {
      if (!dragging) return;
      var delta = currentX - startX;
      dragging = false;
      viewport.classList.remove("local-dragging");

      if (viewport.releasePointerCapture && event && event.pointerId !== undefined) {
        try {
          viewport.releasePointerCapture(event.pointerId);
        } catch (_error) {}
      }

      if (Math.abs(delta) > 40) {
        goToTrack(trackIndex + (delta < 0 ? 1 : -1), true);
      } else {
        goToTrack(trackIndex, true);
      }
    }

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("pointerleave", endDrag);

    window.addEventListener("resize", layout);
    layout();
  }

  window.addEventListener("scroll", syncHeader, { passive: true });
  window.addEventListener("resize", syncHeader);
  normalizeFontAwesomeLongArrows(document);
  applyGlobalAppointmentLinks(document);
  applyButtonIconClasses(document);
  initTableOfContents();
  initContactForm();
  syncHeader();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      normalizeFontAwesomeLongArrows(document);
  applyGlobalAppointmentLinks(document);
  applyButtonIconClasses(document);
      initTableOfContents();
      initContactForm();
      initStaffCarousel();
    });
  } else {
    initContactForm();
    initStaffCarousel();
  }
})();





