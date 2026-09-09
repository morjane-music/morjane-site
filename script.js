const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const links = document.querySelectorAll('.main-nav a');

function updateScrollState() {
  document.body.classList.toggle('has-scrolled', window.scrollY > 24);
}

updateScrollState();
window.addEventListener('scroll', updateScrollState, { passive: true });

if (toggle && nav) {
  const closeMainMenu = (restoreFocus = false) => {
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    if (restoreFocus) toggle.focus();
  };

  nav.classList.remove('open');
  document.body.classList.remove('menu-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Ouvrir le menu');

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    document.body.classList.toggle('menu-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    if (isOpen) {
      const firstLink = nav.querySelector('a');
      window.requestAnimationFrame(() => {
        firstLink?.focus({ preventScroll: true });
        if (document.activeElement !== firstLink) {
          window.setTimeout(() => firstLink?.focus({ preventScroll: true }), 420);
        }
      });
    }
  });

  document.addEventListener('keydown', event => {
    if (!nav.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMainMenu(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [toggle, ...nav.querySelectorAll('a')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 768px)').matches) closeMainMenu();
  });
}

links.forEach(link => {
  link.addEventListener('click', () => {
    if (!nav) return;
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');

    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
    }
  });
});

const revealSections = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.15 }
);

revealSections.forEach(section => {
  revealObserver.observe(section);
});

const isMobile = window.matchMedia("(max-width: 768px)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let cursorLight = document.querySelector('.cursor-light');

if (!isMobile && !prefersReducedMotion && supportsFinePointer) {
  if (!cursorLight) {
    cursorLight = document.createElement('div');
    cursorLight.className = 'cursor-light';
    document.body.appendChild(cursorLight);
  }

  let mouseX = 0;
  let mouseY = 0;
  let cursorFrame = 0;

  document.addEventListener('pointermove', event => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursorLight.style.opacity = '1';

    if (cursorFrame) return;
    cursorFrame = requestAnimationFrame(() => {
      cursorLight.style.left = mouseX + 'px';
      cursorLight.style.top = mouseY + 'px';
      cursorFrame = 0;
    });
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    cursorLight.style.opacity = '0';
  });
}

document
  .querySelectorAll('.hero, .scene-section, .music-image')
  .forEach(zone => {
    zone.addEventListener('mouseenter', () => {
      document.body.classList.add('on-image');
    });

    zone.addEventListener('mouseleave', () => {
      document.body.classList.remove('on-image');
    });
  });

const clickSound = new Audio('assets/sounds/click.mp3');
clickSound.volume = 0.22;

document.querySelectorAll('a, button').forEach(element => {
  element.addEventListener('click', () => {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  });
});

const traceTimeline = document.querySelector('.trace-timeline');
const traceItems = document.querySelectorAll('.trace-item');

const traceObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        traceObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

traceItems.forEach(item => {
  traceObserver.observe(item);
});

const manifesteItems = document.querySelectorAll('.manifeste-row');

const manifesteObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        manifesteObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);

manifesteItems.forEach(item => {
  manifesteObserver.observe(item);
});

const traceSignature = document.querySelector('.trace-signature');

if (traceSignature) {
  const logoObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          traceSignature.classList.add('is-lit');
          logoObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.35,
      rootMargin: '0px 0px -20% 0px'
    }
  );

  logoObserver.observe(traceSignature);
}

const backButton = document.querySelector('.menu-back');

if (backButton) {
  backButton.addEventListener('click', () => {
    window.location.hash = '#accueil';

    if (nav) {
      nav.classList.remove('open');
    }

    document.body.classList.remove('menu-open');

    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
    }
  });
}

(function initInteractiveTrace() {
  if (!traceTimeline || traceItems.length === 0) return;

  const traceSection = traceTimeline.closest('.section-trace');
  if (!traceSection) return;

  let selectedItem = null;

  function renderTraceState(item) {
    const activeItem = item || selectedItem;
    const activeKey = activeItem?.dataset.traceKey || '';
    traceSection.classList.toggle('is-trace-engaged', Boolean(activeItem));
    traceSection.classList.toggle('has-trace-selection', Boolean(selectedItem));
    traceSection.dataset.traceActive = activeKey;

    traceItems.forEach(traceItem => {
      const isCurrent = traceItem === activeItem;
      traceItem.classList.toggle('is-trace-current', isCurrent);
      traceItem.classList.toggle('is-trace-selected', traceItem === selectedItem);
      traceItem.setAttribute('aria-pressed', String(traceItem === selectedItem));
    });
  }

  traceItems.forEach(item => {
    item.addEventListener('mouseenter', () => renderTraceState(item));
    item.addEventListener('mouseleave', () => renderTraceState(selectedItem));
    item.addEventListener('focus', () => renderTraceState(item));
    item.addEventListener('blur', () => renderTraceState(selectedItem));

    item.addEventListener('click', event => {
      event.stopPropagation();
      selectedItem = item;
      renderTraceState(selectedItem);
    });

    item.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectedItem = item;
      renderTraceState(selectedItem);
    });
  });

  document.addEventListener('click', event => {
    if (event.target.closest('.trace-item')) return;
    selectedItem = null;
    renderTraceState(null);
  });
})();

