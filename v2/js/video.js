/* ============================================================
 * BACKGROUND VIDEO RESIZE & CENTERING
 *
 * Assumes a global `video` element exists, e.g.:
 *   const video = document.getElementById("bgVideo");
 *
 * Goal:
 * - Keep the video covering the viewport (like background-size: cover)
 * - Preserve aspect ratio
 * - Center the video in the window
 * ============================================================ */

const video = document.getElementById("bgVideo");
let hasInitializedVideoLayout = false;
let hasEnabledVideoTransition = false;

function resizeVideo() {
  if (!video || !video.videoWidth || !video.videoHeight) return;

  const panelOpen  = !!window.isAudioPanelOpen;
  const panelWidth = panelOpen ? (window.AUDIO_PANEL_WIDTH || 448) : 0;

  const fullWindowW = window.innerWidth;
  const viewportW   = fullWindowW - panelWidth;  // visible "video area"
  const viewportH   = window.innerHeight;
  const videoW      = video.videoWidth;
  const videoH      = video.videoHeight;

  const viewportRatio = viewportW / viewportH;
  const videoRatio    = videoW / videoH;

  // First layout: absolutely no transitions
  if (!hasInitializedVideoLayout) {
    video.style.transition = "none";
  }

  if (videoRatio >= viewportRatio) {
    // Video is wider than viewport: fit height, let width overflow
    video.style.height = `${viewportH}px`;
    video.style.width  = "auto";
  } else {
    // Video is taller/narrower: cover both directions
    video.style.width  = `${viewportW}px`;
    video.style.height = "auto";
  }

  // Center video in the visible video area
  const centerX = viewportW / 2; // from left edge of window
  video.style.position  = "absolute";
  video.style.top       = "50%";
  video.style.left      = `${centerX}px`;
  video.style.transform = "translate(-50%, -50%)";

  // After the first paint, enable transitions for future changes only
  if (!hasInitializedVideoLayout) {
    hasInitializedVideoLayout = true;

    requestAnimationFrame(() => {
      if (hasEnabledVideoTransition) return;
      hasEnabledVideoTransition = true;

      video.style.transition = "";              // clear inline "none"
      document.body.classList.add("video-animatable");
    });
  }
}

// Whatever you already had that wires this up:
window.addEventListener("resize", resizeVideo);
if (video) {
  video.addEventListener("loadedmetadata", resizeVideo);
}

