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
  burger.addEventListener('click', () => {
    nav.classList.toggle('is-open');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
    });
  });
}
