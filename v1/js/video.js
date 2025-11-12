// ---------- NEW: Video resize function with centering ----------
function resizeVideo() {
  if (!video || !video.videoWidth || !video.videoHeight) return;
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;

  const windowRatio = windowW / windowH;
  const videoRatio = videoW / videoH;

  if (videoRatio >= windowRatio) {
    // video is wider than window: fit height
    video.style.height = `${windowH}px`;
    video.style.width = 'auto';
  } else {
    // video narrower than window: fill screen (cover)
    video.style.width = '100vw';
    video.style.height = '100vh';
  }

  // center the video
  video.style.position = 'absolute';
  video.style.top = '50%';
  video.style.left = '50%';
  video.style.transform = 'translate(-50%, -50%)';
}