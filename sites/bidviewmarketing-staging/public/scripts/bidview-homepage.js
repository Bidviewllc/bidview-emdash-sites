// Page-specific behavior for index-clean.html.
// Keep this file for interactive enhancements as sections are rebuilt.

(function initIndexCleanPage() {
  document.documentElement.classList.add('js-ready');

  const body = document.body;
  const pageLoader = document.querySelector('[data-page-loader]');
  const heroVideo = document.querySelector('.hero__video');
  const heroSurface = document.querySelector('.hero');

  if (body && pageLoader) {
    const loaderStart = performance.now();
    const minimumLoaderMs = 900;
    const maximumLoaderMs = 3200;
    let pageLoaded = document.readyState === 'complete';
    let videoReady = !heroVideo || heroVideo.readyState >= 2;
    let loaderDismissed = false;
    let pendingDismissTimer = null;

    function dismissLoader() {
      if (loaderDismissed) return;
      loaderDismissed = true;
      body.classList.add('is-loaded');
      body.classList.remove('is-loading');
      window.setTimeout(function removeLoader() {
        pageLoader.remove();
      }, 700);
    }

    function queueLoaderDismissal() {
      if (loaderDismissed || !pageLoaded || !videoReady) return;

      const elapsed = performance.now() - loaderStart;
      const waitTime = Math.max(0, minimumLoaderMs - elapsed);

      if (pendingDismissTimer) {
        window.clearTimeout(pendingDismissTimer);
      }

      pendingDismissTimer = window.setTimeout(dismissLoader, waitTime);
    }

    window.addEventListener(
      'load',
      function onWindowLoad() {
        pageLoaded = true;
        queueLoaderDismissal();
      },
      { once: true }
    );

    if (heroVideo && !videoReady) {
      const markVideoReady = function markVideoReady() {
        videoReady = true;
        heroVideo.classList.add('is-ready');
        if (heroSurface) heroSurface.classList.add('hero--video-ready');
        queueLoaderDismissal();
      };

      const markVideoFailed = function markVideoFailed() {
        videoReady = true;
        queueLoaderDismissal();
      };

      heroVideo.addEventListener('loadeddata', markVideoReady, { once: true });
      heroVideo.addEventListener('canplay', markVideoReady, { once: true });
      heroVideo.addEventListener('error', markVideoFailed, { once: true });
    } else if (heroVideo && videoReady) {
      heroVideo.classList.add('is-ready');
      if (heroSurface) heroSurface.classList.add('hero--video-ready');
    }

    window.setTimeout(function forceLoaderDismissal() {
      pageLoaded = true;
      videoReady = true;
      queueLoaderDismissal();
    }, maximumLoaderMs);

    queueLoaderDismissal();
  }

  const scrollTopTrigger = document.querySelector('[data-scroll-top]');
  if (scrollTopTrigger) {
    scrollTopTrigger.addEventListener('click', function onScrollTopClick(event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const partnerTabs = Array.from(document.querySelectorAll('[data-partner-tab]'));
  const partnerVideo = document.querySelector('[data-partner-video] source');
  const partnerVideoElement = document.querySelector('[data-partner-video]');
  const partnerIcon = document.querySelector('[data-partner-icon]');
  const partnerHeading = document.querySelector('[data-partner-heading]');
  const partnerDescription = document.querySelector('[data-partner-description]');

  function getPartnerDataFromDom() {
    const partnerDataNode = document.getElementById('partner-data-json');
    if (!partnerDataNode) return null;

    try {
      const parsed = JSON.parse(partnerDataNode.textContent || '{}');
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (error) {
      console.warn('Unable to parse dynamic partner data.', error);
    }

    return null;
  }

  const partnerData = getPartnerDataFromDom() || {
    1: {
      video: './Assets/bidview-marketing-video-01.mp4',
      icon: './Assets/bidview-marketing-icon-medical.webp',
      heading: 'Medical Practices',
      description:
        'Medical Practices: Map the patient journey from first search to booked appointment, updating outdated tactics with targeted strategies that capture qualified leads and keep your schedule full.'
    },
    2: {
      video: './Assets/bidview-marketing-video-02.mp4',
      icon: './Assets/bidview-marketing-icon-legal.webp',
      heading: 'Law Firms',
      description:
        'Law Firms: You need cutting-edge marketing strategies to rise above a crowded field, attract high-value clients, and position your practice as the go-to choice in your area.'
    },
    3: {
      video: './Assets/bidview-marketing-video-03.mp4',
      icon: './Assets/bidview-marketing-icon-engineering.webp',
      heading: 'Engineering Firms',
      description:
        'Stand out in a sea of sameness by clearly communicating your specialized expertise and project successes, turning technical capabilities into compelling reasons for clients to choose you.'
    },
    4: {
      video: './Assets/bidview-marketing-video-04.mp4',
      icon: './Assets/bidview-marketing-icon-franchise.webp',
      heading: 'Rollup/Franchises',
      description:
        'Work with a partner who understands the financial mechanics of roll-ups, designing cost-effective marketing strategies that drive unified growth and maximize ROI across every location.'
    }
  };

  function setPartnerTab(tabId) {
    const data = partnerData[tabId];
    if (!data) return;

    partnerTabs.forEach(function (tab) {
      const isActive = Number(tab.dataset.partnerTab) === tabId;
      tab.classList.toggle('partners__tab--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (partnerVideo && partnerVideoElement) {
      partnerVideo.src = data.video;
      partnerVideoElement.load();
      partnerVideoElement.play().catch(function () {});
    }
    if (partnerIcon) partnerIcon.src = data.icon;
    if (partnerHeading) partnerHeading.textContent = data.heading;
    if (partnerDescription) partnerDescription.textContent = data.description;
  }

  partnerTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setPartnerTab(Number(tab.dataset.partnerTab));
    });
  });

  const statNumbers = Array.from(document.querySelectorAll('[data-counter-to]'));
  const statsSection = document.querySelector('.stats');

  function animateCounter(element) {
    const target = Number(element.dataset.counterTo || 0);
    const duration = Number(element.dataset.counterDuration || 2000);
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      element.textContent = String(value);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.textContent = String(target);
      }
    }

    requestAnimationFrame(tick);
  }

  if (statsSection && statNumbers.length) {
    let hasAnimatedInView = false;

    function resetCounters() {
      statNumbers.forEach(function (element) {
        element.textContent = '0';
      });
    }

    const statsObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!hasAnimatedInView) {
              resetCounters();
              statNumbers.forEach(animateCounter);
              hasAnimatedInView = true;
            }
          } else {
            hasAnimatedInView = false;
            resetCounters();
          }
        });
      },
      { threshold: 0.35 }
    );

    statsObserver.observe(statsSection);
  }

  const desktopScrollMq = window.matchMedia('(min-width: 1025px)');
  const heroSection = document.querySelector('.hero');
  const introSection = document.querySelector('.intro');
  const processSection = document.querySelector('.process');
  const partnersSection = document.querySelector('.partners');
  const whatWeDoSection = document.querySelector('.what-we-do');
  const bannerSection = document.querySelector('.banner');
  const statsSnapSection = document.querySelector('.stats');
  const testimonialSnapSections = Array.from(document.querySelectorAll('.testimonials .testimonial'));
  const ctaSection = document.querySelector('.cta');
  const processStepsContainer = document.querySelector('.process__steps');
  const processSteps = Array.from(document.querySelectorAll('.process__step'));
  const verticalSnapTargets = [bannerSection, statsSnapSection, ...testimonialSnapSections].filter(Boolean);
  const homeNavTargets = [
    { id: 'hero', type: 'section', label: 'Hero', element: heroSection },
    { id: 'intro', type: 'section', label: 'Intro', element: introSection }
  ]
    .concat(
      processSteps.map(function (_, index) {
        return {
          id: 'process-' + String(index + 1),
          type: 'process',
          label: 'Process step ' + String(index + 1),
          element: processSection,
          processIndex: index
        };
      })
    )
    .concat([
      { id: 'partners', type: 'section', label: 'Partners', element: partnersSection },
      { id: 'what-we-do', type: 'section', label: 'What we do', element: whatWeDoSection },
      { id: 'banner', type: 'vertical', label: 'Banner', element: bannerSection, verticalIndex: 0 },
      { id: 'stats', type: 'vertical', label: 'Stats', element: statsSnapSection, verticalIndex: 1 }
    ])
    .concat(
      testimonialSnapSections.map(function (testimonial, index) {
        return {
          id: 'testimonial-' + String(index + 1),
          type: 'vertical',
          label: 'Testimonial ' + String(index + 1),
          element: testimonial,
          verticalIndex: index + 2
        };
      })
    )
    .concat([{ id: 'cta', type: 'section', label: 'CTA', element: ctaSection }])
    .filter(function (target) {
      return Boolean(target.element);
    });

  let snapLocked = false;
  let activeSequence = null;
  let activeIndex = 0;
  let wheelIntent = 0;
  let wheelIntentTimer = null;
  let postSnapIgnoreUntil = 0;
  let processSettleUntil = 0;
  let activeProcessAnimationCancel = null;
  let snapDots = [];

  const snapDuration = 1200;
  const processSnapDuration = 1200;
  const dotNavDuration = 950;
  const wheelIntentThreshold = 1.6;
  const wheelIntentResetMs = 260;
  const wheelIntentGain = 2.3;
  const immediateWheelThreshold = 6;
  const postSnapIgnoreMs = 100;
  const processSettleMs = 60;
  const sequenceThreshold = 0.65;

  function isDesktopSnapEnabled() {
    return desktopScrollMq.matches;
  }

  function getScrollTop() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function getProcessTop() {
    return processSection ? processSection.offsetTop : 0;
  }

  function getProcessStepCount() {
    return processSteps.length;
  }

  function getProcessStepIndex() {
    if (!processStepsContainer) return 0;
    const stepWidth = processStepsContainer.clientWidth || 1;
    return Math.round(processStepsContainer.scrollLeft / stepWidth);
  }

  function getVerticalCount() {
    return verticalSnapTargets.length;
  }

  function clearWheelIntent() {
    wheelIntent = 0;
    if (wheelIntentTimer) {
      window.clearTimeout(wheelIntentTimer);
      wheelIntentTimer = null;
    }
  }

  function findNavIndexById(id) {
    return homeNavTargets.findIndex(function (target) {
      return target.id === id;
    });
  }

  function findProcessNavIndex(stepIndex) {
    return homeNavTargets.findIndex(function (target) {
      return target.type === 'process' && target.processIndex === stepIndex;
    });
  }

  function findVerticalNavIndex(stepIndex) {
    return homeNavTargets.findIndex(function (target) {
      return target.type === 'vertical' && target.verticalIndex === stepIndex;
    });
  }

  function registerWheelIntent(deltaY, gain) {
    if (wheelIntent && Math.sign(wheelIntent) !== Math.sign(deltaY)) {
      wheelIntent = 0;
    }

    wheelIntent += deltaY * gain;

    if (wheelIntentTimer) {
      window.clearTimeout(wheelIntentTimer);
    }

    wheelIntentTimer = window.setTimeout(function resetWheelIntent() {
      clearWheelIntent();
    }, wheelIntentResetMs);

    return wheelIntent;
  }

  function getNearestVerticalIndex(anchorTop) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    verticalSnapTargets.forEach(function (target, index) {
      const distance = Math.abs(target.offsetTop - anchorTop);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  function runParallelAnimations(tasks, onDone) {
    if (!tasks.length) {
      if (onDone) onDone();
      return;
    }

    let remaining = tasks.length;

    tasks.forEach(function (task) {
      task(function completeTask() {
        remaining -= 1;
        if (!remaining && onDone) onDone();
      });
    });
  }

  function getSnapDotLabel(index) {
    return homeNavTargets[index] ? homeNavTargets[index].label : 'Section';
  }

  function navigateToSnapDot(dotIndex) {
    if (!isDesktopSnapEnabled() || snapLocked) return;

    const target = homeNavTargets[dotIndex];
    if (!target) return;

    clearWheelIntent();

    if (target.type === 'process') {
      activeSequence = 'process';
      activeIndex = target.processIndex;
      updateSnapDots();

      lockDuringAnimation(function (unlock) {
        runParallelAnimations(
          [
            function moveWindow(done) {
              animateWindowTo(getProcessTop(), done, dotNavDuration);
            },
            function moveProcess(done) {
              animateProcessStepTo(activeIndex, done, dotNavDuration);
            }
          ],
          unlock
        );
      });

      return;
    }

    if (target.type === 'vertical') {
      activeSequence = 'vertical';
      activeIndex = target.verticalIndex;
      updateSnapDots();

      lockDuringAnimation(function (unlock) {
        animateWindowTo(target.element.offsetTop, unlock, dotNavDuration);
      });
      return;
    }

    activeSequence = null;
    updateSnapDots();

    lockDuringAnimation(function (unlock) {
      animateWindowTo(target.element.offsetTop, unlock, dotNavDuration);
    });
  }

  function buildSnapDots() {
    const snapPointCount = homeNavTargets.length;
    if (!snapPointCount || document.querySelector('.desktop-snap-dots')) return;

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'desktop-snap-dots';
    dotsContainer.setAttribute('role', 'navigation');
    dotsContainer.setAttribute('aria-label', 'Section navigation');

    snapDots = [];

    for (let index = 0; index < snapPointCount; index += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'desktop-snap-dot';
      dot.setAttribute('aria-label', getSnapDotLabel(index));
      dot.addEventListener('click', function onDotClick() {
        navigateToSnapDot(index);
      });
      dotsContainer.appendChild(dot);
      snapDots.push(dot);
    }

    document.body.appendChild(dotsContainer);
  }

  function getActiveSnapDotIndex() {
    if (!homeNavTargets.length) return -1;

    if (activeSequence === 'process') {
      return findProcessNavIndex(activeIndex);
    }

    if (activeSequence === 'vertical') {
      return findVerticalNavIndex(activeIndex);
    }

    const probeTop = getScrollTop() + window.innerHeight * 0.35;
    const scrollBottom = getScrollTop() + window.innerHeight;
    const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const bottomThreshold = 12;
    const introTop = introSection ? introSection.offsetTop : Number.POSITIVE_INFINITY;
    const processTop = processSection ? processSection.offsetTop : Number.POSITIVE_INFINITY;
    const partnersTop = partnersSection ? partnersSection.offsetTop : Number.POSITIVE_INFINITY;
    const whatWeDoTop = whatWeDoSection ? whatWeDoSection.offsetTop : Number.POSITIVE_INFINITY;
    const bannerTop = bannerSection ? bannerSection.offsetTop : Number.POSITIVE_INFINITY;
    const ctaTop = ctaSection ? ctaSection.offsetTop : Number.POSITIVE_INFINITY;

    if (scrollBottom >= documentHeight - bottomThreshold) {
      return findNavIndexById('cta');
    }

    if (probeTop < introTop) {
      return findNavIndexById('hero');
    }

    if (probeTop < processTop) {
      return findNavIndexById('intro');
    }

    if (probeTop < partnersTop) {
      return findProcessNavIndex(getProcessStepIndex());
    }

    if (probeTop < whatWeDoTop) {
      return findNavIndexById('partners');
    }

    if (probeTop < bannerTop) {
      return findNavIndexById('what-we-do');
    }

    if (probeTop < ctaTop) {
      return findVerticalNavIndex(getNearestVerticalIndex(getScrollTop()));
    }

    return findNavIndexById('cta');
  }

  function updateSnapDots() {
    if (!snapDots.length) return;

    const activeDotIndex = getActiveSnapDotIndex();
    snapDots.forEach(function (dot, index) {
      const isActive = index === activeDotIndex;
      dot.classList.toggle('desktop-snap-dot--active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  function animateValue(from, to, duration, onUpdate, onDone) {
    const start = performance.now();
    const delta = to - from;
    let frameId = null;
    let isCancelled = false;

    function frame(now) {
      if (isCancelled) return;

      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      onUpdate(from + delta * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(frame);
        return;
      }

      if (onDone) onDone();
    }

    frameId = requestAnimationFrame(frame);

    return function cancelAnimation() {
      isCancelled = true;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }

  function lockDuringAnimation(run) {
    snapLocked = true;
    run(function unlock() {
      clearWheelIntent();
      postSnapIgnoreUntil = performance.now() + postSnapIgnoreMs;
      snapLocked = false;
      updateSnapDots();
    });
  }

  function animateWindowTo(targetTop, onDone, duration) {
    const startTop = getScrollTop();
    if (Math.abs(startTop - targetTop) < 1) {
      if (onDone) onDone();
      return;
    }

    animateValue(startTop, Math.max(0, targetTop), duration || snapDuration, function (value) {
      window.scrollTo(0, value);
    }, onDone);
  }

  function setProcessStepImmediate(index) {
    if (!processStepsContainer) return;
    processStepsContainer.scrollLeft = processStepsContainer.clientWidth * index;
  }

  function animateProcessStepTo(index, onDone, duration) {
    if (!processStepsContainer) {
      if (onDone) onDone();
      return;
    }

    if (activeProcessAnimationCancel) {
      activeProcessAnimationCancel();
      activeProcessAnimationCancel = null;
    }

    const startLeft = processStepsContainer.scrollLeft;
    const targetLeft = processStepsContainer.clientWidth * index;
    if (Math.abs(startLeft - targetLeft) < 1) {
      if (onDone) onDone();
      return;
    }

    activeProcessAnimationCancel = animateValue(startLeft, targetLeft, duration || snapDuration, function (value) {
      processStepsContainer.scrollLeft = value;
    }, function onProcessAnimationDone() {
      activeProcessAnimationCancel = null;
      processSettleUntil = performance.now() + processSettleMs;
      if (onDone) onDone();
    });
  }

  function isNearViewportTop(section) {
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    return rect.top > 0 && rect.top <= window.innerHeight * sequenceThreshold;
  }

  function isNearViewportBottom(section) {
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    return rect.bottom >= window.innerHeight * (1 - sequenceThreshold) && rect.bottom <= window.innerHeight;
  }

  function enterProcessSequence(fromBelow) {
    if (!processSection || !processStepsContainer || !getProcessStepCount()) return;

    activeSequence = 'process';
    activeIndex = fromBelow ? getProcessStepCount() - 1 : 0;
    setProcessStepImmediate(activeIndex);
    updateSnapDots();

    lockDuringAnimation(function (unlock) {
      animateWindowTo(getProcessTop(), unlock);
    });
  }

  function enterVerticalSequence(fromBelow) {
    if (!verticalSnapTargets.length) return;

    activeSequence = 'vertical';
    activeIndex = fromBelow ? getVerticalCount() - 1 : 0;
    updateSnapDots();

    lockDuringAnimation(function (unlock) {
      animateWindowTo(verticalSnapTargets[activeIndex].offsetTop, unlock);
    });
  }

  function releaseProcessSequence(direction) {
    activeSequence = null;
    processSettleUntil = 0;

    if (activeProcessAnimationCancel) {
      activeProcessAnimationCancel();
      activeProcessAnimationCancel = null;
    }

    const releaseTarget = direction > 0
      ? (partnersSection ? partnersSection.offsetTop : getProcessTop())
      : (introSection ? introSection.offsetTop : 0);

    lockDuringAnimation(function (unlock) {
      animateWindowTo(releaseTarget, unlock);
    });
  }

  function releaseVerticalSequence(direction) {
    activeSequence = null;

    const releaseTarget = direction > 0
      ? (ctaSection ? ctaSection.offsetTop : verticalSnapTargets[verticalSnapTargets.length - 1].offsetTop)
      : (whatWeDoSection ? whatWeDoSection.offsetTop : verticalSnapTargets[0].offsetTop);

    lockDuringAnimation(function (unlock) {
      animateWindowTo(releaseTarget, unlock);
    });
  }

  function moveProcessSequence(direction) {
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= getProcessStepCount()) {
      releaseProcessSequence(direction);
      return;
    }

    activeIndex = nextIndex;
    updateSnapDots();
    animateProcessStepTo(activeIndex, function onProcessStepDone() {
      updateSnapDots();
    }, processSnapDuration);
  }

  function moveVerticalSequence(direction) {
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= getVerticalCount()) {
      releaseVerticalSequence(direction);
      return;
    }

    activeIndex = nextIndex;
    updateSnapDots();
    lockDuringAnimation(function (unlock) {
      animateWindowTo(verticalSnapTargets[activeIndex].offsetTop, unlock);
    });
  }

  function shouldEnterProcess(direction) {
    if (!processSection) return false;
    if (direction > 0) return isNearViewportTop(processSection);
    return isNearViewportBottom(processSection);
  }

  function shouldEnterVertical(direction) {
    if (!verticalSnapTargets.length) return false;
    if (direction > 0) return isNearViewportTop(verticalSnapTargets[0]);
    return isNearViewportBottom(verticalSnapTargets[verticalSnapTargets.length - 1]);
  }

  function syncActiveStateFromScroll() {
    if (!isDesktopSnapEnabled()) {
      activeSequence = null;
      return;
    }

    if (snapLocked) {
      updateSnapDots();
      return;
    }

    const scrollTop = getScrollTop();
    const processTop = getProcessTop();
    const partnersTop = partnersSection ? partnersSection.offsetTop : Number.POSITIVE_INFINITY;
    const bannerTop = bannerSection ? bannerSection.offsetTop : Number.POSITIVE_INFINITY;
    const ctaTop = ctaSection ? ctaSection.offsetTop : Number.POSITIVE_INFINITY;

    if (activeSequence === 'process' && (scrollTop < processTop - 4 || scrollTop >= partnersTop - 4)) {
      activeSequence = null;
    }

    if (activeSequence === 'vertical' && (scrollTop < bannerTop - 4 || scrollTop >= ctaTop - 4)) {
      activeSequence = null;
    }

    if (activeSequence === 'process') {
      activeIndex = getProcessStepIndex();
    }

    if (activeSequence === 'vertical') {
      activeIndex = getNearestVerticalIndex(scrollTop);
    }

    updateSnapDots();
  }

  function resetDesktopSnapState() {
    snapLocked = false;
    activeSequence = null;
    activeIndex = 0;
    postSnapIgnoreUntil = 0;
    processSettleUntil = 0;
    if (activeProcessAnimationCancel) {
      activeProcessAnimationCancel();
      activeProcessAnimationCancel = null;
    }
    clearWheelIntent();
    updateSnapDots();
  }

  function onDesktopWheel(event) {
    if (!isDesktopSnapEnabled()) return;

    if (performance.now() < postSnapIgnoreUntil) {
      event.preventDefault();
      clearWheelIntent();
      return;
    }

    if (activeSequence === 'process' && performance.now() < processSettleUntil) {
      event.preventDefault();
      clearWheelIntent();
      return;
    }

    if (snapLocked) {
      event.preventDefault();
      clearWheelIntent();
      return;
    }

    const deltaY = event.deltaY;
    if (Math.abs(deltaY) < 1) return;

    const direction = deltaY > 0 ? 1 : -1;
    syncActiveStateFromScroll();

    const shouldIntercept =
      activeSequence === 'process' ||
      activeSequence === 'vertical' ||
      shouldEnterProcess(direction) ||
      shouldEnterVertical(direction);

    if (!shouldIntercept) {
      clearWheelIntent();
      return;
    }

    event.preventDefault();

    if (activeSequence === 'process') {
      clearWheelIntent();
      if (activeProcessAnimationCancel) return;
      moveProcessSequence(direction);
      return;
    }

    if (activeSequence !== 'vertical' && shouldEnterProcess(direction)) {
      clearWheelIntent();
      enterProcessSequence(direction < 0);
      return;
    }

    const intent = registerWheelIntent(deltaY, wheelIntentGain);
    if (Math.abs(deltaY) < immediateWheelThreshold && Math.abs(intent) < wheelIntentThreshold) return;

    clearWheelIntent();

    const snapDirection = intent > 0 ? 1 : -1;

    if (activeSequence === 'vertical') {
      moveVerticalSequence(snapDirection);
      return;
    }

    if (shouldEnterVertical(snapDirection)) {
      enterVerticalSequence(snapDirection < 0);
    }
  }

  buildSnapDots();
  updateSnapDots();

  window.addEventListener('wheel', onDesktopWheel, { passive: false });
  window.addEventListener('scroll', syncActiveStateFromScroll, { passive: true });
  desktopScrollMq.addEventListener('change', resetDesktopSnapState);

})();

