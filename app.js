/* ---------- Canvas ---------- */
const canvas = document.getElementById("wave");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

window.addEventListener("resize", resize);

/* ---------- Mobile detection ---------- */
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/* ---------- Audio ---------- */
let micInitialized = false;
let smoothedRMS = 0;
let targetAmplitude = 0;

const BASE_AMPLITUDE = isMobile ? 20 : 12;
const MIN_WAVE = isMobile ? 15 : 10;
const RESPONSIVE_BOOST = isMobile ? 180 : 120;
const VOICE_Y_SHIFT = isMobile ? 30 : 20;

const RMS_MULTIPLIER = isMobile ? 12 : 5;
const RMS_EXPONENT = isMobile ? 1.4 : 1.2;

let audioCtx = null;
let analyser = null;
let buffer = null;

async function initAudio(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") await audioCtx.resume();

  const source = audioCtx.createMediaStreamSource(stream);
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = isMobile ? 14 : 1;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  buffer = new Uint8Array(analyser.frequencyBinCount);

  source.connect(gainNode);
  gainNode.connect(analyser);
}

/* ---------- Audio Loop ---------- */
function audioLoop() {
  if (!analyser || !buffer) {
    requestAnimationFrame(audioLoop);
    return;
  }

  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i] - 128) / 128;
    sum += v * v;
  }

  let rawRMS = Math.sqrt(sum / buffer.length);
  if (rawRMS < 0.005) rawRMS = 0;

  const scaledRMS = Math.pow(rawRMS * RMS_MULTIPLIER, RMS_EXPONENT);
  const ATTACK = 0.8, RELEASE = 0.05;

  if (scaledRMS > smoothedRMS) smoothedRMS = smoothedRMS * (1 - ATTACK) + scaledRMS * ATTACK;
  else smoothedRMS = smoothedRMS * (1 - RELEASE) + scaledRMS * RELEASE;

  targetAmplitude = MIN_WAVE + BASE_AMPLITUDE + smoothedRMS * RESPONSIVE_BOOST;

  requestAnimationFrame(audioLoop);
}

/* ---------- Wave ---------- */
const noise = {
  grad: Array.from({ length: 256 }, () => Math.random() * 2 - 1),
  fade: t => t * t * t * (t * (t * 6 - 15) + 10),
  lerp: (a, b, t) => a + (b - a) * t,
  get(x) {
    const X = Math.floor(x) & 255;
    const t2 = x - Math.floor(x);
    const g1 = this.grad[X], g2 = this.grad[X + 1];
    return this.lerp(g1 * t2, g2 * (t2 - 1), this.fade(t2));
  }
};

const speed = 0.004;
const layers = [
  { color: '#5A8696', alpha: 0.6, xShift: 0 },
  { color: '#CD568A', alpha: 0.6, xShift: 80 },
  { color: '#9E6FA8', alpha: 0.6, xShift: 160 },
  { color: '#0D4CAC', alpha: 0.7, xShift: 240 }
];

let t = 0;
let isTalking = false;
let fadeFactor = 1;
const FADE_SPEED = 0.05;

window.addEventListener("keydown", e => { if (e.code === "Space") isTalking = true; });
window.addEventListener("keyup", e => { if (e.code === "Space") isTalking = false; });

["touchstart", "touchend", "touchcancel"].forEach(evt => {
  document.body.addEventListener(evt, e => {
    if (evt === "touchstart") { e.preventDefault(); isTalking = true; }
    else { e.preventDefault(); isTalking = false; }
  }, { passive: false });
});

function drawWave(layer, width, height, alphaMultiplier = 1) {
  ctx.beginPath();
  ctx.moveTo(0, height);
  const noiseScale = 2 / width;
  const dynamicOffset = smoothedRMS * VOICE_Y_SHIFT;
  const baseY = height * 0.75 - dynamicOffset;

  for (let x = 0; x < width; x++) {
    const n = noise.get((x + layer.xShift) * noiseScale + t * speed);
    const normalized = n * 0.5;
    const y = baseY - normalized * targetAmplitude;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(width, height);
  ctx.closePath();

  const r = parseInt(layer.color.slice(1, 3), 16);
  const g = parseInt(layer.color.slice(3, 5), 16);
  const b = parseInt(layer.color.slice(5, 7), 16);
  ctx.fillStyle = `rgba(${r},${g},${b},${layer.alpha * alphaMultiplier})`;
  ctx.fill();
}

const buttons = document.querySelectorAll(".icon-button");

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  fadeFactor = isTalking ? Math.min(fadeFactor + FADE_SPEED, 1) : Math.max(fadeFactor - FADE_SPEED, 0);
  buttons.forEach(btn => { btn.style.display = fadeFactor > 0 ? "none" : "flex"; });
  if (fadeFactor > 0) layers.forEach(layer => drawWave(layer, canvas.width, canvas.height, fadeFactor));

  t += 1;
  requestAnimationFrame(draw);
}

/* ---------- Start Button ---------- */
document.getElementById("startBtn").addEventListener("click", async () => {
  if (micInitialized) return;

  try {
    // Directly call getUserMedia inside gesture
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });

    micInitialized = true;
    await initAudio(stream);

    document.getElementById("startScreen").style.display = "none";
    document.getElementById("agentScreen").style.display = "block";

    const video = document.getElementById("bgVideo");
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => {});

    resize();
    draw();
    audioLoop();

  } catch (err) {
    console.error("Mic permission failed:", err);
    alert("Mic access is required to continue.");
  }
});