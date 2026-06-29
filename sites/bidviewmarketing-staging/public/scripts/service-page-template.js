(() => {
  const toc = document.querySelector('.content-toc');
  const summary = toc ? toc.querySelector('.content-toc-bar') : null;

  if (toc && summary) {
    const tocTransitionMs = 320;
    let tocIsAnimating = false;

    toc.open = false;
    toc.classList.add('is-collapsed');
    summary.setAttribute('aria-expanded', 'false');

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      if (tocIsAnimating) return;

      const isCollapsed = toc.classList.contains('is-collapsed');
      if (isCollapsed) {
        tocIsAnimating = true;
        toc.open = true;
        requestAnimationFrame(() => {
          toc.classList.remove('is-collapsed');
          summary.setAttribute('aria-expanded', 'true');
          setTimeout(() => {
            tocIsAnimating = false;
          }, tocTransitionMs);
        });
      } else {
        tocIsAnimating = true;
        toc.classList.add('is-collapsed');
        summary.setAttribute('aria-expanded', 'false');
        setTimeout(() => {
          toc.open = false;
          tocIsAnimating = false;
        }, tocTransitionMs);
      }
    });
  }

  const links = document.querySelectorAll('.content-toc-nav a[href^="#"]');
  const getOffset = () => {
    if (window.matchMedia('(max-width: 767px)').matches) return 86;
    if (window.matchMedia('(max-width: 1024px)').matches) return 90;
    if (window.matchMedia('(max-width: 1366px)').matches) return 100;
    return 120;
  };

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id) return;
      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - getOffset();
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', window.location.pathname + window.location.search);
    });
  });

  const serviceAccordions = document.querySelectorAll('.content-accordion-item');
  serviceAccordions.forEach((item) => {
    const summaryEl = item.querySelector('summary');
    const icon = summaryEl ? summaryEl.querySelector('span:last-child') : null;
    if (!summaryEl) return;

    item.open = false;
    item.classList.remove('is-expanded');
    summaryEl.setAttribute('aria-expanded', 'false');
    if (icon) icon.textContent = '+';

    summaryEl.addEventListener('click', (event) => {
      event.preventDefault();
      item.open = !item.open;
    });

    item.addEventListener('toggle', () => {
      const isExpanded = item.open;
      if (isExpanded) {
        serviceAccordions.forEach((otherItem) => {
          if (otherItem !== item && otherItem.open) {
            otherItem.open = false;
          }
        });
      }
      item.classList.toggle('is-expanded', isExpanded);
      summaryEl.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      if (icon) icon.textContent = isExpanded ? '-' : '+';
    });
  });
})();
