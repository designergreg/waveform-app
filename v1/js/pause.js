/* ---------- On Hold (Pause) ---------- */
(() => {
  const pauseBtn = document.getElementById("pauseBtn");
  const scrim = document.getElementById("onHoldScrim");
  const pauseIcon = pauseBtn?.querySelector("img");

  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

  const actionbarTextEl = document.querySelector(".actionbar-text");
  const talkPromptEl = document.getElementById("talkPrompt");
  const talkPromptText = talkPromptEl?.querySelector("div");

  let isOnHold = false;

  function applyHoldUI() {
    document.body.classList.toggle("on-hold", isOnHold);

    if (scrim) scrim.style.display = isOnHold ? "block" : "none";
    if (pauseBtn) {
      pauseBtn.classList.toggle("on-hold", isOnHold);
      pauseBtn.setAttribute("aria-pressed", String(isOnHold));
    }
    if (pauseIcon) {
      pauseIcon.src = isOnHold
        ? "../icons/bold/play.svg"
        : "../icons/linear/pause.svg";
    }

    if (actionbarTextEl) {
      actionbarTextEl.textContent = isOnHold
        ? "On hold"
        : (isMobile ? "Press and hold screen to talk" : "Hold spacebar to talk");
    }

    // Optional: if you want to show "On hold" in the talkPrompt later
    // if (talkPromptEl && talkPromptText) {
    //   if (isOnHold) {
    //     talkPromptText.textContent = "On hold";
    //     talkPromptEl.style.display = "block";
    //   } else {
    //     talkPromptText.textContent = "";
    //     talkPromptEl.style.display = "none";
    //   }
    // }
  }

  function notifyWave() {
    if (typeof window.setOnHold === "function") {
      window.setOnHold(isOnHold);
    }
    document.dispatchEvent(
      new CustomEvent("hold:change", { detail: { onHold: isOnHold } })
    );
  }

  function toggleHold() {
    isOnHold = !isOnHold;
    applyHoldUI();
    notifyWave();
  }

  if (pauseBtn && scrim && pauseIcon) {
    pauseBtn.addEventListener("click", toggleHold);
    applyHoldUI();
    notifyWave();
  }
})();
