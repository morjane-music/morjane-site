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

let cursorLight = null;

if (!isMobile) {
  cursorLight = document.createElement('div');
  cursorLight.className = 'cursor-light';
  document.body.appendChild(cursorLight);

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

let traceOpacity = 0;
let traceOpacityTarget = 0;
let traceRAF = null;

function updateTrace() {
  if (!traceTimeline || traceItems.length === 0) return;

  const rect = traceTimeline.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  const start = windowHeight * 0.45;
  const end = windowHeight * 0.9;

  let progress =
    (start - rect.top) / (rect.height - (end - start));

  progress = Math.min(Math.max(progress, 0), 1);

  traceTimeline.style.setProperty(
    '--trace-progress',
    `${progress * 100}%`
  );

  // opacité progressive de la ligne
  
traceOpacityTarget = Math.pow(progress, 4);

  traceItems.forEach(item => {
    const itemRect = item.getBoundingClientRect();
    const itemCenter = itemRect.top + itemRect.height / 2;

    item.classList.remove('is-active', 'is-past');

    if (itemCenter < start) {
      item.classList.add('is-past');
    } else if (itemCenter >= start && itemCenter <= start + 60) {
      item.classList.add('is-active');
    }
  });
}

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

window.addEventListener('scroll', updateTrace);
window.addEventListener('resize', updateTrace);
updateTrace();

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
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
  });
}

function animateTrace() {
  traceOpacity += (traceOpacityTarget - traceOpacity) * 0.01;

  traceTimeline.style.setProperty(
    '--trace-opacity',
    traceOpacity
  );

  traceRAF = requestAnimationFrame(animateTrace);
}

if (traceTimeline) {
  animateTrace();
}
