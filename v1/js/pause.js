/* ------------------------------------------------------------
 * On Hold (Pause) control
 * ------------------------------------------------------------ */

(() => {
  /* -----------------------------
   * DOM ELEMENTS
   * ----------------------------- */
  const pauseBtn   = document.getElementById("pauseBtn");
  const scrim      = document.getElementById("onHoldScrim");
  const pauseIcon  = pauseBtn?.querySelector("img");

  // Prompt routing (used indirectly via window.setPromptText)
  const actionbarTextEl = document.querySelector(".actionbar-text");
  const talkPromptEl    = document.getElementById("talkPrompt");
  const talkPromptText  = talkPromptEl?.querySelector("div");

  /* -----------------------------
   * DEVICE / PLATFORM
   * ----------------------------- */
  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

  /* -----------------------------
   * STATE
   * ----------------------------- */
  let isOnHold = false;

  /* -----------------------------
   * UI UPDATE
   * ----------------------------- */
  function applyHoldUI() {
    // Mark body as on-hold (used by other modules, e.g., more.js)
    document.body.classList.toggle("on-hold", isOnHold);

    // Dim the screen with a scrim
    if (scrim) {
      scrim.style.display = isOnHold ? "block" : "none";
    }

    // Pause button visual state
    if (pauseBtn) {
      pauseBtn.classList.toggle("on-hold", isOnHold);
      pauseBtn.setAttribute("aria-pressed", String(isOnHold));
    }

    // Swap icon between pause and play
    if (pauseIcon) {
      pauseIcon.src = isOnHold
        ? "../icons/bold/play.svg"
        : "../icons/linear/pause.svg";
    }

    // Route prompt text via the global prompt system (wave2.js)
    if (typeof window.setPromptText === "function") {
      const msg = isOnHold
        ? "On hold"
        : (isMobile
            ? "Press and hold screen to talk"
            : "Hold spacebar to talk");

      window.setPromptText(msg);
    }
  }

  /* -----------------------------
   * NOTIFY OTHER SYSTEMS
   * ----------------------------- */
  function notifyWave() {
    // Directly tell the waveform system (wave2.js) about hold state
    if (typeof window.setOnHold === "function") {
      window.setOnHold(isOnHold);
    }

    // Fire a custom event for any other listeners
    document.dispatchEvent(
      new CustomEvent("hold:change", {
        detail: { onHold: isOnHold }
      })
    );
  }

  /* -----------------------------
   * TOGGLE HANDLER
   * ----------------------------- */
  function toggleHold() {
    isOnHold = !isOnHold;
    applyHoldUI();
    notifyWave();
  }

  /* -----------------------------
   * INIT
   * ----------------------------- */
  if (pauseBtn && scrim && pauseIcon) {
    pauseBtn.addEventListener("click", toggleHold);

    // Initialize UI + notify waveform of initial state
    applyHoldUI();
    notifyWave();
  }
})();
