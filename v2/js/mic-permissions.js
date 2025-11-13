/* ============================================================
 * MICROPHONE PERMISSIONS + APP STARTUP FLOW
 *
 * Responsibilities:
 *  - Request microphone access
 *  - Switch from Start screen → Agent screen
 *  - Begin background video playback (best effort)
 *  - Emit a global "mic:ready" event with the audio stream
 *
 * Notes:
 *  - This module runs once at app start.
 *  - Mic cannot be re-initialized after success (guarded by micInitialized).
 *  - Includes mobile-friendly event bindings.
 * ============================================================ */

(() => {
  /* ------------------------------------------------------------
   * INTERNAL STATE
   * ------------------------------------------------------------ */
  let micInitialized = false;

  /* ------------------------------------------------------------
   * DOM ELEMENTS
   * ------------------------------------------------------------ */
  const startBtn     = document.getElementById("startBtn");
  const startScreen  = document.getElementById("startScreen");
  const agentScreen  = document.getElementById("agentScreen");
  const video        = document.getElementById("bgVideo");

  /* ------------------------------------------------------------
   * REQUEST MICROPHONE PERMISSION
   * ------------------------------------------------------------ */
  async function requestMic() {
    if (micInitialized) return; // Prevent re-initialization

    try {
      // Raw / unprocessed audio for best waveform accuracy
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };

      // Ask the browser for access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micInitialized = true;

      /* --------------------------------------------------------
       * TRANSITION UI: Start → Agent
       * -------------------------------------------------------- */
      if (startScreen) startScreen.style.display = "none";
      if (agentScreen) agentScreen.style.display = "block";

      /* --------------------------------------------------------
       * Attempt to autoplay the therapist video (muted/inline)
       * -------------------------------------------------------- */
      if (video) {
        video.muted = true;
        video.playsInline = true;
        try { 
          await video.play();
        } catch (_) {
          // Silently ignore autoplay restrictions
        }
      }

      /* --------------------------------------------------------
       * Tell the rest of the app the microphone is ready
       * -------------------------------------------------------- */
      document.dispatchEvent(
        new CustomEvent("mic:ready", { detail: { stream } })
      );

    } catch (err) {
      console.error("Mic access failed:", err);
      alert("Mic access is required to continue.");
    }
  }

  /* ------------------------------------------------------------
   * EVENT HOOKUP
   * ------------------------------------------------------------ */
  if (startBtn) {
    // Desktop and mobile friendly
    startBtn.addEventListener("click", requestMic);
    startBtn.addEventListener("touchend", requestMic);
  }
})();
