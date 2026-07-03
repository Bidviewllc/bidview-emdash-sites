(() => {
  document.documentElement.classList.add('js-ready');

  document.querySelectorAll('a[href="#"], a[href=""]').forEach((link) => {
    link.addEventListener('click', (event) => event.preventDefault());
  });

  document.querySelectorAll('form[data-local-static="true"]').forEach((form) => {
    form.addEventListener('submit', (event) => event.preventDefault());
  });

  const header = document.querySelector('.astro-element-4007a12');
  const updateHeader = () => {
    if (!header) return;
    const stuck = window.scrollY > 20;
    header.classList.toggle('is-stuck', stuck);
    if (stuck) {
      header.style.setProperty('opacity', '1', 'important');
      header.style.setProperty('background', '#fff', 'important');
      header.style.setProperty('background-color', '#fff', 'important');
      header.style.setProperty('background-image', 'none', 'important');
      header.style.setProperty('transition', 'box-shadow 0.3s ease, padding 0.3s ease', 'important');
    } else {
      header.style.removeProperty('opacity');
      header.style.removeProperty('background');
      header.style.removeProperty('background-color');
      header.style.removeProperty('background-image');
      header.style.removeProperty('transition');
    }
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  document.querySelectorAll('.astro-menu-toggle').forEach((toggle) => {
    const widget = toggle.closest('.astro-widget-nav-menu');
    const dropdown = widget?.querySelector(':scope > .astro-widget-container > .astro-nav-menu__container:not(.astro-nav-menu--main)');
    toggle.addEventListener('click', () => {
      if (!dropdown) return;
      const open = !dropdown.classList.contains('is-open');
      dropdown.classList.toggle('is-open', open);
      dropdown.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        const headerBottom = Math.round(document.querySelector('.astro-location-header')?.getBoundingClientRect().bottom || 0);
        dropdown.style.setProperty('top', `${headerBottom}px`, 'important');
        dropdown.style.setProperty('left', '0', 'important');
        dropdown.style.setProperty('right', '0', 'important');
        dropdown.style.setProperty('width', '100vw', 'important');
        dropdown.style.setProperty('margin-top', '0', 'important');
        dropdown.style.setProperty('height', 'auto', 'important');
        dropdown.style.setProperty('max-height', `calc(100vh - ${headerBottom}px)`, 'important');
        dropdown.style.setProperty('transform', 'none', 'important');
      } else {
        dropdown.removeAttribute('style');
      }
    });
    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle.click();
      }
    });
  });

  document.querySelectorAll('.astro-element-d896320 .menu-item-has-children > a').forEach((link) => {
    if (!link.querySelector(':scope > .local-mobile-caret')) {
      const caret = document.createElement('span');
      caret.className = 'local-mobile-caret';
      caret.setAttribute('aria-hidden', 'true');
      caret.textContent = '▾';
      link.appendChild(caret);
    }
    link.addEventListener('click', (event) => {
      if (!window.matchMedia('(hover: none), (max-width: 1024px)').matches) return;
      const item = link.parentElement;
      if (!item) return;
      event.preventDefault();
      const open = !item.classList.contains('is-submenu-open');
      item.parentElement?.querySelectorAll(':scope > .menu-item-has-children.is-submenu-open').forEach((sibling) => {
        if (sibling !== item) {
          sibling.classList.remove('is-submenu-open');
          sibling.querySelectorAll('.menu-item-has-children.is-submenu-open').forEach((nested) => nested.classList.remove('is-submenu-open'));
        }
      });
      item.classList.toggle('is-submenu-open', open);
      if (!open) {
        item.querySelectorAll('.menu-item-has-children.is-submenu-open').forEach((nested) => nested.classList.remove('is-submenu-open'));
      }
    });
  });

  const setRegionHeight = (details) => {
    const region = details.querySelector(':scope > [role="region"]');
    if (!region) return;
    region.style.maxHeight = details.open ? `${region.scrollHeight}px` : '0px';
  };

  document.querySelectorAll('.e-n-accordion').forEach((accordion) => {
    const items = Array.from(accordion.querySelectorAll(':scope > details.e-n-accordion-item'));
    const closeItem = (item) => {
      const itemSummary = item.querySelector(':scope > summary');
      const itemRegion = item.querySelector(':scope > [role="region"]');
      if (!itemRegion || !item.open) return;
      item.dataset.localAccordionClosing = 'true';
      itemSummary?.setAttribute('aria-expanded', 'false');
      itemRegion.style.maxHeight = `${itemRegion.scrollHeight}px`;
      requestAnimationFrame(() => {
        itemRegion.style.maxHeight = '0px';
      });
      const finishClose = () => {
        if (item.dataset.localAccordionClosing === 'true') {
          item.open = false;
          itemRegion.style.maxHeight = '0px';
          delete item.dataset.localAccordionClosing;
        }
        itemRegion.removeEventListener('transitionend', finishClose);
      };
      itemRegion.addEventListener('transitionend', finishClose);
      window.setTimeout(finishClose, 460);
    };
    const openItem = (item) => {
      const itemSummary = item.querySelector(':scope > summary');
      const itemRegion = item.querySelector(':scope > [role="region"]');
      if (!itemRegion) return;
      item.open = true;
      itemSummary?.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => {
        itemRegion.style.maxHeight = `${itemRegion.scrollHeight}px`;
      });
    };
    items.forEach((details) => {
      const summary = details.querySelector(':scope > summary');
      const region = details.querySelector(':scope > [role="region"]');
      if (!summary || !region) return;
      region.style.maxHeight = details.open ? `${region.scrollHeight}px` : '0px';
      region.querySelectorAll('img').forEach((img) => {
        if (!img.complete) {
          img.addEventListener('load', () => setRegionHeight(details), { once: true });
        }
      });
      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(() => {
          if (details.open && details.dataset.localAccordionClosing !== 'true') setRegionHeight(details);
        });
        observer.observe(region);
      }
      summary.setAttribute('aria-expanded', String(details.open));
      summary.setAttribute('tabindex', '0');
      summary.addEventListener('click', (event) => {
        event.preventDefault();
        const shouldOpen = !details.open;
        items.forEach((item) => {
          if (item === details && shouldOpen) {
            openItem(item);
          } else {
            closeItem(item);
          }
        });
      });
    });
  });

  document.querySelectorAll('.e-n-tabs').forEach((tabs) => {
    const buttons = Array.from(tabs.querySelectorAll('[role="tab"]'));
    const panels = Array.from(tabs.querySelectorAll('[role="tabpanel"]'));
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('aria-controls');
        buttons.forEach((candidate) => {
          const active = candidate === button;
          candidate.setAttribute('aria-selected', String(active));
          candidate.setAttribute('tabindex', active ? '0' : '-1');
        });
        panels.forEach((panel) => {
          const active = panel.id === targetId;
          panel.classList.toggle('e-active', active);
          panel.toggleAttribute('hidden', !active);
        });
      });
    });
  });

  document.querySelectorAll('.astro-widget-table-of-contents').forEach((widget) => {
    const body = widget.querySelector('.astro-toc__body');
    if (!body || body.dataset.localTocReady) return;
    body.dataset.localTocReady = 'true';
    let settings = {};
    try {
      settings = JSON.parse(widget.getAttribute('data-settings') || '{}');
    } catch (error) {
      settings = {};
    }
    const tags = Array.isArray(settings.headings_by_tags) && settings.headings_by_tags.length ? settings.headings_by_tags : ['h2', 'h3', 'h4'];
    const selector = tags.map((tag) => tag.toLowerCase()).join(',');
    const root = widget.closest('[data-astro-type="single-post"], [data-astro-type="single-page"], .astro-location-single') || document.body;
    const headings = Array.from(root.querySelectorAll(selector)).filter((heading) => {
      if (!heading.textContent.trim()) return false;
      if (heading.closest('.astro-widget-table-of-contents, header, footer, .astro-location-header, .astro-location-footer')) return false;
      if (heading.closest('[hidden], details:not([open])')) return false;
      return true;
    });
    body.replaceChildren();
    if (!headings.length) {
      const empty = document.createElement('div');
      empty.className = 'astro-toc__empty-message';
      empty.textContent = settings.no_headings_message || 'No headings were found on this page.';
      body.appendChild(empty);
      return;
    }
    const list = document.createElement('ul');
    list.className = 'astro-toc__list-wrapper';
    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = `${heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'}-${index + 1}`;
      }
      const item = document.createElement('li');
      item.className = `astro-toc__list-item astro-toc__level-${heading.tagName.toLowerCase()}`;
      const link = document.createElement('a');
      link.className = 'astro-toc__list-item-text';
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();
      item.appendChild(link);
      list.appendChild(item);
    });
    body.appendChild(list);
  });

  document.querySelectorAll('.astro-element-a97cd5c .astro-loop-container').forEach((carousel) => {
    if (carousel.dataset.localStaffCarouselReady) return;
    carousel.dataset.localStaffCarouselReady = 'true';
    const wrapper = carousel.querySelector(':scope > .swiper-wrapper');
    const slides = wrapper ? Array.from(wrapper.children) : [];
    const root = carousel.closest('.astro-element-a97cd5c');
    const prev = root?.querySelector('.astro-swiper-button-prev');
    const next = root?.querySelector('.astro-swiper-button-next');
    const pagination = root?.querySelector('.swiper-pagination');
    if (!wrapper || slides.length < 2) return;
    let index = 0;
    let perView = 1;
    let maxIndex = 0;
    let startX = 0;
    let dragging = false;
    const getPerView = () => window.matchMedia('(max-width: 767px)').matches ? 1 : 2;
    const buildDots = () => {
      if (!pagination) return;
      pagination.replaceChildren();
      for (let i = 0; i <= maxIndex; i += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'swiper-pagination-bullet';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => {
          index = i;
          update();
        });
        pagination.appendChild(dot);
      }
    };
    const update = () => {
      perView = getPerView();
      maxIndex = Math.max(0, slides.length - perView);
      index = Math.max(0, Math.min(index, maxIndex));
      const first = slides[0].getBoundingClientRect();
      const second = slides[1]?.getBoundingClientRect();
      const gap = second ? Math.max(0, second.left - first.right) : 0;
      const step = first.width + gap;
      wrapper.style.transform = `translate3d(${-index * step}px, 0, 0)`;
      pagination?.querySelectorAll('.swiper-pagination-bullet').forEach((dot, dotIndex) => {
        dot.classList.toggle('swiper-pagination-bullet-active', dotIndex === index);
      });
    };
    perView = getPerView();
    maxIndex = Math.max(0, slides.length - perView);
    buildDots();
    update();
    prev?.addEventListener('click', () => {
      index = index <= 0 ? maxIndex : index - 1;
      update();
    });
    next?.addEventListener('click', () => {
      index = index >= maxIndex ? 0 : index + 1;
      update();
    });
    wrapper.addEventListener('pointerdown', (event) => {
      dragging = true;
      startX = event.clientX;
      wrapper.setPointerCapture?.(event.pointerId);
    });
    wrapper.addEventListener('pointerup', (event) => {
      if (!dragging) return;
      dragging = false;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 40) {
        index = delta < 0 ? (index >= maxIndex ? 0 : index + 1) : (index <= 0 ? maxIndex : index - 1);
        update();
      }
      wrapper.releasePointerCapture?.(event.pointerId);
    });
    wrapper.addEventListener('pointercancel', () => {
      dragging = false;
    });
    window.addEventListener('resize', () => {
      const nextPerView = getPerView();
      const oldMax = maxIndex;
      maxIndex = Math.max(0, slides.length - nextPerView);
      if (oldMax !== maxIndex) buildDots();
      update();
    }, { passive: true });
  });

  document.querySelectorAll('.astro-element-c85bf5f .e-n-carousel.swiper .swiper-wrapper').forEach((wrapper) => {
    if (wrapper.dataset.localBrandCarouselReady) return;
    wrapper.dataset.localBrandCarouselReady = 'true';
    const carousel = wrapper.closest('.e-n-carousel.swiper');
    const logos = Array.from(wrapper.querySelectorAll(':scope > .swiper-slide:not([aria-hidden="true"]) img')).map((img) => ({
      src: img.getAttribute('src'),
      srcset: img.getAttribute('srcset'),
      sizes: img.getAttribute('sizes'),
      alt: img.getAttribute('alt') || '',
      width: img.getAttribute('width'),
      height: img.getAttribute('height')
    })).filter((logo) => logo.src);
    if (logos.length < 2) return;
    wrapper.replaceChildren();
    const addLogoPass = (hidden = false) => logos.forEach((logo) => {
      const img = document.createElement('img');
      img.className = 'local-brand-logo';
      img.src = logo.src;
      if (logo.srcset) img.srcset = logo.srcset;
      if (logo.sizes) img.sizes = logo.sizes;
      if (logo.width) img.width = Number.parseInt(logo.width, 10) || 150;
      if (logo.height) img.height = Number.parseInt(logo.height, 10) || 62;
      img.alt = hidden ? '' : logo.alt;
      img.loading = 'eager';
      img.decoding = 'async';
      img.draggable = false;
      if (hidden) {
        img.setAttribute('aria-hidden', 'true');
        img.dataset.localBrandClone = 'true';
      }
      wrapper.appendChild(img);
    });
    addLogoPass(false);
    const addClonePass = () => addLogoPass(true);
    addClonePass();
    const ensureCoverage = () => {
      let guard = 0;
      const targetWidth = (carousel?.getBoundingClientRect().width || window.innerWidth) * 2.4;
      while (wrapper.scrollWidth < targetWidth && guard < 8) {
        addClonePass();
        guard += 1;
      }
    };
    let offset = 0;
    let lastTime = performance.now();
    let dragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    const speed = 0.044;
    const gap = () => {
      const styles = getComputedStyle(wrapper);
      return Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    };
    const firstStep = () => {
      const first = wrapper.firstElementChild;
      return first ? first.getBoundingClientRect().width + gap() : 0;
    };
    const normalize = () => {
      let guard = 0;
      while (wrapper.children.length > 1 && offset <= -firstStep() && guard < 20) {
        const step = firstStep();
        wrapper.appendChild(wrapper.firstElementChild);
        offset += step;
        guard += 1;
      }
      guard = 0;
      while (wrapper.children.length > 1 && offset > 0 && guard < 20) {
        const last = wrapper.lastElementChild;
        const styles = getComputedStyle(last);
        const step = last.getBoundingClientRect().width + gap() + Number.parseFloat(styles.marginLeft || '0') + Number.parseFloat(styles.marginRight || '0');
        wrapper.insertBefore(last, wrapper.firstElementChild);
        offset -= step;
        guard += 1;
      }
    };
    const render = () => {
      wrapper.style.transform = `translate3d(${offset}px, 0, 0)`;
    };
    const tick = (now) => {
      const delta = Math.min(64, now - lastTime);
      lastTime = now;
      if (!dragging) {
        offset -= delta * speed;
        normalize();
        render();
      }
      requestAnimationFrame(tick);
    };
    const pause = (event) => {
      dragging = true;
      dragStartX = event.clientX;
      dragStartOffset = offset;
      lastTime = performance.now();
      carousel?.classList.add('is-dragging');
      wrapper.setPointerCapture?.(event.pointerId);
    };
    const resume = (event) => {
      if (!dragging) return;
      dragging = false;
      lastTime = performance.now();
      carousel?.classList.remove('is-dragging');
      wrapper.releasePointerCapture?.(event.pointerId);
    };
    wrapper.querySelectorAll('img').forEach((img) => {
      img.setAttribute('draggable', 'false');
      if (!img.complete) img.addEventListener('load', ensureCoverage, { once: true });
    });
    wrapper.addEventListener('pointerdown', pause);
    wrapper.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      offset = dragStartOffset + event.clientX - dragStartX;
      normalize();
      render();
    });
    wrapper.addEventListener('pointerup', resume);
    wrapper.addEventListener('pointercancel', resume);
    wrapper.addEventListener('lostpointercapture', resume);
    window.addEventListener('resize', () => {
      ensureCoverage();
      normalize();
      render();
    }, { passive: true });
    ensureCoverage();
    render();
    requestAnimationFrame(tick);
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.e-n-accordion-item[open]').forEach(setRegionHeight);
  });
  window.addEventListener('load', () => {
    document.querySelectorAll('.e-n-accordion-item[open]').forEach(setRegionHeight);
  });

  const sizeResponsiveMediaSections = () => {
    document.querySelectorAll('.astro-element-543ae9f, .astro-element-c503de3, .astro-element-3a5f6d3').forEach((section) => {
      section.style.minHeight = `${section.scrollHeight}px`;
    });
  };
  sizeResponsiveMediaSections();
  window.addEventListener('load', sizeResponsiveMediaSections);
  window.addEventListener('resize', sizeResponsiveMediaSections, { passive: true });
  document.querySelectorAll('.astro-element-543ae9f img, .astro-element-c503de3 img, .astro-element-3a5f6d3 img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', sizeResponsiveMediaSections, { once: true });
  });
})();
