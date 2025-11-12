// js/mic-permissions.js
(() => {
  let micInitialized = false;

  // Elements only this module needs to care about
  const startBtn     = document.getElementById("startBtn");
  const startScreen  = document.getElementById("startScreen");
  const agentScreen  = document.getElementById("agentScreen");
  const video        = document.getElementById("bgVideo");

  async function requestMic() {
    if (micInitialized) return;

    try {
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micInitialized = true;

      // Swap screens
      if (startScreen) startScreen.style.display = "none";
      if (agentScreen) agentScreen.style.display = "block";

      // Best-effort video start (kept here since it’s tied to the “start” UX)
      if (video) {
        video.muted = true;
        video.playsInline = true;
        try { await video.play(); } catch (_) {}
      }

      // Tell the rest of the app that the microphone is ready
      document.dispatchEvent(new CustomEvent("mic:ready", { detail: { stream } }));
    } catch (err) {
      console.error("Mic access failed:", err);
      alert("Mic access is required to continue.");
    }
  }

  // Hook up the “Start Conversation” button
  if (startBtn) {
    startBtn.addEventListener("click", requestMic);
    startBtn.addEventListener("touchend", requestMic);
  }
})();
