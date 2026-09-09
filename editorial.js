document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  const closeMenu = () => {
    nav?.classList.remove("open");
    document.body.classList.remove("menu-open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Ouvrir le menu");
  };

  toggle?.addEventListener("click", () => {
    const isOpen = nav?.classList.toggle("open") ?? false;
    document.body.classList.toggle("menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
    if (isOpen) {
      const firstLink = nav?.querySelector("a");
      window.requestAnimationFrame(() => {
        firstLink?.focus({ preventScroll: true });
        if (document.activeElement !== firstLink) {
          window.setTimeout(() => firstLink?.focus({ preventScroll: true }), 420);
        }
      });
    }
  });

  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 768px)").matches) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (!nav?.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      toggle?.focus();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [toggle, ...nav.querySelectorAll("a")].filter(Boolean);
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

  if (document.body.classList.contains("press-page")) {
    const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    document.querySelectorAll(".press-list").forEach((list) => {
      const entries = [...list.querySelectorAll(".press-entry")];
      let selectedEntry = null;

      const renderPressState = (temporaryEntry = null) => {
        const currentEntry = temporaryEntry || selectedEntry;
        list.classList.toggle("is-press-engaged", Boolean(currentEntry));
        entries.forEach((entry) => {
          entry.classList.toggle("is-press-current", entry === currentEntry);
        });
      };

      entries.forEach((entry) => {
        if (hoverCapable) {
          entry.addEventListener("mouseenter", () => renderPressState(entry));
          entry.addEventListener("mouseleave", () => renderPressState());
        }

        entry.addEventListener("focusin", () => renderPressState(entry));
        entry.addEventListener("focusout", () => renderPressState());
        entry.addEventListener("click", (event) => {
          if (event.target.closest("a")) return;
          selectedEntry = selectedEntry === entry ? null : entry;
          renderPressState();
        });
        entry.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          if (event.target.closest("a")) return;
          event.preventDefault();
          selectedEntry = selectedEntry === entry ? null : entry;
          renderPressState();
        });
      });

      document.addEventListener("click", (event) => {
        if (event.target.closest(".press-entry")) return;
        selectedEntry = null;
        renderPressState();
      });
    });

  }

  const elements = document.querySelectorAll(".reveal-work");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  elements.forEach((element) => observer.observe(element));
});
