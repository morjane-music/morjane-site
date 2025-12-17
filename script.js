// MENU MOBILE
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const links = document.querySelectorAll('.main-nav a');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    document.body.classList.toggle('menu-open');
  });
}

links.forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
  });
});

// APPARITION DES SECTIONS
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

// CURSEUR LUMINEUX
const cursorLight = document.createElement('div');
cursorLight.className = 'cursor-light';
document.body.appendChild(cursorLight);

let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
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

// CONTEXTE IMAGE
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

// SON CLICK UNIQUE
const clickSound = new Audio('assets/sounds/click.mp3');
clickSound.volume = 0.22;

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('click', () => {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  });
});
