/* ============================================================
 * ON HOLD (PAUSE) BUTTON LOGIC
 *
 * Responsibilities:
 *  - Track "on hold" state
 *  - Dim background with a scrim
 *  - Toggle pause button visual state + icon
 *  - Update prompt ("On hold" vs idle copy)
 *  - Notify the waveform system about hold changes
 *
 * Notes:
 *  - Mutually exclusive with mute: turning hold ON will turn mute OFF.
 * ============================================================ */

(() => {
  const pauseBtn   = document.getElementById("pauseBtn");
  const scrim      = document.getElementById("onHoldScrim");
  const pauseIcon  = pauseBtn?.querySelector("img");

  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

  const actionbarTextEl = document.querySelector(".actionbar-text");
  const talkPromptEl    = document.getElementById("talkPrompt");
  const talkPromptText  = talkPromptEl?.querySelector("div");

  let isOnHold = false;

  /* ------------------------------------------------------------
   * Apply all visual changes for hold state
   * ------------------------------------------------------------ */
  function applyHoldUI() {
    // Body-level class for styling
    document.body.classList.toggle("on-hold", isOnHold);

    // Scrim visibility
    if (scrim) {
      scrim.style.display = isOnHold ? "block" : "none";
    }

    // Button state + icon swap
    if (pauseBtn) {
      pauseBtn.classList.toggle("on-hold", isOnHold);
      pauseBtn.setAttribute("aria-pressed", String(isOnHold));
    }
    if (pauseIcon) {
      pauseIcon.src = isOnHold
        ? "../icons/bold/play.svg"
        : "../icons/bold/pause.svg";
    }

    // Prompt text routing (delegated through the shared prompt system)
    if (typeof window.setPromptText === "function") {
      const msg = isOnHold
        ? "On hold"
        : (isMobile
            ? "Press and hold screen to talk"
            : "Hold spacebar to talk");
      window.setPromptText(msg);
    }
  }

  /* ------------------------------------------------------------
   * Inform the waveform / other systems that hold changed
   * ------------------------------------------------------------ */
  function notifyWave() {
    // Direct wave.js API (if present)
    if (typeof window.setOnHold === "function") {
      window.setOnHold(isOnHold);
    }

    // Broadcast event for any listeners
    document.dispatchEvent(
      new CustomEvent("hold:change", { detail: { onHold: isOnHold } })
    );
  }

  /* ------------------------------------------------------------
   * Public helper so other modules (e.g. mute.js) can set hold
   * ------------------------------------------------------------ */
  window.setHoldState = function (state) {
    const next = !!state;
    if (next === isOnHold) return;

    isOnHold = next;
    applyHoldUI();
    notifyWave();
  };

  /* ------------------------------------------------------------
   * Local toggle handler (click on pause button)
   * ------------------------------------------------------------ */
  function toggleHold() {
    const next = !isOnHold;

    // If we are turning HOLD ON, force MUTE OFF so they can't both be active
    if (next && typeof window.setMutedState === "function") {
      window.setMutedState(false);
    }

    window.setHoldState(next);
  }

  /* ------------------------------------------------------------
   * Initialization
   * ------------------------------------------------------------ */
  if (pauseBtn && scrim && pauseIcon) {
    pauseBtn.addEventListener("click", toggleHold);
    // Start in "not on hold" state
    window.setHoldState(false);
  }
})();
