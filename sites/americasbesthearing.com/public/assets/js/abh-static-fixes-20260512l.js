(function () {
  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  const icon = (dir) => {
    const path = dir === 'prev'
      ? 'M646 125C629 125 613 133 604 142L308 442C296 454 292 471 292 487 292 504 296 521 308 533L604 854C617 867 629 875 646 875 663 875 679 871 692 858 704 846 713 829 713 812 713 796 708 779 692 767L438 487 692 225C700 217 708 204 708 187 708 171 704 154 692 142 675 129 663 125 646 125Z'
      : 'M696 533C708 521 713 504 713 487 713 471 708 454 696 446L400 146C388 133 375 125 354 125 338 125 325 129 313 142 300 154 292 171 292 187 292 204 296 221 308 233L563 492 304 771C292 783 288 800 288 817 288 833 296 850 308 863 321 871 338 875 354 875 371 875 388 867 400 854L696 533Z';
    return `<svg aria-hidden="true" class="e-font-icon-svg e-eicon-chevron-${dir === 'prev' ? 'left' : 'right'}" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="${path}"></path></svg>`;
  };

  const buttonArrowIcon = () => '<span class="abh-button-arrow" aria-hidden="true"><svg viewBox="0 0 18 14" xmlns="http://www.w3.org/2000/svg"><path d="M1 7h14"></path><path d="M11 2l5 5-5 5"></path></svg></span>';

  const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function setupHeader() {
    document.querySelectorAll('header.astro-location-header .menu-item-2009').forEach((item) => item.remove());

    document.querySelectorAll('header.astro-location-header .astro-element-7192b37 .menu-item-has-children > a').forEach((link) => {
      if (link.querySelector('.abh-submenu-caret')) return;
      const caret = document.createElement('span');
      caret.className = 'abh-submenu-caret';
      caret.setAttribute('aria-hidden', 'true');
      link.appendChild(caret);
    });

    document.querySelectorAll('header.astro-location-header .astro-nav-menu--main .menu-item-has-children').forEach((item) => {
      let closeTimer = null;
      const open = () => {
        clearTimeout(closeTimer);
        item.classList.add('abh-submenu-open-desktop');
      };
      const close = () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => item.classList.remove('abh-submenu-open-desktop'), 180);
      };
      item.addEventListener('mouseenter', open);
      item.addEventListener('mouseleave', close);
      item.addEventListener('focusin', open);
      item.addEventListener('focusout', close);
    });

    document.querySelectorAll('header.astro-location-header .astro-menu-toggle').forEach((toggle) => {
      const widget = toggle.closest('.astro-widget-nav-menu');
      const dropdown = widget && widget.querySelector(':scope > .astro-widget-container > .astro-nav-menu--dropdown');
      if (!widget || !dropdown) return;

      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', () => {
        const isOpen = widget.classList.toggle('abh-menu-open');
        dropdown.setAttribute('aria-hidden', String(!isOpen));
        toggle.setAttribute('aria-expanded', String(isOpen));
        dropdown.querySelectorAll('a').forEach((link) => link.tabIndex = isOpen ? 0 : -1);
        if (isOpen && window.matchMedia('(max-width: 1024px)').matches) {
          const header = toggle.closest('header');
          const top = header ? header.getBoundingClientRect().bottom : 0;
          dropdown.style.top = `${Math.max(0, top)}px`;
          dropdown.style.left = '0px';
          dropdown.style.setProperty('margin-top', '0px', 'important');
          dropdown.style.right = '0px';
          dropdown.style.width = '100vw';
        } else {
          dropdown.style.top = '';
          dropdown.style.left = '';
          dropdown.style.removeProperty('margin-top');
          dropdown.style.right = '';
          dropdown.style.width = '';
        }
      });
    });

    document.querySelectorAll('header.astro-location-header .astro-nav-menu--dropdown .menu-item-has-children > a').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (!window.matchMedia('(max-width: 1024px)').matches) return;
        const item = link.closest('.menu-item-has-children');
        if (!item) return;
        event.preventDefault();
        item.classList.toggle('abh-submenu-open');
      });
    });
  }

  function getSlidesToShow(root) {
    const width = window.innerWidth;
    let settings = root.getAttribute('data-settings') || '';
    if (!settings.includes('slides_to_show')) {
      const settingsSource = root.querySelector('[data-widget_type*="carousel"][data-settings], [data-widget_type*="slides"][data-settings]');
      settings = (settingsSource && settingsSource.getAttribute('data-settings')) || settings;
    }
    let desktop = 1;
    let laptop = 1;
    let tablet = 1;
    let mobile = 1;
    try {
      const parsed = JSON.parse(settings.replace(/&quot;/g, '"'));
      desktop = Number(parsed.slides_to_show || desktop);
      laptop = Number(parsed.slides_to_show_laptop || desktop);
      tablet = Number(parsed.slides_to_show_tablet || laptop);
      mobile = Number(parsed.slides_to_show_mobile || 1);
    } catch (e) {
      desktop = root.classList.contains('astro-element-6e2ff94') ? 4 : 1;
      laptop = desktop;
      tablet = Math.min(2, desktop);
      mobile = 1;
    }
    if (width <= 767) return mobile || 1;
    if (width < 1024) return tablet || mobile || 1;
    if (width < 1366) return laptop || desktop || 1;
    return desktop || 1;
  }

  function setupSlider(root, options) {
    const viewport = root.querySelector('.swiper, .astro-image-carousel-wrapper');
    const track = root.querySelector('.swiper-wrapper, .astro-image-carousel');
    if (!viewport || !track) return;

    const originalSlides = Array.from(track.children).filter((el) => el.classList.contains('swiper-slide'));
    if (originalSlides.length < 2) return;

    root.classList.remove('astro-invisible', 'elementor-invisible');
    viewport.classList.add('abh-slider-ready');
    root.classList.add('abh-slider-ready');
    if (options.swiperStateClasses) {
      const widgetRoot = root.querySelector('.astro-widget-loop-carousel, .astro-widget');
      if (widgetRoot) widgetRoot.classList.add('e-widget-swiper');
      viewport.classList.add('offset-both', 'swiper-initialized', 'swiper-horizontal', 'swiper-pointer-events');
    }

    let pagination = root.querySelector('.swiper-pagination');
    if (!pagination) {
      pagination = document.createElement('div');
      pagination.className = 'swiper-pagination';
      viewport.appendChild(pagination);
    }

    let prev = root.querySelector('.astro-swiper-button-prev, .abh-swiper-button-prev');
    let next = root.querySelector('.astro-swiper-button-next, .abh-swiper-button-next');
    if (options.arrows && !prev) {
      prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'abh-swiper-button abh-swiper-button-prev';
      prev.setAttribute('aria-label', 'Previous');
      prev.innerHTML = icon('prev');
      viewport.appendChild(prev);
    }
    if (options.arrows && !next) {
      next = document.createElement('button');
      next.type = 'button';
      next.className = 'abh-swiper-button abh-swiper-button-next';
      next.setAttribute('aria-label', 'Next');
      next.innerHTML = icon('next');
      viewport.appendChild(next);
    }

    let index = 0;
    let trackIndex = 0;
    let visible = 1;
    let timer = null;
    let slideStep = 0;
    let dragStartX = 0;
    let dragStartTranslate = 0;
    let dragging = false;
    let moved = false;
    let activePageOverride = null;
    let renderedSlides = originalSlides.slice();
    let cloneCount = 0;
    let loopResetTimer = null;

    const getOffset = () => {
      if (!options.offset) return 0;
      const width = window.innerWidth;
      if (width <= 767) return options.offset.mobile || 0;
      if (width <= 1024) return options.offset.tablet || 0;
      if (width <= 1366) return options.offset.laptop || options.offset.desktop || 0;
      return options.offset.desktop || 0;
    };
    const getTranslate = () => getOffset() - (trackIndex * slideStep);
    const setTranslate = (value, animated = true) => {
      track.style.transition = animated ? `transform ${options.speed || 600}ms ease` : 'none';
      track.style.transform = `translate3d(${value}px, 0, 0)`;
    };

    const clearLoopReset = () => {
      if (!loopResetTimer) return;
      clearTimeout(loopResetTimer);
      loopResetTimer = null;
    };

    const rebuildLoop = () => {
      clearLoopReset();
      track.querySelectorAll('.abh-slide-clone').forEach((clone) => clone.remove());
      renderedSlides = originalSlides.slice();
      cloneCount = 0;

      const shouldLoop = Boolean(options.loopClones) && originalSlides.length > visible;
      if (!shouldLoop) {
        trackIndex = index;
        return;
      }

      cloneCount = options.loopClones === 'visibleMinusOne'
        ? Math.min(Math.max(1, visible - 1), originalSlides.length)
        : Math.min(options.loopClones, originalSlides.length);
      const prepend = originalSlides.slice(-cloneCount).map((slide) => {
        const clone = slide.cloneNode(true);
        clone.classList.add('abh-slide-clone');
        clone.classList.add('swiper-slide-duplicate');
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      });
      const append = originalSlides.slice(0, cloneCount).map((slide) => {
        const clone = slide.cloneNode(true);
        clone.classList.add('abh-slide-clone');
        clone.classList.add('swiper-slide-duplicate');
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      });

      prepend.forEach((clone) => track.insertBefore(clone, track.firstChild));
      append.forEach((clone) => track.appendChild(clone));
      renderedSlides = Array.from(track.children).filter((el) => el.classList.contains('swiper-slide'));
      trackIndex = index + cloneCount;
    };

    const queueLoopReset = () => {
      if (!cloneCount) return;
      clearLoopReset();
      loopResetTimer = setTimeout(() => {
        trackIndex = index + cloneCount;
        setTranslate(getTranslate(), false);
      }, (options.speed || 600) + 30);
    };

    const update = () => {
      visible = Math.max(1, Math.min(getSlidesToShow(root), originalSlides.length));
      rebuildLoop();
      const gap = Number.parseFloat(getComputedStyle(track).getPropertyValue('--abh-slide-gap')) || options.gap || 0;
      const offset = getOffset();
      const pixelWidth = (viewport.getBoundingClientRect().width - (offset * 2) - ((visible - 1) * gap)) / visible;
      const basis = `${Math.max(1, pixelWidth)}px`;
      track.style.setProperty('--abh-slide-width', basis);
      track.style.setProperty('--abh-slider-speed', `${options.speed || 600}ms`);
      renderedSlides.forEach((slide) => {
        slide.style.setProperty('--abh-slide-width', basis);
        slide.style.width = basis;
        slide.style.maxWidth = basis;
        slide.style.flexBasis = basis;
      });
      const max = Math.max(0, originalSlides.length - visible);
      const fullSlidePagination = options.paginationAllSlides && !cloneCount;
      const loopPagination = cloneCount && options.paginationAllSlides;
      if (loopPagination) {
        if (index > originalSlides.length - 1) index = originalSlides.length - 1;
      } else if (fullSlidePagination) {
        if (index > originalSlides.length - 1) index = originalSlides.length - 1;
      } else if (index > max) {
        index = max;
      }
      if (cloneCount) {
        trackIndex = index + cloneCount;
      } else if (fullSlidePagination) {
        trackIndex = Math.min(index, max);
      } else {
        trackIndex = index;
      }
      slideStep = (renderedSlides[0] || originalSlides[0]).getBoundingClientRect().width + gap;
      setTranslate(getTranslate(), true);

      renderedSlides.forEach((slide) => {
        slide.classList.remove('swiper-slide-prev', 'swiper-slide-active', 'swiper-slide-next', 'swiper-slide-duplicate-prev', 'swiper-slide-duplicate-active', 'swiper-slide-duplicate-next');
      });
      const activeRenderedIndex = Math.min(trackIndex, renderedSlides.length - 1);
      const prevRendered = renderedSlides[activeRenderedIndex - 1];
      const activeRendered = renderedSlides[activeRenderedIndex];
      const nextRendered = renderedSlides[activeRenderedIndex + 1];
      if (prevRendered) prevRendered.classList.add(prevRendered.classList.contains('abh-slide-clone') ? 'swiper-slide-duplicate-prev' : 'swiper-slide-prev');
      if (activeRendered) activeRendered.classList.add(activeRendered.classList.contains('abh-slide-clone') ? 'swiper-slide-duplicate-active' : 'swiper-slide-active');
      if (nextRendered) nextRendered.classList.add(nextRendered.classList.contains('abh-slide-clone') ? 'swiper-slide-duplicate-next' : 'swiper-slide-next');

      pagination.innerHTML = '';
      const pages = options.paginationByVisible ? Math.ceil(originalSlides.length / visible) : (options.paginationAllSlides ? originalSlides.length : Math.max(1, max + 1));
      const activePage = activePageOverride == null
        ? (options.paginationByVisible ? Math.floor(index / visible) : index)
        : activePageOverride;
      for (let i = 0; i < pages; i += 1) {
        const bullet = document.createElement('button');
        bullet.type = 'button';
        bullet.className = `swiper-pagination-bullet${i === activePage ? ' swiper-pagination-bullet-active' : ''}`;
        bullet.setAttribute('aria-label', `Go to slide ${i + 1}`);
        bullet.addEventListener('click', () => {
          if (loopPagination) {
            index = options.paginationByVisible ? Math.min(i * visible, originalSlides.length - 1) : i;
          } else if (fullSlidePagination) {
            index = options.paginationByVisible ? Math.min(i * visible, originalSlides.length - 1) : i;
          } else {
            index = options.paginationByVisible ? Math.min(i * visible, max) : Math.min(i, max);
          }
          activePageOverride = i;
          update();
          restart();
        });
        pagination.appendChild(bullet);
      }
    };

    const go = (direction) => {
      const max = Math.max(0, originalSlides.length - visible);
      if (cloneCount && options.paginationAllSlides) {
        if (direction > 0) {
          if (index >= originalSlides.length - 1) {
            index = 0;
            trackIndex = originalSlides.length + cloneCount;
            activePageOverride = 0;
            setTranslate(getTranslate(), true);
            queueLoopReset();
            return;
          }
          index += 1;
        } else {
          if (index <= 0) {
            index = originalSlides.length - 1;
            trackIndex = cloneCount - 1;
            activePageOverride = index;
            setTranslate(getTranslate(), true);
            queueLoopReset();
            return;
          }
          index -= 1;
        }
        activePageOverride = index;
        update();
        return;
      }

      if (options.paginationAllSlides) {
        index += direction;
        if (index > originalSlides.length - 1) index = 0;
        if (index < 0) index = originalSlides.length - 1;
        activePageOverride = index;
        update();
        return;
      }

      index += direction;
      if (index > max) index = 0;
      if (index < 0) index = max;
      activePageOverride = index;
      update();
    };

    const startDrag = (clientX) => {
      dragging = true;
      moved = false;
      dragStartX = clientX;
      dragStartTranslate = getTranslate();
      viewport.classList.add('abh-dragging');
      clearInterval(timer);
      setTranslate(dragStartTranslate, false);
    };

    const moveDrag = (clientX) => {
      if (!dragging) return;
      const delta = clientX - dragStartX;
      if (Math.abs(delta) > 4) moved = true;
      setTranslate(dragStartTranslate + delta, false);
    };

    const endDrag = (clientX) => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('abh-dragging');
      const delta = clientX - dragStartX;
      const threshold = Math.max(45, slideStep * 0.16);
      if (Math.abs(delta) > threshold) {
        go(delta < 0 ? 1 : -1);
      } else {
        update();
      }
      restart();
      setTimeout(() => { moved = false; }, 0);
    };

    const restart = () => {
      if (!options.autoplay) return;
      clearInterval(timer);
      timer = setInterval(() => go(1), options.autoplay);
    };

    if (prev) prev.addEventListener('click', () => { go(-1); restart(); });
    if (next) next.addEventListener('click', () => { go(1); restart(); });
    viewport.querySelectorAll('img').forEach((img) => { img.draggable = false; });
    viewport.addEventListener('mouseenter', () => clearInterval(timer));
    viewport.addEventListener('mouseleave', restart);
    viewport.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      startDrag(event.clientX);
      try { viewport.setPointerCapture(event.pointerId); } catch (e) {}
    });
    viewport.addEventListener('pointermove', (event) => {
      moveDrag(event.clientX);
    });
    const finishDrag = (event) => {
      endDrag(event.clientX || dragStartX);
    };
    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('mousedown', (event) => {
      if (dragging || event.button !== 0) return;
      event.preventDefault();
      startDrag(event.clientX);
    });
    document.addEventListener('mousemove', (event) => moveDrag(event.clientX));
    document.addEventListener('mouseup', (event) => endDrag(event.clientX));
    viewport.addEventListener('click', (event) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    window.addEventListener('resize', update);
    update();
    restart();
  }

  function setupTabs() {
    document.querySelectorAll('.astro-element-dd08e84 .e-n-tabs').forEach((tabs) => {
      const buttons = Array.from(tabs.querySelectorAll('.e-n-tab-title[role="tab"]'));
      const panels = Array.from(tabs.querySelectorAll('[role="tabpanel"]'));
      const activate = (button) => {
        buttons.forEach((btn) => {
          const active = btn === button;
          btn.setAttribute('aria-selected', String(active));
          btn.tabIndex = active ? 0 : -1;
        });
        panels.forEach((panel) => {
          const active = panel.id === button.getAttribute('aria-controls');
          panel.hidden = !active;
          panel.setAttribute('aria-hidden', String(!active));
          panel.classList.toggle('e-active', active);
          panel.style.display = active ? 'flex' : 'none';
        });
      };
      buttons.forEach((button) => {
        button.addEventListener('click', () => activate(button));
        button.addEventListener('keydown', (event) => {
          if (!['Enter', ' '].includes(event.key)) return;
          event.preventDefault();
          activate(button);
        });
      });
      activate(buttons.find((btn) => btn.getAttribute('aria-selected') === 'true') || buttons[0]);
    });
  }

  function setupGalleries() {
    document.querySelectorAll('.e-gallery-image[data-thumbnail]').forEach((image) => {
      const thumbnail = image.getAttribute('data-thumbnail');
      if (!thumbnail) return;
      image.style.backgroundImage = `url("${thumbnail}")`;
    });
  }

  function setupAccordions() {
    document.querySelectorAll('.e-n-accordion').forEach((accordion) => {
      const items = Array.from(accordion.querySelectorAll(':scope > details.e-n-accordion-item'));
      items.forEach((item) => {
        const summary = item.querySelector(':scope > summary');
        const region = item.querySelector(':scope > [role="region"]');
        if (!summary || !region) return;
        const openedIcon = summary.querySelector('.e-n-accordion-item-title-icon .e-opened');
        if (openedIcon && !openedIcon.querySelector('svg')) {
          openedIcon.innerHTML = '<svg aria-hidden="true" class="e-font-icon-svg e-fas-angle-up" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg"><path d="M177 159.7l136 136c9.4 9.4 9.4 24.6 0 33.9l-22.6 22.6c-9.4 9.4-24.6 9.4-33.9 0L160 255.9l-96.4 96.4c-9.4 9.4-24.6 9.4-33.9 0L7 329.7c-9.4-9.4-9.4-24.6 0-33.9l136-136c9.4-9.5 24.6-9.5 34-.1z"></path></svg>';
        }

        region.style.transition = 'max-height 400ms ease, opacity 300ms ease';
        const sync = () => {
          summary.setAttribute('aria-expanded', String(item.open));
          region.style.maxHeight = item.open ? `${region.scrollHeight}px` : '0px';
          region.style.opacity = item.open ? '1' : '0';
        };

        summary.addEventListener('click', (event) => {
          event.preventDefault();
          const willOpen = !item.open;
          items.forEach((other) => {
            if (other !== item) {
              other.open = false;
              const otherRegion = other.querySelector(':scope > [role="region"]');
              const otherSummary = other.querySelector(':scope > summary');
              if (otherRegion) {
                otherRegion.style.maxHeight = '0px';
                otherRegion.style.opacity = '0';
              }
              if (otherSummary) otherSummary.setAttribute('aria-expanded', 'false');
            }
          });
          item.open = willOpen;
          sync();
        });
        sync();
      });
    });
  }

  function setupElfsightWidget() {
    document.querySelectorAll('.astro-element-58eb8d9e .elfsight-app-a252c8e6-d0b4-46cc-b126-5097ae9d4f60').forEach((widget) => {
      widget.classList.add('eapps-widget', 'eapps-widget-show-toolbar');
      widget.setAttribute('data-miwrid', 'e562e7a1-0249-4b77-879c-494cdb1de4c8');
      widget.innerHTML = '';
    });
    if (!document.querySelector('script[src="https://elfsightcdn.com/platform.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }

  function ensureButtonIcon(button) {
    if (!button) return;

    let wrapper = button.querySelector('.astro-button-content-wrapper, .elementor-button-content-wrapper');
    const textContent = button.textContent.replace(/\s+/g, ' ').trim();
    if (!wrapper) {
      wrapper = document.createElement('span');
      wrapper.className = button.classList.contains('astro-button') ? 'astro-button-content-wrapper' : 'elementor-button-content-wrapper';
      const text = document.createElement('span');
      text.className = button.classList.contains('astro-button') ? 'astro-button-text' : 'elementor-button-text';
      text.textContent = textContent;
      wrapper.appendChild(text);
      button.textContent = '';
      button.appendChild(wrapper);
    }

    const textNode = wrapper.querySelector('.astro-button-text, .elementor-button-text');
    if (!textNode) return;
    let iconWrap = wrapper.querySelector('.astro-button-icon, .elementor-button-icon');
    if (!iconWrap) {
      iconWrap = document.createElement('span');
      iconWrap.className = button.classList.contains('astro-button') ? 'astro-button-icon' : 'elementor-button-icon';
      wrapper.insertBefore(iconWrap, textNode);
    }
    iconWrap.innerHTML = buttonArrowIcon();
  }

  function setupButtons() {
    const targets = new Set([
      'schedule your appointment',
      'view our services',
      'meet our team',
      'get directions'
    ]);
    document.querySelectorAll('a, button').forEach((button) => {
      const text = normalizeText(button.textContent);
      if (!targets.has(text)) return;
      ensureButtonIcon(button);
    });
  }

  ready(() => {
    setupHeader();
    setupSlider(document.querySelector('.astro-element-b4c8e33'), { autoplay: 6000, speed: 800, arrows: false, gap: 0 });
    setupSlider(document.querySelector('.astro-element-6e2ff94'), { autoplay: false, speed: 500, arrows: true, gap: 0, paginationAllSlides: true, loopClones: 'visibleMinusOne', swiperStateClasses: true, offset: { desktop: 60, laptop: 60, tablet: 40, mobile: 42 } });
    setupSlider(document.querySelector('.astro-element-68060980'), { autoplay: 5000, speed: 900, arrows: true, gap: 20 });
    setupTabs();
    setupGalleries();
    setupAccordions();
    setupElfsightWidget();
    setupButtons();
  });
})();
