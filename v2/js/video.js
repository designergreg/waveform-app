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

function resizeVideo() {
  // Guard: make sure the video element is ready and has metadata
  if (!video || !video.videoWidth || !video.videoHeight) return;

  const windowW = window.innerWidth;
  const windowH = window.innerHeight;
  const videoW  = video.videoWidth;
  const videoH  = video.videoHeight;

  const windowRatio = windowW / windowH;
  const videoRatio  = videoW  / videoH;

  if (videoRatio >= windowRatio) {
    // Video is wider (relative to height) than the viewport:
    //   → fit height, let width overflow horizontally
    video.style.height = `${windowH}px`;
    video.style.width  = "auto";
  } else {
    // Video is taller/narrower than the viewport:
    //   → cover full viewport both directions
    video.style.width  = "100vw";
    video.style.height = "100vh";
  }

  // Center the video in the viewport
  video.style.position  = "absolute";
  video.style.top       = "50%";
  video.style.left      = "50%";
  video.style.transform = "translate(-50%, -50%)";
}
