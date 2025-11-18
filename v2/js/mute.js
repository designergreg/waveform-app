/* ============================================================
 * MUTE BUTTON LOGIC
 *
 * Responsibilities:
 *  - Track mic mute state
 *  - Toggle mute button visual state + icon
 *  - Control the prompt ("Your mic is muted")
 *  - Hide/show waveform + glow while muted
 *
 * Notes:
 *  - Default: muted = false
 *  - Mutually exclusive with hold: turning mute ON will turn hold OFF.
 *  - Does NOT use a scrim (unlike Pause).
 * ============================================================ */

(() => {
  const muteBtn    = document.getElementById("muteBtn");
  const waveCanvas = document.getElementById("wave");

  // If we don’t have the essentials, bail out quietly
  if (!muteBtn || !waveCanvas || typeof window.setPromptText !== "function") {
    return;
  }

  const muteIcon = muteBtn.querySelector("img");

  // Capture the original setPromptText so we can wrap it
  const originalSetPromptText = window.setPromptText;

  // Internal + global mute state
  let isMuted = false;
  window.isMicMuted = false; // optional global flag for other modules

  // Store the last non-muted prompt so we can restore it when unmuting
  let lastRequestedPrompt = "";

  /* ------------------------------------------------------------
   * PROMPT WRAPPER
   * Intercepts prompt changes so that while muted,
   * the UI always shows "Your mic is muted".
   * ------------------------------------------------------------ */
  function applyPromptFromState() {
    if (isMuted) {
      originalSetPromptText("Your mic is muted");
    } else {
      originalSetPromptText(lastRequestedPrompt || "");
    }
  }

  // Wrap the shared prompt setter
  window.setPromptText = function (msg) {
    const text = msg || "";

    // Track whatever the app *wants* to show, unless it's our own mute text
    if (text && text !== "Your mic is muted") {
      lastRequestedPrompt = text;
    }

    applyPromptFromState();
  };

  /* ------------------------------------------------------------
   * Apply all visual + behavioral changes for mute state
   * ------------------------------------------------------------ */
  function applyMuteUI() {
    window.isMicMuted = isMuted;

    // Button “selected” background (reuse .on-hold style)
    muteBtn.classList.toggle("muted",  isMuted);
    muteBtn.setAttribute("aria-pressed", String(isMuted));

    // Swap icon
    if (muteIcon) {
      muteIcon.src = isMuted
        ? "../icons/bold/live_mic_slash.svg"
        : "../icons/bold/live_mic.svg";
    }

    // Hide/show waveform + glow (both rendered into the same canvas)
    waveCanvas.style.visibility = isMuted ? "hidden" : "visible";

    // Ensure prompt text matches current mute state
    applyPromptFromState();
  }

  /* ------------------------------------------------------------
   * Public helper so other modules (e.g. pause.js) can set mute
   * ------------------------------------------------------------ */
  window.setMutedState = function (state) {
    const next = !!state;
    if (next === isMuted) return;

    isMuted = next;
    applyMuteUI();
  };

  /* ------------------------------------------------------------
   * Local toggle handler (click on mute button)
   * ------------------------------------------------------------ */
  function toggleMute() {
    const next = !isMuted;

    // If we are turning MUTE ON, force HOLD OFF so they can't both be active
    if (next && typeof window.setHoldState === "function") {
      window.setHoldState(false);
    }

    window.setMutedState(next);
  }

  /* ------------------------------------------------------------
   * Event hookup
   * ------------------------------------------------------------ */
  muteBtn.addEventListener("click", toggleMute);
})();
