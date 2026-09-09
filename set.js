(function () {
  const reveals = document.querySelectorAll(".reveal");
  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18 })
    : null;

  reveals.forEach((el) => {
    if (observer) observer.observe(el);
    else el.classList.add("is-visible");
  });

  let currentAudio = null;
  let currentButton = null;
  let currentPlayer = null;
  let currentTrack = null;
  const players = document.querySelectorAll(".player[data-src]");

  function setPlay(button) {
    button.innerHTML = "&#9658;";
  }

  function clearCurrentState() {
    if (currentButton) {
      setPlay(currentButton);
      currentButton.setAttribute("aria-label", currentButton.getAttribute("aria-label").replace("Pause", "Lire"));
    }
    if (currentPlayer) currentPlayer.classList.remove("is-playing");
    if (currentTrack) currentTrack.classList.remove("is-playing");
  }

  function pauseCurrent() {
    if (currentAudio) currentAudio.pause();
    clearCurrentState();
  }

  players.forEach((player) => {
    const button = player.querySelector(".player__button");
    const bar = player.querySelector(".player__bar span");
    const src = player.dataset.src;
    const track = player.closest(".track");
    let audio = null;

    button.addEventListener("click", () => {
      if (!audio) {
        audio = new Audio(src);
        audio.preload = "metadata";
        audio.addEventListener("timeupdate", () => {
          const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
          bar.style.width = progress + "%";
        });
        audio.addEventListener("ended", () => {
          setPlay(button);
          player.classList.remove("is-playing");
          if (track) track.classList.remove("is-playing");
          bar.style.width = "0%";
        });
      }

      if (currentAudio && currentAudio !== audio) pauseCurrent();

      if (audio.paused) {
        audio.play().then(() => {
          currentAudio = audio;
          currentButton = button;
          currentPlayer = player;
          currentTrack = track;
          player.classList.add("is-playing");
          if (track) track.classList.add("is-playing");
          button.textContent = "II";
          button.setAttribute("aria-label", button.getAttribute("aria-label").replace("Lire", "Pause"));
        }).catch(() => {
          setPlay(button);
        });
      } else {
        audio.pause();
        clearCurrentState();
      }
    });
  });

})();
