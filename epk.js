document.addEventListener('DOMContentLoaded', () => {

  const carousel = document.querySelector('.epk-carousel');
  const btnLeft = document.querySelector('.epk-carousel-btn.left');
  const btnRight = document.querySelector('.epk-carousel-btn.right');

  if (carousel && btnLeft && btnRight) {
    const getScrollAmount = () => {
      const firstItem = carousel.querySelector('.epk-photo');
      return firstItem ? firstItem.offsetWidth + 32 : 360;
    };

    btnLeft.addEventListener('click', () => {
      carousel.scrollBy({
        left: -getScrollAmount(),
        behavior: 'smooth'
      });
    });

    btnRight.addEventListener('click', () => {
      carousel.scrollBy({
        left: getScrollAmount(),
        behavior: 'smooth'
      });
    });
  }

  const lightbox = document.querySelector('.epk-lightbox');
  const lightboxImg = lightbox ? lightbox.querySelector('img') : null;
  const closeBtn = document.querySelector('.epk-lightbox-close');
  let lightboxTrigger = null;

  if (lightbox && lightboxImg && closeBtn) {

    const pageRegions = [...document.body.children].filter(element => element !== lightbox);

    document.querySelectorAll('.epk-photo-open').forEach(button => {
      button.addEventListener('click', () => {
        const img = button.querySelector('img');
        if (!img) return;
        lightboxTrigger = button;
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.hidden = false;
        document.body.classList.add('epk-lightbox-open');
        pageRegions.forEach(element => { element.inert = true; });
        closeBtn.focus();
      });
    });

    const closeLightbox = () => {
      lightbox.hidden = true;
      lightboxImg.src = '';
      lightboxImg.alt = '';
      document.body.classList.remove('epk-lightbox-open');
      pageRegions.forEach(element => { element.inert = false; });
      lightboxTrigger?.focus();
      lightboxTrigger = null;
    };

    closeBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !lightbox.hidden) {
        closeLightbox();
      }

      if (e.key === 'Tab' && !lightbox.hidden) {
        e.preventDefault();
        closeBtn.focus();
      }
    });
  }

  const revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach(el => revealObserver.observe(el));
  }

});

const burger = document.querySelector('.epk-burger');
const nav = document.querySelector('.epk-nav');

if (burger && nav) {
  const closeEpkMenu = (restoreFocus = false) => {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.classList.remove('menu-open');
    if (restoreFocus) burger.focus();
  };

  burger.setAttribute('aria-expanded', 'false');

  burger.addEventListener('click', event => {
    event.stopPropagation();
    const isOpen = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
    burger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-open', isOpen);
    if (isOpen) window.requestAnimationFrame(() => nav.querySelector('a')?.focus());
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeEpkMenu);
  });

  nav.addEventListener('click', event => {
    event.stopPropagation();
  });

  document.addEventListener('click', () => {
    if (nav.classList.contains('is-open')) {
      closeEpkMenu();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      event.preventDefault();
      closeEpkMenu(true);
      return;
    }

    if (event.key === 'Tab' && nav.classList.contains('is-open')) {
      const focusable = [burger, ...nav.querySelectorAll('a')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 768px)').matches) {
      closeEpkMenu();
    }
  });
}

const isMobile = window.matchMedia("(max-width: 768px)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let cursorLight = document.querySelector('.cursor-light');

if (!isMobile && !prefersReducedMotion) {
  if (!cursorLight) {
    cursorLight = document.createElement('div');
    cursorLight.className = 'cursor-light';
    document.body.appendChild(cursorLight);
  }

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', event => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursorLight.style.opacity = '1';
  });

  function followCursor() {
    cursorLight.style.left = mouseX + 'px';
    cursorLight.style.top = mouseY + 'px';
    requestAnimationFrame(followCursor);
  }

  followCursor();

  document.addEventListener('mouseleave', () => {
    cursorLight.style.opacity = '0';
  });
}

document
   .querySelectorAll('img')
  .forEach(zone => {
    zone.addEventListener('mouseenter', () => {
      document.body.classList.add('on-image');
    });

    zone.addEventListener('mouseleave', () => {
      document.body.classList.remove('on-image');
    });
  });

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