function initExplorableGroup(groupSelector, itemSelector, options = {}) {
  const group = document.querySelector(groupSelector);
  if (!group) return;

  const items = Array.from(group.querySelectorAll(itemSelector));
  if (items.length === 0) return;

  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let selectedItem = null;
  let selectionTimer = 0;

  function renderExploredState(item) {
    const activeItem = item || selectedItem;
    group.classList.toggle('is-explore-engaged', Boolean(activeItem));

    items.forEach(candidate => {
      candidate.classList.toggle('is-explore-current', candidate === activeItem);
    });
  }

  function selectItem(item) {
    selectedItem = item;
    renderExploredState(selectedItem);

    if (!options.selectionDuration) return;
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => {
      selectedItem = null;
      renderExploredState(null);
    }, options.selectionDuration);
  }

  items.forEach(item => {
    if (supportsHover) {
      item.addEventListener('mouseenter', () => renderExploredState(item));
      item.addEventListener('mouseleave', () => renderExploredState(selectedItem));
    }

    item.addEventListener('focusin', () => renderExploredState(item));
    item.addEventListener('focusout', event => {
      if (event.relatedTarget && item.contains(event.relatedTarget)) return;
      renderExploredState(selectedItem);
    });

    item.addEventListener('click', event => {
      const wasSelected = selectedItem === item;
      selectItem(item);

      if (!options.navigateItem || event.target.closest('a, button')) return;
      const destination = item.querySelector('a[href^="/"]');
      if (!destination) return;

      if (supportsHover || wasSelected) {
        window.location.href = destination.href;
      }
    });

    item.addEventListener('keydown', event => {
      if (event.target !== item || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      selectItem(item);

      if (options.navigateItem && event.key === 'Enter') {
        const destination = item.querySelector('a[href^="/"]');
        if (destination) window.location.href = destination.href;
      }
    });
  });

  document.addEventListener('click', event => {
    if (event.target.closest(groupSelector)) return;
    window.clearTimeout(selectionTimer);
    selectedItem = null;
    renderExploredState(null);
  });
}

initExplorableGroup('.music-traces', '.music-trace', {
  navigateItem: true,
  selectionDuration: 4600
});
initExplorableGroup('.videos-grid', '.video-card:not(.video-card-featured)', {
  selectionDuration: 4200
});

(function initEditorialMotionPrimitives() {
  const observedElements = [
    document.querySelector('.section-manifeste'),
    document.querySelector('.regard-transition'),
    document.querySelector('.scene-section'),
    document.querySelector('.music-focus'),
    document.querySelector('.video-card-featured'),
    document.querySelector('.site-footer')
  ].filter(Boolean);

  if (observedElements.length === 0) return;

  document.body.classList.add('motion-ready');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    observedElements.forEach(element => element.classList.add('is-in-view'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in-view');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: '0px 0px -8% 0px'
  });

  observedElements.forEach(element => observer.observe(element));
})();

(function initManifestoProgress() {
  const section = document.querySelector('.section-manifeste');
  if (!section || prefersReducedMotion) return;

  let progressFrame = 0;

  function updateProgress() {
    const bounds = section.getBoundingClientRect();
    const distance = window.innerHeight + bounds.height;
    const progress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / distance));
    section.style.setProperty('--manifesto-progress', progress.toFixed(3));
    progressFrame = 0;
  }

  function requestProgressUpdate() {
    if (progressFrame) return;
    progressFrame = requestAnimationFrame(updateProgress);
  }

  updateProgress();
  window.addEventListener('scroll', requestProgressUpdate, { passive: true });
  window.addEventListener('resize', requestProgressUpdate);
})();

(function initPointerDepth() {
  if (!supportsFinePointer || prefersReducedMotion) return;

  const surfaces = [
    { zone: document.querySelector('.hero'), target: document.querySelector('.hero-media'), travel: 4 },
    { zone: document.querySelector('.regard-transition'), target: document.querySelector('.regard-transition img'), travel: 3 }
  ].filter(surface => surface.zone && surface.target);

  surfaces.forEach(({ zone, target, travel }) => {
    let frame = 0;
    let x = 0;
    let y = 0;

    zone.addEventListener('pointermove', event => {
      const bounds = zone.getBoundingClientRect();
      x = ((event.clientX - bounds.left) / bounds.width - 0.5) * travel;
      y = ((event.clientY - bounds.top) / bounds.height - 0.5) * travel;

      if (frame) return;
      frame = requestAnimationFrame(() => {
        target.style.setProperty('--depth-x', `${x.toFixed(2)}px`);
        target.style.setProperty('--depth-y', `${y.toFixed(2)}px`);
        frame = 0;
      });
    }, { passive: true });

    zone.addEventListener('pointerleave', () => {
      target.style.setProperty('--depth-x', '0px');
      target.style.setProperty('--depth-y', '0px');
    });
  });
})();

