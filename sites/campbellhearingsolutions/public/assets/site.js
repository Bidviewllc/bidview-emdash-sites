(() => {
  const setMenuState = (button, open) => {
    const menu = button.nextElementSibling;
    button.classList.toggle('astro-active', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menu) {
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open && window.matchMedia('(max-width: 1024px)').matches) {
        const buttonRect = button.getBoundingClientRect();
        const top = Math.max(0, buttonRect.bottom);
        menu.style.position = 'fixed';
        menu.style.left = '0';
        menu.style.right = '0';
        menu.style.top = `${top}px`;
        menu.style.width = '100vw';
        menu.style.zIndex = '10000';
      } else {
        menu.removeAttribute('style');
      }
      menu.querySelectorAll('a').forEach((link) => {
        if (open) {
          link.removeAttribute('tabindex');
        } else {
          link.setAttribute('tabindex', '-1');
        }
      });
    }
  };

  document.querySelectorAll('.astro-menu-toggle').forEach((button) => {
    button.addEventListener('click', () => setMenuState(button, !button.classList.contains('astro-active')));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });
  });

  const stickyBar = document.querySelector('[data-id="f58d261"]');
  if (stickyBar) {
    const placeholder = document.createElement('div');
    placeholder.hidden = true;
    stickyBar.parentNode.insertBefore(placeholder, stickyBar);
    stickyBar.classList.add('astro-sticky');
    const updateSticky = () => {
      const isMobileSticky = window.matchMedia('(max-width: 767px)').matches;
      const isWideDesktopSticky = window.matchMedia('(min-width: 1440px)').matches;
      const offset = isMobileSticky ? 20 : (isWideDesktopSticky ? 43 : 42);
      const shouldFix = isMobileSticky || isWideDesktopSticky || window.scrollY > offset;
      const effectsActive = isMobileSticky || window.scrollY > offset;
      stickyBar.classList.toggle('local-sticky-active', effectsActive);
      stickyBar.classList.toggle('astro-sticky--active', shouldFix);
      stickyBar.classList.toggle('astro-sticky--effects', effectsActive);
      if (shouldFix) {
        const stickyRect = stickyBar.getBoundingClientRect();
        const placeholderRect = placeholder.getBoundingClientRect();
        placeholder.hidden = false;
        placeholder.style.height = `${stickyBar.offsetHeight}px`;
        stickyBar.style.position = 'fixed';
        stickyBar.style.width = `${placeholderRect.width || stickyRect.width || stickyBar.offsetWidth}px`;
        stickyBar.style.marginTop = '0px';
        stickyBar.style.marginBottom = '0px';
        stickyBar.style.top = `${offset}px`;
        stickyBar.style.insetInlineStart = `${placeholderRect.width ? placeholderRect.left : stickyRect.left}px`;
      } else {
        placeholder.hidden = true;
        placeholder.style.height = '0';
        stickyBar.style.position = '';
        stickyBar.style.width = '';
        stickyBar.style.marginTop = '';
        stickyBar.style.marginBottom = '';
        stickyBar.style.top = '';
        stickyBar.style.insetInlineStart = '';
      }
    };
    window.addEventListener('scroll', updateSticky, { passive: true });
    window.addEventListener('resize', updateSticky);
    updateSticky();
  }

  document.querySelectorAll('.menu-item-has-children > a').forEach((link) => {
    link.addEventListener('click', (event) => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (link.getAttribute('href') !== '#' && !isMobile) {
        return;
      }
      event.preventDefault();
      link.parentElement.classList.toggle('is-open');
    });
  });

  const slugCounts = new Map();
  const slugify = (text) => {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
    const count = slugCounts.get(base) || 0;
    slugCounts.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };

  const parseSettings = (element) => {
    try {
      return JSON.parse(element.getAttribute('data-settings') || '{}');
    } catch {
      return {};
    }
  };

  const headingIsBefore = (heading, widget) =>
    Boolean(heading.compareDocumentPosition(widget) & Node.DOCUMENT_POSITION_FOLLOWING);

  const buildTocItem = (heading, baseLevel) => {
    if (!heading.id) {
      heading.id = slugify(heading.textContent || '');
    }
    const item = document.createElement('li');
    item.className = 'astro-toc__list-item';
    const depth = Math.max(0, Number(heading.tagName.slice(1)) - baseLevel);
    if (depth) {
      item.style.marginLeft = `${depth * 16}px`;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'astro-toc__list-item-text-wrapper';
    const link = document.createElement('a');
    link.className = 'astro-toc__list-item-text';
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    link.addEventListener('click', () => {
      document
        .querySelectorAll('.astro-toc__list-item-text.astro-item-active')
        .forEach((active) => active.classList.remove('astro-item-active'));
      link.classList.add('astro-item-active');
    });
    wrapper.append(link);
    item.append(wrapper);
    return item;
  };

  document.querySelectorAll('.astro-widget-table-of-contents').forEach((widget) => {
    const body = widget.querySelector('.astro-toc__body');
    if (!body) {
      return;
    }

    const settings = parseSettings(widget);
    const tags = Array.isArray(settings.headings_by_tags) && settings.headings_by_tags.length
      ? settings.headings_by_tags
      : ['h2', 'h3', 'h4'];
    const excludeSelector = settings.exclude_headings_by_selector || '';
    const selector = tags.join(',');
    const headings = Array.from(document.querySelectorAll(selector)).filter((heading) => {
      if (!headingIsBefore(heading, widget)) {
        return false;
      }
      if (!heading.textContent.trim()) {
        return false;
      }
      if (heading.closest('header, footer, .astro-widget-table-of-contents, .astro-posts-container')) {
        return false;
      }
      return !excludeSelector || !(heading.matches(excludeSelector) || heading.closest(excludeSelector));
    });

    body.textContent = '';
    if (!headings.length) {
      const empty = document.createElement('div');
      empty.className = 'astro-toc__empty-message';
      empty.textContent = settings.no_headings_message || 'No headings were found on this page.';
      body.append(empty);
      return;
    }

    const list = document.createElement('ol');
    list.className = 'astro-toc__list-wrapper';
    const baseLevel = Math.min(...headings.map((heading) => Number(heading.tagName.slice(1))));
    headings.forEach((heading) => list.append(buildTocItem(heading, baseLevel)));
    body.append(list);

    const collapse = () => widget.classList.add('astro-toc--collapsed');
    const expand = () => widget.classList.remove('astro-toc--collapsed');
    widget.querySelector('.astro-toc__toggle-button--expand')?.addEventListener('click', expand);
    widget.querySelector('.astro-toc__toggle-button--collapse')?.addEventListener('click', collapse);
  });
})();
