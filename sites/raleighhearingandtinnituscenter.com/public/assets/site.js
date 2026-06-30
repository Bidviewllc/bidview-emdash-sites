(function () {
  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function toArray(value) {
    return Array.prototype.slice.call(value || []);
  }

  function localContactHref() {
    var parts = window.location.pathname.replace(/\/index\.html$/, '/').split('/').filter(Boolean);
    if (parts.length && parts[parts.length - 1].indexOf('.') !== -1) parts.pop();
    return '../'.repeat(parts.length) + 'contact-us/';
  }

  function normalizeButtonText(text) {
    return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function setupForms() {
    document.addEventListener('submit', function (event) {
      if (event.target && event.target.tagName === 'FORM') event.preventDefault();
    });
  }

  function setupHeader() {
    var header = document.querySelector('.astro-location-header');
    if (!header) return;

    toArray(header.querySelectorAll('.menu-item-has-children > a')).forEach(function (link) {
      if (!link.querySelector('.sub-arrow')) {
        link.insertAdjacentHTML('beforeend', '<span class="sub-arrow"><i class="fas fa-caret-down" aria-hidden="true"></i></span>');
      }
    });

    toArray(header.querySelectorAll('.astro-menu-toggle')).forEach(function (toggle) {
      var widget = toggle.closest('.astro-widget-nav-menu');
      var dropdown = widget && widget.querySelector(':scope > .astro-widget-container > .astro-nav-menu--dropdown.astro-nav-menu__container');
      if (!dropdown) return;
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        dropdown.setAttribute('aria-hidden', open ? 'true' : 'false');
        dropdown.classList.toggle('is-open', !open);
        header.classList.toggle('local-menu-open', !open);
        if (!open) {
          var rect = header.getBoundingClientRect();
          dropdown.style.setProperty('--local-menu-top', rect.bottom + 'px');
          dropdown.style.setProperty('position', 'fixed', 'important');
          dropdown.style.setProperty('top', rect.bottom + 'px', 'important');
          dropdown.style.setProperty('left', '0', 'important');
          dropdown.style.setProperty('width', '100vw', 'important');
          dropdown.style.setProperty('height', 'auto', 'important');
          dropdown.style.setProperty('min-height', '200px', 'important');
          dropdown.style.setProperty('margin', '0', 'important');
          dropdown.style.setProperty('transform', 'none', 'important');
        }
      });
    });

    toArray(header.querySelectorAll('.astro-nav-menu--dropdown .menu-item-has-children > a')).forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (window.innerWidth > 1024) return;
        event.preventDefault();
        var item = link.closest('.menu-item-has-children');
        item.classList.toggle('is-submenu-open');
      });
    });
  }

  function setupAnchorFallbacks() {
    document.querySelectorAll('a[href="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) { event.preventDefault(); });
    });
  }

  function slideshowUrls(element) {
    var raw = element.getAttribute('data-settings');
    if (!raw) return [];
    try {
      var settings = JSON.parse(raw);
      return (settings.background_slideshow_gallery || []).map(function (item) { return item.url; }).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function setupSlideshow(element) {
    var urls = slideshowUrls(element);
    if (!urls.length) return;
    var index = 0;
    var duration = 5000;
    try {
      duration = JSON.parse(element.getAttribute('data-settings')).background_slideshow_slide_duration || duration;
    } catch (error) {}
    element.classList.add('local-bg-slideshow');
    function apply() {
      element.style.setProperty('--local-bg-slide', 'url("' + new URL(urls[index], document.baseURI).href + '")');
      element.style.backgroundImage = 'url("' + new URL(urls[index], document.baseURI).href + '")';
      index = (index + 1) % urls.length;
    }
    apply();
    if (urls.length > 1) window.setInterval(apply, duration);
  }

  function syncMobileHeroContent() {
    var source = document.querySelector('.astro-element-f9d2762 > .e-con-inner');
    var target = document.querySelector('.astro-element-597af1c');
    if (!source || !target) return;
    target.innerHTML = source.innerHTML;
    target.classList.add('local-hero-copy-target');
  }

  function normalizeScheduleButtons() {
    var href = localContactHref();
    toArray(document.querySelectorAll('.astro-widget-button')).forEach(function (widget) {
      var text = widget.querySelector('.astro-button-text');
      if (normalizeButtonText(text && text.textContent) !== 'schedule your appointment') return;
      widget.classList.add('local-schedule-appointment-button');
      var link = widget.querySelector('a.astro-button');
      var icon = widget.querySelector('.astro-button-icon i');
      if (link) {
        var currentHref = link.getAttribute('href') || '';
        if (!currentHref || currentHref === '#') link.setAttribute('href', href);
      }
      if (icon) icon.className = 'fas fa-long-arrow-right';
    });
  }

  function setupTrustBadges() {
    var root = document.querySelector('.astro-element-12030d7');
    if (!root) return;
    var track = root.querySelector('.swiper-wrapper');
    var originalSlides = toArray(root.querySelectorAll('.swiper-slide'));
    if (track && !track.dataset.localLoopReady) {
      originalSlides.slice().reverse().forEach(function (slide) {
        var cloneBefore = slide.cloneNode(true);
        cloneBefore.setAttribute('aria-hidden', 'true');
        track.insertBefore(cloneBefore, track.firstChild);
      });
      originalSlides.forEach(function (slide) {
        var cloneAfter = slide.cloneNode(true);
        cloneAfter.setAttribute('aria-hidden', 'true');
        track.appendChild(cloneAfter);
      });
      track.dataset.localLoopReady = 'true';
    }
    toArray(root.querySelectorAll('img')).forEach(function (img) {
      img.setAttribute('draggable', 'false');
    });
    var slides = toArray(root.querySelectorAll('.swiper-slide'));
    if (!track || slides.length < 2) return;
    var loopCount = originalSlides.length;
    var index = loopCount;
    var timer = null;
    var dragging = false;
    var startX = 0;
    var currentX = 0;
    var slideWidth = 0;
    function perView() {
      if (window.innerWidth <= 767) return 2;
      if (window.innerWidth <= 1024) return 4;
      return 6;
    }
    function move(animate) {
      var visible = perView();
      var viewport = root.querySelector('.e-n-carousel.swiper') || root;
      slideWidth = viewport.getBoundingClientRect().width / visible;
      slides.forEach(function (slide) {
        slide.style.flex = '0 0 ' + slideWidth + 'px';
      });
      track.style.transition = animate === false ? 'none' : 'transform 700ms ease';
      track.style.transform = 'translateX(-' + (index * slideWidth) + 'px)';
    }
    function next() {
      index += 1;
      move(true);
      if (index >= loopCount * 2) {
        window.setTimeout(function () {
          index = loopCount;
          move(false);
        }, 720);
      }
    }
    function prev() {
      if (index <= loopCount) {
        index = loopCount * 2;
        move(false);
      }
      window.requestAnimationFrame(function () {
        index -= 1;
        move(true);
      });
    }
    function startTimer() {
      window.clearInterval(timer);
      timer = window.setInterval(next, 5200);
    }
    function onPointerDown(event) {
      dragging = true;
      startX = event.clientX || (event.touches && event.touches[0] && event.touches[0].clientX) || 0;
      currentX = startX;
      track.style.transition = 'none';
      window.clearInterval(timer);
    }
    function onPointerMove(event) {
      if (!dragging) return;
      currentX = event.clientX || (event.touches && event.touches[0] && event.touches[0].clientX) || currentX;
      var visible = perView();
      var base = -(index * slideWidth);
      track.style.transform = 'translateX(' + (base + currentX - startX) + 'px)';
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      var delta = currentX - startX;
      if (Math.abs(delta) > 35) {
        if (delta < 0) next();
        else prev();
      } else {
        move(true);
      }
      startTimer();
    }
    move(false);
    window.addEventListener('resize', function () { move(false); });
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerUp);
    root.addEventListener('mouseleave', onPointerUp);
    root.addEventListener('dragstart', function (event) { event.preventDefault(); });
    root.addEventListener('touchstart', onPointerDown, { passive: true });
    root.addEventListener('touchmove', onPointerMove, { passive: true });
    root.addEventListener('touchend', onPointerUp);
    startTimer();
  }

  function setupManualCarousel(selector, options) {
    var root = document.querySelector(selector);
    if (!root) return;
    var viewport = root.querySelector('.swiper, .e-n-carousel');
    var track = root.querySelector('.swiper-wrapper');
    var originalSlides = track ? toArray(track.querySelectorAll(':scope > .swiper-slide:not([data-local-clone])')) : [];
    if (!viewport || !track || originalSlides.length < 2) return;

    if (options.cloneLoop !== false && !track.dataset.localCarouselReady) {
      originalSlides.slice().reverse().forEach(function (slide) {
        var cloneBefore = slide.cloneNode(true);
        cloneBefore.dataset.localClone = 'true';
        cloneBefore.setAttribute('aria-hidden', 'true');
        track.insertBefore(cloneBefore, originalSlides[0]);
      });
      originalSlides.forEach(function (slide) {
        var cloneAfter = slide.cloneNode(true);
        cloneAfter.dataset.localClone = 'true';
        cloneAfter.setAttribute('aria-hidden', 'true');
        track.appendChild(cloneAfter);
      });
      track.dataset.localCarouselReady = 'true';
    }

    toArray(root.querySelectorAll('img')).forEach(function (img) {
      img.setAttribute('draggable', 'false');
    });

    var slides = options.cloneLoop === false ? originalSlides : toArray(track.querySelectorAll(':scope > .swiper-slide'));
    var loopCount = originalSlides.length;
    var index = options.cloneLoop === false ? 0 : loopCount;
    var gap = options.gap || 0;
    var slideWidth = 0;
    var dragging = false;
    var startX = 0;
    var currentX = 0;

    function perView() {
      if (window.innerWidth <= 767) return options.mobile || 1;
      if (window.innerWidth <= 1024) return options.tablet || 2;
      return options.desktop || 4;
    }

    function maxIndex() {
      return Math.max(0, loopCount - perView());
    }

    function move(animate) {
      var visible = perView();
      var viewportWidth = viewport.getBoundingClientRect().width;
      slideWidth = (viewportWidth - gap * (visible - 1)) / visible;
      track.style.display = 'flex';
      track.style.gap = gap + 'px';
      track.style.transition = animate === false ? 'none' : 'transform 500ms ease';
      track.style.transform = 'translateX(-' + (index * (slideWidth + gap)) + 'px)';
      slides.forEach(function (slide) {
        slide.style.flex = '0 0 ' + slideWidth + 'px';
        slide.style.width = slideWidth + 'px';
      });
    }

    function settleLoop() {
      if (options.cloneLoop === false) return;
      if (index >= loopCount * 2) {
        window.setTimeout(function () {
          index = loopCount;
          move(false);
        }, 520);
      } else if (index < loopCount) {
        window.setTimeout(function () {
          index = loopCount * 2 - 1;
          move(false);
        }, 520);
      }
    }

    function next() {
      if (options.cloneLoop === false) {
        index = index >= maxIndex() ? 0 : index + 1;
        move(index === 0 ? false : true);
        return;
      }
      index += 1;
      move(true);
      settleLoop();
    }

    function prev() {
      if (options.cloneLoop === false) {
        index = index <= 0 ? maxIndex() : index - 1;
        move(index === maxIndex() ? false : true);
        return;
      }
      index -= 1;
      move(true);
      settleLoop();
    }

    function onPointerDown(event) {
      event.preventDefault();
      dragging = true;
      startX = event.clientX || (event.touches && event.touches[0] && event.touches[0].clientX) || 0;
      currentX = startX;
      track.style.transition = 'none';
      if (event.pointerId && root.setPointerCapture) root.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      if (!dragging) return;
      currentX = event.clientX || (event.touches && event.touches[0] && event.touches[0].clientX) || currentX;
      var base = -(index * (slideWidth + gap));
      track.style.transform = 'translateX(' + (base + currentX - startX) + 'px)';
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      var delta = currentX - startX;
      if (Math.abs(delta) > 35) {
        if (delta < 0) next();
        else prev();
      } else {
        move(true);
      }
    }

    function bindNavButton(button, callback) {
      if (button.dataset.localCarouselNavReady === 'true') return;
      button.dataset.localCarouselNavReady = 'true';
      ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend'].forEach(function (eventName) {
        button.addEventListener(eventName, function (event) {
          event.stopPropagation();
        }, { passive: true });
      });
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        callback();
      });
    }

    toArray(root.querySelectorAll('.astro-swiper-button-next')).forEach(function (button) {
      bindNavButton(button, next);
    });
    toArray(root.querySelectorAll('.astro-swiper-button-prev')).forEach(function (button) {
      bindNavButton(button, prev);
    });

    move(false);
    window.addEventListener('resize', function () { move(false); });
    root.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    root.addEventListener('mouseleave', onPointerUp);
    root.addEventListener('dragstart', function (event) { event.preventDefault(); });
    root.addEventListener('touchstart', onPointerDown, { passive: true });
    root.addEventListener('touchmove', onPointerMove, { passive: true });
    root.addEventListener('touchend', onPointerUp);
  }

  function setupAccordions() {
    toArray(document.querySelectorAll('.astro-element-f239190, .astro-element-cf54306, .astro-element-c7179b0')).forEach(function (widget) {
      var detailsItems = toArray(widget.querySelectorAll('details.e-n-accordion-item'));
      var shouldStartCollapsed = false;
      var requiresOpenItem = widget.classList.contains('astro-element-c7179b0');
      if (!detailsItems.length) return;
      detailsItems.forEach(function (details, index) {
        var summary = details.querySelector('summary');
        var panel = summary && summary.nextElementSibling;
        if (!summary || !panel) return;
        details.classList.add('local-smooth-accordion-item');
        panel.classList.add('local-accordion-panel');
        if (!shouldStartCollapsed && (details.open || index === 0)) {
          details.open = true;
          summary.setAttribute('aria-expanded', 'true');
          panel.style.maxHeight = 'none';
        } else {
          details.open = false;
          summary.setAttribute('aria-expanded', 'false');
          panel.style.maxHeight = '0px';
        }
        summary.addEventListener('click', function (event) {
          event.preventDefault();
          if (details.open) {
            if (requiresOpenItem) return;
            closeAccordionItem(details);
            return;
          }
          detailsItems.forEach(function (other) {
            if (other !== details) closeAccordionItem(other);
          });
          openAccordionItem(details);
        });
      });
    });
  }

  function getAccordionPanel(details) {
    var summary = details.querySelector('summary');
    return summary && summary.nextElementSibling;
  }

  function closeAccordionItem(details) {
    var summary = details.querySelector('summary');
    var panel = getAccordionPanel(details);
    if (!summary || !panel || !details.open) return;
    summary.setAttribute('aria-expanded', 'false');
    if (getComputedStyle(panel).maxHeight === 'none') {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
    window.requestAnimationFrame(function () {
      panel.style.maxHeight = '0px';
    });
    window.setTimeout(function () {
      details.open = false;
    }, 420);
  }

  function openAccordionItem(details) {
    var summary = details.querySelector('summary');
    var panel = getAccordionPanel(details);
    if (!summary || !panel) return;
    details.open = true;
    summary.setAttribute('aria-expanded', 'true');
    panel.style.maxHeight = '0px';
    window.requestAnimationFrame(function () {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    });
    window.setTimeout(function () {
      if (details.open) panel.style.maxHeight = 'none';
    }, 420);
  }

  function setupInternalAccordions() {
    if (document.body.classList.contains('home')) return;
    toArray(document.querySelectorAll('.astro-widget-n-accordion')).forEach(function (widget) {
      if (/recent news/i.test(widget.textContent || '')) return;
      var detailsItems = toArray(widget.querySelectorAll('details.e-n-accordion-item'));
      if (!detailsItems.length) return;
      detailsItems.forEach(function (details) {
        var summary = details.querySelector('summary');
        var panel = getAccordionPanel(details);
        if (!summary || !panel) return;
        details.classList.add('local-smooth-accordion-item');
        panel.classList.add('local-accordion-panel');
        details.open = false;
        summary.setAttribute('aria-expanded', 'false');
        panel.style.maxHeight = '0px';
        summary.addEventListener('click', function (event) {
          event.preventDefault();
          if (details.open) {
            closeAccordionItem(details);
            return;
          }
          detailsItems.forEach(function (other) {
            if (other !== details) closeAccordionItem(other);
          });
          openAccordionItem(details);
        });
      });
    });
  }

  function slugifyHeading(text) {
    return (text || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  }

  function isVisibleElement(element) {
    var rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function shouldSkipTOCHeading(heading) {
    if (!isVisibleElement(heading)) return true;
    if (heading.closest('.astro-location-header, .astro-location-footer, .astro-widget-table-of-contents')) return true;
    if (heading.closest('.astro-widget-n-accordion')) return true;
    if (/recent news|articles|book an appointment|schedule your appointment/i.test(heading.textContent || '')) return true;
    return false;
  }

  function getTOCHeadings(toc) {
    var layout = toc.closest('.astro-element-b7c4434, .astro-element-36e2d100, main, body') || document.body;
    var headings = toArray(layout.querySelectorAll('h2, h3, h4, h5, h6')).filter(function (heading) {
      return !shouldSkipTOCHeading(heading);
    });
    if (headings.length) return headings;
    return toArray(document.querySelectorAll('h2, h3, h4, h5, h6')).filter(function (heading) {
      return !shouldSkipTOCHeading(heading);
    });
  }

  function setupInternalTOC() {
    if (document.body.classList.contains('home')) return;
    var usedIds = {};
    toArray(document.querySelectorAll('.astro-widget-table-of-contents')).forEach(function (toc) {
      var body = toc.querySelector('.astro-toc__body');
      var header = toc.querySelector('.astro-toc__header');
      if (!body || !header) return;

      var headings = getTOCHeadings(toc);
      body.innerHTML = '';
      body.classList.add('local-toc-body');
      toc.classList.add('local-toc-ready', 'local-toc-collapsed');

      if (!headings.length) {
        body.innerHTML = '<p class="local-toc-empty">No headings were found on this page.</p>';
      } else {
        var list = document.createElement('ol');
        list.className = 'local-toc-list';
        headings.forEach(function (heading) {
          var baseId = heading.id || slugifyHeading(heading.textContent);
          var id = baseId;
          var count = usedIds[id] || 0;
          while (document.getElementById(id) && document.getElementById(id) !== heading) {
            count += 1;
            id = baseId + '-' + count;
          }
          usedIds[baseId] = count;
          heading.id = id;

          var item = document.createElement('li');
          item.className = 'local-toc-item local-toc-item-' + heading.tagName.toLowerCase();
          var link = document.createElement('a');
          link.href = '#' + id;
          link.textContent = heading.textContent.replace(/\s+/g, ' ').trim();
          item.appendChild(link);
          list.appendChild(item);
        });
        body.appendChild(list);
      }

      function setOpen(open) {
        toc.classList.toggle('local-toc-collapsed', !open);
        toc.classList.toggle('local-toc-open', open);
        toArray(toc.querySelectorAll('.astro-toc__toggle-button, .astro-toc__header')).forEach(function (button) {
          button.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }

      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', 'false');
      header.addEventListener('click', function (event) {
        event.preventDefault();
        setOpen(toc.classList.contains('local-toc-collapsed'));
      });
      header.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setOpen(toc.classList.contains('local-toc-collapsed'));
      });
      setOpen(false);
    });
  }

  function setupLocationSourceSections() {
    var sourceId = 'ef200c0';
    var aliases = ['ef200c0', 'a3b8bf1'];
    aliases.forEach(function (id) {
      toArray(document.querySelectorAll('.astro-element-' + id)).forEach(function (section) {
        section.classList.add('local-location-section');
        section.setAttribute('data-local-template-source', sourceId);
        if (id !== sourceId) section.setAttribute('data-local-template-instance', id);
      });
    });
  }

  function restoreStaffCardBackgrounds() {
    toArray(document.querySelectorAll('.astro-element-396bb61 style[id^="loop-dynamic"]')).forEach(function (style) {
      var text = style.textContent || '';
      var match = text.match(/\.e-loop-item-(\d+)[\s\S]*?background-image:\s*url\(["']?([^"')]+)["']?\)/);
      if (!match) return;
      var itemClass = '.e-loop-item-' + match[1];
      var url = match[2];
      toArray(document.querySelectorAll('.astro-element-396bb61 ' + itemClass + ' .astro-element-f22df11')).forEach(function (imageBox) {
        imageBox.style.setProperty('background-image', 'url("' + url + '")', 'important');
        imageBox.style.setProperty('background-position', 'top center');
        imageBox.style.setProperty('background-repeat', 'no-repeat');
        imageBox.style.setProperty('background-size', 'cover');
      });
    });
  }

  function restoreElfsightWidget() {
    var widget = document.querySelector('.astro-element-2b55c4a .astro-widget-container');
    if (!widget || widget.querySelector('script[src*="elfsightcdn.com/platform.js"]')) return;
    var script = document.createElement('script');
    script.src = 'https://elfsightcdn.com/platform.js';
    script.async = true;
    widget.insertBefore(script, widget.firstChild);
  }

  ready(function () {
    setupForms();
    setupHeader();
    setupAnchorFallbacks();
    syncMobileHeroContent();
    normalizeScheduleButtons();
    document.querySelectorAll('[data-settings*="background_slideshow_gallery"]').forEach(setupSlideshow);
    setupTrustBadges();
    setupManualCarousel('.astro-element-396bb61', { desktop: 4, tablet: 3, mobile: 1, gap: 10 });
    restoreStaffCardBackgrounds();
    setupManualCarousel('.astro-element-5029d79', { desktop: 2, tablet: 2, mobile: 1, gap: 30, cloneLoop: false });
    setupAccordions();
    setupInternalAccordions();
    setupInternalTOC();
    setupLocationSourceSections();
    restoreElfsightWidget();
  });
})();
