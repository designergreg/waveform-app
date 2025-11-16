// js/panel.js
(() => {
  const panelEl = document.getElementById("audioPanel");
  if (!panelEl) return;

  const closeBtn = panelEl.querySelector(".audio-panel__close-btn");

  // Pull width from CSS variable so JS and CSS stay in sync
  const rootStyles = getComputedStyle(document.documentElement);
  const cssWidth = parseFloat(rootStyles.getPropertyValue("--audio-panel-width")) || 448;
  window.AUDIO_PANEL_WIDTH = cssWidth;

  function setPanelOpen(isOpen) {
    window.isAudioPanelOpen = isOpen;

    // Enable smooth video transitions once the panel is actually used
    if (!document.body.classList.contains("panel-animate")) {
        document.body.classList.add("panel-animate");
    }

    panelEl.classList.toggle("open", isOpen);
    document.body.classList.toggle("panel-open", isOpen);

    // Recompute video layout when panel changes
    if (typeof window.resizeVideo === "function") {
        window.resizeVideo();
    }
  }


  // Expose helpers for other scripts (more.js)
  window.openAudioPanel = () => setPanelOpen(true);
  window.closeAudioPanel = () => setPanelOpen(false);

  if (closeBtn) {
    closeBtn.addEventListener("click", () => setPanelOpen(false));
  }
})();
