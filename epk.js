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

  if (lightbox && lightboxImg && closeBtn) {

    document.querySelectorAll('.epk-photo img').forEach(img => {
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.hidden = false;
      });
    });

    const closeLightbox = () => {
      lightbox.hidden = true;
      lightboxImg.src = '';
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
  burger.setAttribute('aria-expanded', 'false');

  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    });
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

(function initAtelierDoor() {
  const door = document.getElementById("atelierDoor");
  const modal = document.getElementById("atelierModal");
  const backdrop = modal ? modal.querySelector("[data-close='1']") : null;
  const form = document.getElementById("atelierForm");
  const input = document.getElementById("atelierPass");
  const errorEl = document.getElementById("atelierError");

  if (!door || !modal || !form || !input || !errorEl) {
    return;
  }

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    errorEl.textContent = "";
    setTimeout(() => input.focus(), 50);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    input.value = "";
  }

  function openFromKeyboard(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal();
    }
  }

  door.addEventListener("click", openModal);
  door.addEventListener("keydown", openFromKeyboard);

  if (backdrop) {
    backdrop.addEventListener("click", closeModal);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.textContent = "";

    try {
      const res = await fetch("/.netlify/functions/check-atelier-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass: input.value }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        errorEl.textContent = payload.error === "missing_env" ? "Configuration serveur incomplete." : "Acces refuse.";
        return;
      }

      closeModal();
      window.location.href = "/atelier";
    } catch (_) {
      errorEl.textContent = "Erreur reseau.";
    }
  });
})();
