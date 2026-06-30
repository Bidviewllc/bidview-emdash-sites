(function () {
  function updateHeaderState() {
    var header = document.querySelector('.astro-element-location-header');
    if (!header) return;
    header.classList.toggle('local-header-scrolled', window.scrollY > 8);
  }

  function normalizePath(pathname) {
    pathname = pathname || '/';
    pathname = pathname.replace(/\/index\.html$/i, '/');
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
    return pathname || '/';
  }

  function updateHeaderActiveNav() {
    var nav = document.querySelector('.astro-element-location-header .astro-element-element-19fa3694');
    if (!nav) return;
    var currentPath = normalizePath(window.location.pathname);
    nav.querySelectorAll('.local-current-page, .astro-element-item-active').forEach(function (link) {
      link.classList.remove('local-current-page', 'astro-element-item-active');
    });
    nav.querySelectorAll('.current-menu-item, .current-menu-ancestor, .current_page_item, .current_page_parent, .current_page_ancestor').forEach(function (item) {
      item.classList.remove('current-menu-item', 'current-menu-ancestor', 'current_page_item', 'current_page_parent', 'current_page_ancestor');
    });
    nav.querySelectorAll('.astro-element-nav-menu--main a[href]').forEach(function (link) {
      var rawHref = link.getAttribute('href') || '';
      if (!rawHref || rawHref.charAt(0) === '#') return;
      var linkPath;
      try {
        linkPath = normalizePath(new URL(rawHref, window.location.href).pathname);
      } catch (error) {
        return;
      }
      var isExact = linkPath === currentPath;
      var isAncestor = linkPath !== '/' && currentPath.indexOf(linkPath + '/') === 0;
      if (!isExact && !isAncestor) return;
      link.classList.add('local-current-page', 'astro-element-item-active');
      var item = link.closest('.menu-item');
      if (item) item.classList.add(isExact ? 'current-menu-item' : 'current-menu-ancestor');
      var parent = item && item.parentElement && item.parentElement.closest('.menu-item');
      while (parent) {
        parent.classList.add('current-menu-ancestor');
        parent = parent.parentElement && parent.parentElement.closest('.menu-item');
      }
    });
    applyCustomHearingProtectionActiveNav(nav, currentPath);
  }

  function setHeaderItemActive(item, active) {
    if (!item) return;
    var link = item.querySelector(':scope > a');
    item.classList.toggle('current-menu-item', active);
    item.classList.toggle('current-menu-ancestor', active);
    if (link) link.classList.toggle('local-current-page', active);
    if (link) link.classList.toggle('astro-element-item-active', active);
  }

  function clearHeaderItemActive(item) {
    if (!item) return;
    item.classList.remove('current-menu-item', 'current-menu-ancestor', 'current_page_item', 'current_page_parent', 'current_page_ancestor');
    item.querySelectorAll('.local-current-page, .astro-element-item-active').forEach(function (link) {
      link.classList.remove('local-current-page', 'astro-element-item-active');
    });
    item.querySelectorAll('.current-menu-item, .current-menu-ancestor, .current_page_item, .current_page_parent, .current_page_ancestor').forEach(function (child) {
      child.classList.remove('current-menu-item', 'current-menu-ancestor', 'current_page_item', 'current_page_parent', 'current_page_ancestor');
    });
  }

  function consumeCustomHearingProtectionNavSource() {
    if (!window.sessionStorage) return '';
    var key = 'local-active-nav-custom-hearing-protection';
    var value = sessionStorage.getItem(key) || '';
    sessionStorage.removeItem(key);
    return value;
  }

  function setCustomHearingProtectionNavSource(source) {
    if (!window.sessionStorage) return;
    sessionStorage.setItem('local-active-nav-custom-hearing-protection', source);
  }

  function applyCustomHearingProtectionActiveNav(nav, currentPath) {
    if (currentPath !== '/custom-hearing-protection') return;
    var source = consumeCustomHearingProtectionNavSource() || 'services';
    var servicesItems = nav.querySelectorAll('.menu-item-798');
    var hearingItems = nav.querySelectorAll('.menu-item-1317');
    servicesItems.forEach(clearHeaderItemActive);
    hearingItems.forEach(clearHeaderItemActive);
    if (source === 'hearing-aids') {
      hearingItems.forEach(function (item) { setHeaderItemActive(item, true); });
    } else {
      servicesItems.forEach(function (item) { setHeaderItemActive(item, true); });
    }
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getAboutPath() {
    var aboutLink = document.querySelector('.astro-element-location-header .astro-element-element-19fa3694 .astro-element-nav-menu--main > ul > li > a[href]');
    var links = Array.prototype.slice.call(document.querySelectorAll('.astro-element-location-header .astro-element-element-19fa3694 .astro-element-nav-menu--main > ul > li > a[href]'));
    var match = links.find(function (link) {
      return normalizeText(link.childNodes[0] && link.childNodes[0].textContent || link.textContent) === 'about';
    });
    try {
      return normalizePath(new URL((match || aboutLink || {}).getAttribute ? (match || aboutLink).getAttribute('href') : '/about/', window.location.href).pathname);
    } catch (error) {
      return '/about';
    }
  }

  function scrollToAboutSection(selector) {
    var target = document.querySelector(selector);
    if (!target) return false;
    var header = document.querySelector('.astro-element-location-header');
    var offset = (header ? header.getBoundingClientRect().height : 0) + 20;
    var top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '/about/');
    }
    return true;
  }

  function scrollToTeamSection() {
    return scrollToAboutSection('.astro-element-element-5a5edc3');
  }

  function scrollToLocationSection() {
    return scrollToAboutSection('.astro-element-element-ca854f9');
  }

  function handlePendingAboutScroll() {
    if (!window.sessionStorage) return;
    var pending = sessionStorage.getItem('local-scroll-about-target');
    if (!pending) return;
    sessionStorage.removeItem('local-scroll-about-target');
    window.setTimeout(function () {
      if (pending === 'team') scrollToTeamSection();
      if (pending === 'location') scrollToLocationSection();
    }, 180);
  }

  function isOurTeamLink(link) {
    if (!link) return false;
    var item = link.closest && link.closest('.menu-item-1086');
    return Boolean(item) && normalizeText(link.childNodes[0] && link.childNodes[0].textContent || link.textContent).indexOf('our team') === 0;
  }

  function isLocationLink(link) {
    if (!link) return false;
    var item = link.closest && link.closest('.menu-item-1087');
    return Boolean(item) && normalizeText(link.childNodes[0] && link.childNodes[0].textContent || link.textContent).indexOf('location') === 0;
  }

  function closestToggle(target) {
    return target && target.closest && target.closest('.astro-element-menu-toggle, [aria-controls*="menu"]');
  }

  function updateMobileMenuPosition() {
    var nav = document.querySelector('.astro-element-element-19fa3694');
    if (!nav) return;
    nav.style.setProperty('--local-nav-left', nav.getBoundingClientRect().left + 'px');
  }

  function updateDesktopSubmenus() {
    document.querySelectorAll('.astro-element-element-19fa3694 .menu-item-has-children > .sub-menu').forEach(function (submenu) {
      if (window.innerWidth > 1024) {
        submenu.style.setProperty('width', 'max-content', 'important');
        submenu.style.setProperty('min-width', 'max-content', 'important');
        submenu.style.setProperty('max-width', 'none', 'important');
        submenu.style.setProperty('margin', '0', 'important');
        submenu.style.setProperty('margin-top', '0', 'important');
        if (submenu.parentElement && submenu.parentElement.parentElement && submenu.parentElement.parentElement.classList.contains('sub-menu')) {
          submenu.style.setProperty('top', '0', 'important');
        }
      } else if (!submenu.parentElement || !submenu.parentElement.classList.contains('local-submenu-open')) {
        submenu.removeAttribute('style');
      }
    });
  }

  function updateLocationStaffCarousel() {
    document.querySelectorAll('.astro-element-element-2724809 .swiper-wrapper').forEach(function (wrapper) {
      var slides = Array.prototype.slice.call(wrapper.children).filter(function (child) {
        return child.classList && child.classList.contains('e-loop-item') && child.classList.contains('audiologist');
      });
      if (!slides.length) return;
      if (window.innerWidth <= 767) {
        wrapper.style.setProperty('display', 'flex', 'important');
        wrapper.style.setProperty('flex-direction', 'column', 'important');
        wrapper.style.setProperty('gap', '20px', 'important');
        wrapper.style.setProperty('width', '100%', 'important');
        wrapper.style.setProperty('max-width', '100%', 'important');
        wrapper.style.setProperty('height', 'auto', 'important');
        wrapper.style.setProperty('overflow', 'visible', 'important');
        wrapper.style.setProperty('transform', 'none', 'important');
        if (wrapper.parentElement) {
          wrapper.parentElement.style.setProperty('height', 'auto', 'important');
          wrapper.parentElement.style.setProperty('overflow', 'visible', 'important');
        }
        slides.forEach(function (slide) {
          slide.style.setProperty('flex', '0 0 auto', 'important');
          slide.style.setProperty('width', '100%', 'important');
          slide.style.setProperty('max-width', '100%', 'important');
          slide.style.setProperty('height', 'auto', 'important');
        });
      } else if (window.innerWidth > 1024) {
        var slideWidth = slides.length > 1 ? 'calc((100% - 10px) / 2)' : '100%';
        wrapper.style.setProperty('display', 'flex', 'important');
        wrapper.style.setProperty('flex-direction', 'row', 'important');
        wrapper.style.setProperty('gap', '10px', 'important');
        wrapper.style.setProperty('width', '100%', 'important');
        wrapper.style.setProperty('max-width', '100%', 'important');
        wrapper.style.setProperty('height', 'auto', 'important');
        wrapper.style.setProperty('overflow', 'visible', 'important');
        wrapper.style.setProperty('transform', 'none', 'important');
        if (wrapper.parentElement) {
          wrapper.parentElement.style.setProperty('height', 'auto', 'important');
          wrapper.parentElement.style.setProperty('overflow', 'visible', 'important');
        }
        slides.forEach(function (slide) {
          slide.style.setProperty('flex', '0 0 ' + slideWidth, 'important');
          slide.style.setProperty('width', slideWidth, 'important');
          slide.style.setProperty('max-width', slideWidth, 'important');
          slide.style.setProperty('height', 'auto', 'important');
        });
      } else {
        wrapper.style.removeProperty('display');
        wrapper.style.removeProperty('flex-direction');
        wrapper.style.removeProperty('gap');
        wrapper.style.removeProperty('width');
        wrapper.style.removeProperty('max-width');
        wrapper.style.removeProperty('height');
        wrapper.style.removeProperty('overflow');
        wrapper.style.removeProperty('transform');
        if (wrapper.parentElement) {
          wrapper.parentElement.style.removeProperty('height');
          wrapper.parentElement.style.removeProperty('overflow');
        }
        slides.forEach(function (slide) {
          slide.style.removeProperty('flex');
          slide.style.removeProperty('width');
          slide.style.removeProperty('max-width');
          slide.style.removeProperty('height');
        });
      }
    });
  }

  updateHeaderState();
  updateHeaderActiveNav();
  handlePendingAboutScroll();
  updateMobileMenuPosition();
  updateDesktopSubmenus();
  updateLocationStaffCarousel();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', function () {
    updateMobileMenuPosition();
    updateDesktopSubmenus();
    updateLocationStaffCarousel();
  }, { passive: true });

  document.addEventListener('mouseover', function (event) {
    if (window.innerWidth <= 1024) return;
    var item = event.target.closest && event.target.closest('.astro-element-element-19fa3694 .menu-item-has-children');
    if (item) updateDesktopSubmenus();
  });

  function getCarouselGap(track) {
    var gap = window.getComputedStyle(track).columnGap || window.getComputedStyle(track).gap || '0';
    return parseFloat(gap) || 0;
  }

  function moveLogoCarousel(root, direction) {
    var track = root && root.querySelector('.astro-element-image-carousel');
    if (!track || track.getAttribute('data-local-moving') === 'true') return;
    var slide = track.querySelector('.swiper-slide');
    var step = slide ? slide.getBoundingClientRect().width + getCarouselGap(track) : 0;
    if (!step) return;
    track.setAttribute('data-local-moving', 'true');
    track.style.transition = 'transform 500ms ease';
    if (direction < 0) {
      var last = track.lastElementChild;
      if (last) track.insertBefore(last, track.firstElementChild);
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + (-step) + 'px)';
      track.offsetHeight;
      track.style.transition = 'transform 500ms ease';
      track.style.transform = 'translateX(0px)';
      window.setTimeout(function () {
        track.style.transition = 'none';
        track.style.transform = 'translateX(0px)';
        track.setAttribute('data-local-moving', 'false');
      }, 520);
      return;
    }
    track.style.transform = 'translateX(' + (-step) + 'px)';
    window.setTimeout(function () {
      var first = track.firstElementChild;
      if (first) track.appendChild(first);
      track.style.transition = 'none';
      track.style.transform = 'translateX(0px)';
      track.setAttribute('data-local-moving', 'false');
    }, 520);
  }

  function initLogoCarousel() {
    document.querySelectorAll('.astro-element-element-810fc70').forEach(function (root) {
      var track = root.querySelector('.astro-element-image-carousel');
      if (!track || track.getAttribute('data-local-carousel-ready') === 'true') return;
      var slides = Array.prototype.slice.call(track.querySelectorAll(':scope > .swiper-slide'));
      if (!slides.length) return;
      track.setAttribute('data-local-original-count', String(slides.length));
      track.setAttribute('data-local-moving', 'false');
      track.setAttribute('data-local-carousel-ready', 'true');
      var timer = window.setInterval(function () {
        moveLogoCarousel(root, 1);
      }, 3000);
      root.addEventListener('mouseenter', function () { window.clearInterval(timer); });
      root.addEventListener('mouseleave', function () {
        timer = window.setInterval(function () { moveLogoCarousel(root, 1); }, 3000);
      });
    });
  }

  function slugifyHeading(text, index) {
    var slug = (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return 'local-toc-heading-' + (slug || 'section') + '-' + index;
  }

  function buildTocList(headings, startIndex) {
    var list = document.createElement('ol');
    list.className = 'astro-element-toc__list-wrapper';
    var i = startIndex || 0;
    while (i < headings.length) {
      var item = headings[i];
      var li = document.createElement('li');
      li.className = 'astro-element-toc__list-item local-toc-level-' + item.level;
      var wrapper = document.createElement('div');
      wrapper.className = 'astro-element-toc__list-item-text-wrapper';
      var link = document.createElement('a');
      link.className = 'astro-element-toc__list-item-text local-toc-link-level-' + item.level + (item.level === 2 ? ' astro-element-toc__top-level' : '');
      link.href = '#' + item.id;
      link.textContent = item.text;
      wrapper.appendChild(link);
      li.appendChild(wrapper);

      var children = [];
      var j = i + 1;
      while (j < headings.length && headings[j].level > item.level) {
        children.push(headings[j]);
        j += 1;
      }
      if (children.length) li.appendChild(buildTocList(children, 0));
      list.appendChild(li);
      i = j;
    }
    return list;
  }

  function initLocalTableOfContents() {
    document.querySelectorAll('.astro-element-widget-table-of-contents').forEach(function (toc) {
      if (toc.getAttribute('data-local-toc-ready') === 'true') return;
      var contentSelector = '#cccc';
      try {
        var settings = JSON.parse(toc.getAttribute('data-settings') || '{}');
        if (settings.container) contentSelector = settings.container;
      } catch (error) {}
      var content = document.querySelector(contentSelector);
      if (!content) {
        var row = toc.closest('.e-con-inner');
        if (row) {
          var candidates = Array.prototype.slice.call(row.children).filter(function (candidate) {
            return candidate !== toc && !candidate.contains(toc);
          }).map(function (candidate) {
            return {
              node: candidate,
              count: candidate.querySelectorAll('h2, h3, h4, h5, h6').length
            };
          }).filter(function (candidate) {
            return candidate.count > 0;
          }).sort(function (a, b) {
            return b.count - a.count;
          });
          if (candidates.length) content = candidates[0].node;
        }
      }
      if (!content) content = document.querySelector('main, .astro-element-location-single, article') || document.body;
      var body = toc.querySelector('.astro-element-toc__body');
      if (!content || !body) return;
      var headings = Array.prototype.slice.call(content.querySelectorAll('h2, h3, h4, h5, h6')).filter(function (heading) {
        return heading.textContent.trim() && !heading.closest('.astro-element-widget-table-of-contents');
      }).map(function (heading, index) {
        if (!heading.id) heading.id = slugifyHeading(heading.textContent, index);
        return {
          id: heading.id,
          text: heading.textContent.trim(),
          level: parseInt(heading.tagName.slice(1), 10)
        };
      });
      body.innerHTML = '';
      if (!headings.length) {
        body.textContent = 'No headings were found on this page.';
        return;
      }
      body.appendChild(buildTocList(headings, 0));
      body.style.display = '';
      toc.setAttribute('data-local-toc-ready', 'true');
      var header = toc.querySelector('.astro-element-toc__header');
      if (header) {
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'false');
      }
      setLocalTocExpanded(toc, false, true);
    });
  }

  function setLocalTocExpanded(toc, expanded, immediate) {
    if (!toc) return;
    var body = toc.querySelector('.astro-element-toc__body');
    var header = toc.querySelector('.astro-element-toc__header');
    var expandButton = toc.querySelector('.astro-element-toc__toggle-button--expand');
    var collapseButton = toc.querySelector('.astro-element-toc__toggle-button--collapse');
    if (!body) return;
    toc.classList.toggle('local-toc-expanded', expanded);
    toc.classList.toggle('local-toc-collapsed', !expanded);
    if (header) header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (expandButton) expandButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (collapseButton) collapseButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (immediate) body.style.transition = 'none';
    body.style.maxHeight = expanded ? body.scrollHeight + 'px' : '0px';
    if (immediate) {
      body.offsetHeight;
      body.style.transition = '';
    }
  }

  function toggleLocalToc(toc) {
    setLocalTocExpanded(toc, !toc.classList.contains('local-toc-expanded'), false);
  }

  function getTocScrollOffset() {
    var width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width <= 767) return 160;
    if (width <= 1024) return 180;
    if (width <= 1366) return 190;
    return 200;
  }

  function scrollToTocTarget(link) {
    if (!link) return false;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) !== '#') return false;
    var id = decodeURIComponent(href.slice(1));
    var target = document.getElementById(id);
    if (!target) return false;
    var top = target.getBoundingClientRect().top + window.scrollY - getTocScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    return true;
  }

  function initGalleryLightbox() {
    var gallerySelector = [
      '.astro-element-element-9685a4e a[href]',
      '.astro-element-element-8172c8e a[href]',
      '.astro-element-element-86dd99a a[href]',
      '.astro-element-element-a7ea92c a[href]',
      '.astro-element-element-2724809 a[href]'
    ].join(', ');
    var anchors = Array.prototype.slice.call(document.querySelectorAll(gallerySelector)).filter(function (anchor) {
      var href = anchor.getAttribute('href') || '';
      return anchor.getAttribute('data-astro-element-open-lightbox') === 'yes' || /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i.test(href);
    });
    if (!anchors.length) return;

    var overlay = document.querySelector('.local-gallery-lightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'local-gallery-lightbox';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Image preview');
      overlay.innerHTML = '<button type="button" class="local-gallery-lightbox-close" aria-label="Close image">&times;</button><button type="button" class="local-gallery-lightbox-prev" aria-label="Previous image">&#8249;</button><img alt=""><button type="button" class="local-gallery-lightbox-next" aria-label="Next image">&#8250;</button>';
      document.body.appendChild(overlay);
    }

    var image = overlay.querySelector('img');
    var closeButton = overlay.querySelector('.local-gallery-lightbox-close');
    var prevButton = overlay.querySelector('.local-gallery-lightbox-prev');
    var nextButton = overlay.querySelector('.local-gallery-lightbox-next');
    var currentIndex = 0;

    function updateImage(index) {
      currentIndex = (index + anchors.length) % anchors.length;
      var anchor = anchors[currentIndex];
      var thumb = anchor.querySelector('img');
      image.src = anchor.href;
      image.alt = (thumb && thumb.getAttribute('alt')) || anchor.getAttribute('data-astro-element-lightbox-title') || '';
      if (prevButton && nextButton) {
        var showControls = anchors.length > 1;
        prevButton.style.display = showControls ? '' : 'none';
        nextButton.style.display = showControls ? '' : 'none';
      }
    }

    function openLightbox(index) {
      updateImage(index);
      overlay.classList.add('local-active');
      document.documentElement.classList.add('local-lightbox-open');
      if (closeButton) closeButton.focus();
    }

    function closeLightbox() {
      overlay.classList.remove('local-active');
      document.documentElement.classList.remove('local-lightbox-open');
      image.removeAttribute('src');
    }

    anchors.forEach(function (anchor, index) {
      if (anchor.getAttribute('data-local-lightbox-ready') === 'true') return;
      anchor.setAttribute('data-local-lightbox-ready', 'true');
      anchor.setAttribute('role', 'button');
      anchor.setAttribute('aria-label', 'Open image preview');
      anchor.addEventListener('click', function (event) {
        event.preventDefault();
        openLightbox(index);
      });
    });

    if (closeButton && closeButton.getAttribute('data-local-lightbox-ready') !== 'true') {
      closeButton.setAttribute('data-local-lightbox-ready', 'true');
      closeButton.addEventListener('click', closeLightbox);
    }
    if (prevButton && prevButton.getAttribute('data-local-lightbox-ready') !== 'true') {
      prevButton.setAttribute('data-local-lightbox-ready', 'true');
      prevButton.addEventListener('click', function () { updateImage(currentIndex - 1); });
    }
    if (nextButton && nextButton.getAttribute('data-local-lightbox-ready') !== 'true') {
      nextButton.setAttribute('data-local-lightbox-ready', 'true');
      nextButton.addEventListener('click', function () { updateImage(currentIndex + 1); });
    }
    if (overlay.getAttribute('data-local-lightbox-ready') !== 'true') {
      overlay.setAttribute('data-local-lightbox-ready', 'true');
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeLightbox();
      });
      document.addEventListener('keydown', function (event) {
        if (!overlay.classList.contains('local-active')) return;
        if (event.key === 'Escape') closeLightbox();
        if (event.key === 'ArrowLeft') updateImage(currentIndex - 1);
        if (event.key === 'ArrowRight') updateImage(currentIndex + 1);
      });
    }
  }

  document.addEventListener('click', function (event) {
    var tocHeader = event.target.closest && event.target.closest('.astro-element-widget-table-of-contents .astro-element-toc__header');
    if (tocHeader) {
      event.preventDefault();
      toggleLocalToc(tocHeader.closest('.astro-element-widget-table-of-contents'));
      return;
    }

    var tocLink = event.target.closest && event.target.closest('.astro-element-widget-table-of-contents .astro-element-toc__list-item-text[href^="#"]');
    if (tocLink) {
      event.preventDefault();
      scrollToTocTarget(tocLink);
      return;
    }

    var toggle = closestToggle(event.target);
    if (toggle) {
      event.preventDefault();
      updateMobileMenuPosition();
      toggle.classList.toggle('local-active');
      document.documentElement.classList.toggle('local-menu-open');
      return;
    }

    var ourTeamLink = event.target.closest && event.target.closest('.astro-element-location-header .astro-element-element-19fa3694 a');
    var hearingAidsLink = ourTeamLink && ourTeamLink.closest && ourTeamLink.closest('.menu-item-1317 > a');
    if (hearingAidsLink && normalizeText(hearingAidsLink.childNodes[0] && hearingAidsLink.childNodes[0].textContent || hearingAidsLink.textContent).indexOf('hearing aids') === 0) {
      event.preventDefault();
      setCustomHearingProtectionNavSource('hearing-aids');
      window.location.assign('/custom-hearing-protection/');
      return;
    }

    var customHearingProtectionLink = ourTeamLink && ourTeamLink.closest && ourTeamLink.closest('.menu-item-1864 > a');
    if (customHearingProtectionLink) {
      try {
        if (normalizePath(new URL(customHearingProtectionLink.getAttribute('href') || '', window.location.href).pathname) === '/custom-hearing-protection') {
          setCustomHearingProtectionNavSource('services');
        }
      } catch (error) {}
    }

    if (isOurTeamLink(ourTeamLink)) {
      event.preventDefault();
      var aboutPath = getAboutPath();
      if (normalizePath(window.location.pathname) === aboutPath) {
        scrollToTeamSection();
      } else {
        if (window.sessionStorage) sessionStorage.setItem('local-scroll-about-target', 'team');
        window.location.assign('/about/');
      }
      return;
    }

    if (isLocationLink(ourTeamLink)) {
      event.preventDefault();
      var locationAboutPath = getAboutPath();
      if (normalizePath(window.location.pathname) === locationAboutPath) {
        scrollToLocationSection();
      } else {
        if (window.sessionStorage) sessionStorage.setItem('local-scroll-about-target', 'location');
        window.location.assign('/about/');
      }
      return;
    }

    var parent = event.target.closest && event.target.closest('.astro-element-element-19fa3694 .menu-item-has-children > a, .astro-element-item.has-submenu');
    if (parent && window.innerWidth <= 1024) {
      event.preventDefault();
      var item = parent.parentElement;
      if (item) {
        Array.prototype.forEach.call(item.parentElement ? item.parentElement.children : [], function (sibling) {
          if (sibling !== item) sibling.classList.remove('local-submenu-open');
        });
        item.classList.toggle('local-submenu-open');
        window.setTimeout(function () {
          var submenu = item.querySelector(':scope > .sub-menu');
          if (submenu && item.classList.contains('local-submenu-open')) {
            submenu.style.setProperty('position', 'static', 'important');
            submenu.style.setProperty('left', 'auto', 'important');
            submenu.style.setProperty('top', 'auto', 'important');
            submenu.style.setProperty('width', '100%', 'important');
            submenu.style.setProperty('min-width', '100%', 'important');
            submenu.style.setProperty('max-width', '100%', 'important');
            submenu.style.setProperty('margin', '0', 'important');
            submenu.style.setProperty('margin-top', '0', 'important');
            submenu.style.setProperty('padding', '0', 'important');
            submenu.style.setProperty('transform', 'none', 'important');
            submenu.style.setProperty('box-shadow', 'none', 'important');
          } else {
            if (submenu) {
              submenu.removeAttribute('style');
            }
          }
        }, 0);
      }
      return;
    }

    var accordionTitle = event.target.closest && event.target.closest('.e-n-accordion-item > summary');
    if (accordionTitle) {
      var details = accordionTitle.parentElement;
      var group = details && details.closest('.e-n-accordion');
      if (details && group) {
        event.preventDefault();
        var shouldOpen = !details.open;
        Array.prototype.forEach.call(group.querySelectorAll(':scope > .e-n-accordion-item'), function (item) {
          if (item !== details && item.open) {
            item.classList.add('local-accordion-closing');
            window.setTimeout(function () {
              item.open = false;
              item.classList.remove('local-accordion-closing');
            }, 260);
          } else if (item !== details) {
            item.open = false;
          }
          var summary = item.querySelector(':scope > summary');
          if (summary) summary.setAttribute('aria-expanded', 'false');
        });
        if (shouldOpen) {
          details.classList.remove('local-accordion-closing');
          details.open = true;
        } else {
          details.classList.add('local-accordion-closing');
          window.setTimeout(function () {
            details.open = false;
            details.classList.remove('local-accordion-closing');
          }, 260);
        }
        accordionTitle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      }
      return;
    }

    var tab = event.target.closest && event.target.closest('.e-n-tab-title');
    if (tab) {
      event.preventDefault();
      var tabs = tab.closest('.e-n-tabs');
      var id = tab.getAttribute('aria-controls');
      if (tabs && id) {
        Array.prototype.forEach.call(tabs.querySelectorAll('.e-n-tab-title'), function (button) {
          var active = button === tab;
          button.setAttribute('aria-selected', active ? 'true' : 'false');
          button.tabIndex = active ? 0 : -1;
        });
        Array.prototype.forEach.call(tabs.querySelectorAll('.e-n-tabs-content > [role="tabpanel"]'), function (panel) {
          var active = panel.id === id;
          panel.classList.toggle('e-active', active);
          panel.setAttribute('data-local-active', active ? 'true' : 'false');
          panel.hidden = !active;
        });
      }
      return;
    }

    var carouselButton = event.target.closest && event.target.closest('.astro-element-element-810fc70 .astro-element-swiper-button');
    if (carouselButton) {
      event.preventDefault();
      var carouselRoot = carouselButton.closest('.astro-element-element-810fc70');
      var direction = carouselButton.classList.contains('astro-element-swiper-button-prev') ? -1 : 1;
      moveLogoCarousel(carouselRoot, direction);
    }
  });

  document.addEventListener('keydown', function (event) {
    var tocHeader = event.target.closest && event.target.closest('.astro-element-widget-table-of-contents .astro-element-toc__header');
    if (tocHeader && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggleLocalToc(tocHeader.closest('.astro-element-widget-table-of-contents'));
    }
  });

  document.querySelectorAll('.e-n-tabs').forEach(function (tabs) {
    var selected = tabs.querySelector('.e-n-tab-title[aria-selected="true"]') || tabs.querySelector('.e-n-tab-title');
    if (selected) selected.click();
  });
  initLogoCarousel();
  initLocalTableOfContents();
  initGalleryLightbox();
  window.addEventListener('resize', function () {
    document.querySelectorAll('.astro-element-element-810fc70').forEach(function (root) {
      var track = root.querySelector('.astro-element-image-carousel');
      if (track) {
        track.style.transition = 'none';
        track.style.transform = 'translateX(0px)';
        track.setAttribute('data-local-index', '0');
      }
    });
    document.querySelectorAll('.astro-element-widget-table-of-contents.local-toc-expanded').forEach(function (toc) {
      setLocalTocExpanded(toc, true, true);
    });
  }, { passive: true });
})();
