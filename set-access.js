(function () {
  const message = document.getElementById("access-message");
  if (!message) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("error") === "invalid") {
    message.textContent = "Mot de passe incorrect. Vérifiez la saisie puis réessayez.";
    message.classList.add("is-error");
  } else if (params.get("error") === "configuration") {
    message.textContent = "L’accès est temporairement indisponible. La configuration du serveur doit être finalisée.";
    message.classList.add("is-error");
  } else if (params.get("status") === "disconnected") {
    message.textContent = "Vous êtes maintenant déconnecté·e.";
  }
  if (window.location.search) window.history.replaceState({}, "", window.location.pathname);

  document.querySelectorAll(".professional-access-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector(".professional-access-status");
      const email = String(new FormData(form).get("email") || "").trim();
      const button = form.querySelector("button[type='submit']");
      button.disabled = true;
      status.textContent = "Envoi en cours…";
      try {
        await fetch("/api/private-access-request-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, scope: form.dataset.privateAccessScope }) });
        status.textContent = "Si cet e-mail possède un accès actif, un lien personnel vient d'être envoyé.";
        form.reset();
      } catch {
        status.textContent = "La demande n'a pas pu être traitée pour le moment.";
      } finally { button.disabled = false; }
    });
  });
})();
