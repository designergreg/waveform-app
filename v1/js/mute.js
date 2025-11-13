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
 *  - Reuses the .on-hold button background style for selected state
 *  - Does NOT use a scrim (unlike Pause)
 * ============================================================ */

(() => {
  const muteBtn    = document.getElementById("muteBtn");
  const waveCanvas = document.getElementById("wave");

  // If we don't have the essentials, bail out quietly
  if (!muteBtn || !waveCanvas || typeof window.setPromptText !== "function") {
    return;
  }

  const muteIcon = muteBtn.querySelector("img");
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

  window.setPromptText = function (msg) {
    const text = msg || "";

    // Track what the rest of the app *wants* the prompt to be
    if (text && text !== "Your mic is muted") {
      lastRequestedPrompt = text;
    }

    // Decide what we actually show based on mute state
    applyPromptFromState();
  };

  /* ------------------------------------------------------------
   * VISUAL + STATE UPDATE
   * ------------------------------------------------------------ */
  function applyMuteUI() {
    // Global flag others can read if needed
    window.isMicMuted = isMuted;

    // Button “selected” background (reuse .on-hold style)
    muteBtn.classList.toggle("on-hold", isMuted);
    muteBtn.setAttribute("aria-pressed", String(isMuted));

    // Swap icon
    if (muteIcon) {
      muteIcon.src = isMuted
        ? "../icons/bold/live_mic_slash.svg"
        : "../icons/linear/live_mic.svg";
    }

    // Hide/show waveform + glow (both rendered into this canvas)
    waveCanvas.style.visibility = isMuted ? "hidden" : "visible";

    // Ensure prompt text matches current mute state
    applyPromptFromState();
  }

  function toggleMute() {
    isMuted = !isMuted;
    applyMuteUI();
  }

  /* ------------------------------------------------------------
   * EVENT HOOKUP
   * ------------------------------------------------------------ */
  muteBtn.addEventListener("click", toggleMute);
})();