(function initContextualCursor() {
  if (!supportsFinePointer || prefersReducedMotion) return;

  const contexts = [
    { selector: '.privacy-video__trigger, .video-card', className: 'cursor-context-play' },
    { selector: '.music-focus, .music-trace, .trace-item', className: 'cursor-context-discover' },
    { selector: 'a, button, textarea', className: 'cursor-context-link' }
  ];

  document.addEventListener('pointerover', event => {
    contexts.forEach(context => {
      if (event.target.closest(context.selector)) document.body.classList.add(context.className);
    });
  });

  document.addEventListener('pointerout', event => {
    contexts.forEach(context => {
      const origin = event.target.closest(context.selector);
      const destination = event.relatedTarget?.closest?.(context.selector);
      if (origin && origin !== destination) document.body.classList.remove(context.className);
    });
  });
})();

(function initPrimaryFocusSurfaces() {
  const surfaces = document.querySelectorAll('.music-focus, .video-card-featured');

  surfaces.forEach(surface => {
    const engage = () => surface.classList.add('is-focus-current');
    const disengage = event => {
      if (event?.relatedTarget && surface.contains(event.relatedTarget)) return;
      surface.classList.remove('is-focus-current');
    };

    if (supportsFinePointer) {
      surface.addEventListener('mouseenter', engage);
      surface.addEventListener('mouseleave', disengage);
    }
    surface.addEventListener('focusin', engage);
    surface.addEventListener('focusout', disengage);
  });
})();

(function initMagneticCallsToAction() {
  if (!supportsFinePointer || prefersReducedMotion) return;

  const callsToAction = document.querySelectorAll(
    '.music-focus-content .music-cta:first-of-type, .video-feature-cta, .contact-send'
  );

  callsToAction.forEach(callToAction => {
    let frame = 0;
    let x = 0;
    let y = 0;

    callToAction.classList.add('is-magnetic');
    callToAction.addEventListener('pointermove', event => {
      const bounds = callToAction.getBoundingClientRect();
      x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 7;
      y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 5;
      if (frame) return;

      frame = requestAnimationFrame(() => {
        callToAction.style.setProperty('--magnetic-x', `${x.toFixed(2)}px`);
        callToAction.style.setProperty('--magnetic-y', `${y.toFixed(2)}px`);
        frame = 0;
      });
    }, { passive: true });

    callToAction.addEventListener('pointerleave', () => {
      callToAction.style.setProperty('--magnetic-x', '0px');
      callToAction.style.setProperty('--magnetic-y', '0px');
    });
  });
})();

(function initContactFormStates() {
  const form = document.querySelector('.contact-form');
  const status = document.querySelector('.contact-form-status');
  const submit = form?.querySelector('[type="submit"]');
  const message = form?.querySelector('textarea[name="message"]');
  if (!form || !status || !submit || !message) return;

  const defaultLabel = submit.textContent.trim();
  let isSubmitting = false;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (isSubmitting || !form.reportValidity()) return;

    isSubmitting = true;
    form.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    submit.textContent = 'Envoi…';
    status.className = 'contact-form-status is-pending';
    status.textContent = 'Envoi en cours…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error('Form submission failed');

      form.reset();
      status.className = 'contact-form-status is-success';
      status.textContent = 'Message envoyé. Merci.';
      status.focus({ preventScroll: true });
    } catch (error) {
      status.className = 'contact-form-status is-error';
      status.textContent = 'L’envoi n’a pas abouti. Réessayez ou écrivez à booking@morjane.re.';
      message.focus({ preventScroll: true });
    } finally {
      isSubmitting = false;
      form.removeAttribute('aria-busy');
      submit.disabled = false;
      submit.textContent = defaultLabel;
    }
  });
})();

(function initAtelierDoorPeek() {
  const door = document.getElementById("atelierDoor");
  if (!door || !window.matchMedia("(hover: none), (pointer: coarse)").matches) {
    return;
  }

  door.addEventListener("click", (event) => {
    if (door.classList.contains("is-peeking")) {
      return;
    }
    event.preventDefault();
    door.classList.add("is-peeking");
    setTimeout(() => {
      window.location.href = door.href;
    }, 520);
  });
})();
