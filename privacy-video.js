document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-youtube-video]").forEach((container) => {
    const trigger = container.querySelector(".privacy-video__trigger");
    if (!trigger) return;

    trigger.addEventListener("click", () => {
      const videoId = container.dataset.youtubeVideo;
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) return;

      const params = new URLSearchParams({ autoplay: "1", rel: "0" });
      const start = Number.parseInt(container.dataset.youtubeStart || "", 10);
      if (Number.isFinite(start) && start > 0) params.set("start", String(start));

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
      iframe.title = container.dataset.youtubeTitle || "Vidéo YouTube";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;

      container.classList.add("is-playing");
      container.replaceChildren(iframe);
      window.requestAnimationFrame(() => iframe.focus({ preventScroll: true }));
    }, { once: true });
  });
});
