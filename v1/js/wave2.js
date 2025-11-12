/* ---------- Canvas ---------- */
const canvas = document.getElementById("wave");
const ctx = canvas.getContext("2d", { alpha: true });

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { clientWidth: w, clientHeight: h } = canvas;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (typeof resizeVideo === "function") resizeVideo();
}
window.addEventListener("resize", resize);

/* ---------- Platform detect ---------- */
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/* ---------- Audio ---------- */
let smoothedRMS = 0;
let band = { low: 0, mid: 0, high: 0 };
let audioCtx = null, analyser = null, freqBuf = null, timeBuf = null;

const GAIN = isMobile ? 14 : 1;
const RMS_MULT = isMobile ? 12 : 5;
const RMS_EXP  = isMobile ? 1.4 : 1.2;

// Idle/breathing
const IDLE_FLOOR = isMobile ? 10 : 8;
const IDLE_SWAY_PX = isMobile ? 7 : 5;

async function initAudio(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") await audioCtx.resume();

  const src = audioCtx.createMediaStreamSource(stream);
  const gain = audioCtx.createGain();
  gain.gain.value = GAIN;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.75;

  timeBuf = new Uint8Array(analyser.fftSize);
  freqBuf = new Uint8Array(analyser.frequencyBinCount);

  src.connect(gain);
  gain.connect(analyser);
}

function audioLoop() {
  if (!analyser) { requestAnimationFrame(audioLoop); return; }

  analyser.getByteTimeDomainData(timeBuf);
  let sum = 0;
  for (let i = 0; i < timeBuf.length; i++) {
    const v = (timeBuf[i] - 128) / 128;
    sum += v * v;
  }
  let rawRMS = Math.sqrt(sum / timeBuf.length);
  if (rawRMS < 0.004) rawRMS = 0;

  const scaled = Math.pow(rawRMS * RMS_MULT, RMS_EXP);
  const ATTACK = 0.8, RELEASE = 0.05;
  smoothedRMS = scaled > smoothedRMS
    ? smoothedRMS * (1 - ATTACK)  + scaled * ATTACK
    : smoothedRMS * (1 - RELEASE) + scaled * RELEASE;

  analyser.getByteFrequencyData(freqBuf);
  const N = freqBuf.length;
  const avg = (a, b) => { let c = 0; for (let i = a; i < b; i++) c += freqBuf[i]; return c / Math.max(1,(b-a)); };
  band.low  = avg(2, Math.floor(N*0.12)) / 255;
  band.mid  = avg(Math.floor(N*0.12), Math.floor(N*0.35)) / 255;
  band.high = avg(Math.floor(N*0.35), Math.floor(N*0.75)) / 255;

  requestAnimationFrame(audioLoop);
}

/* ---------- Perlin ---------- */
function makeNoise(seed = Math.random()) {
  const grad = Array.from({ length: 256 }, () => Math.random() * 2 - 1);
  const fade = t => t*t*t*(t*(t*6-15)+10);
  const lerp = (a,b,t) => a + (b-a)*t;
  return {
    get(x) {
      const X = (Math.floor(x + seed*1e4)) & 255;
      const t = x - Math.floor(x);
      const g1 = grad[X], g2 = grad[(X+1) & 255];
      return lerp(g1*t, g2*(t-1), fade(t));
    }
  };
}

/*
  Order bottom → top for the main fill pass.
  Blend modes per layer (set during draw):
    teal  = source-over
    magenta = multiply
    purple = soft-light
    blue fill = screen
    blue ridge = source-over stroke
*/
const LAYER_CONFIG = [
  { id:'teal',    color:'#5A8696', alpha:0.50, speed: 0.60, freq:4.6, amp:0.82, yOff:+10, band:'mid',  seed:404 },
  { id:'magenta', color:'#CD568A', alpha:0.55, speed:-0.55, freq:3.8, amp:0.86, yOff: +3, band:'high', seed:303 },
  { id:'purple',  color:'#9E6FA8', alpha:0.50, speed: 0.38, freq:3.0, amp:0.90, yOff: -3, band:'mid',  seed:202 },
  { id:'blue',    color:'#0D4CAC', alpha:0.40, speed:-0.28, freq:2.2, amp:1.00, yOff: -8, band:'low',  seed:101 }
].map(cfg => ({ ...cfg, noise: makeNoise(cfg.seed), phase: Math.random()*1000 }));

/* ---------- Interaction ---------- */
let isTalking = false;
let fadeFactor = 1;
const FADE_SPEED = 0.05;

["keydown","keyup"].forEach(ev=>{
  window.addEventListener(ev, e=>{
    if (e.code === "Space") { isTalking = (ev === "keydown"); e.preventDefault(); }
  });
});

const buttons = document.querySelectorAll(".icon-button");
const actionbarText = document.querySelector(".actionbar-text");
if (actionbarText) actionbarText.textContent = isMobile ? "Press and hold screen to talk" : "Hold spacebar to talk";

/* ---------- Geometry helpers ---------- */
function pathForLayer(layer, width, height, tMs, ampBase) {
  const { noise, freq, amp, yOff, phase } = layer;
  const noiseScale = freq / width;
  const idleLFO = Math.sin(tMs * 0.00055 + phase) * IDLE_SWAY_PX;
  const baseY = height * 0.75 + yOff - idleLFO;

  const bandBoost = layer.band==='low'?band.low: layer.band==='mid'?band.mid: band.high;
  const amplitude = (IDLE_FLOOR + ampBase * (0.65 + 0.9 * bandBoost)) * amp;

  const pts = [];
  for (let x=0; x<=width; x++){
    const n = noise.get((x*noiseScale)+layer.phase);
    const y = baseY - n*0.5*amplitude;
    pts.push({x,y});
  }
  return pts;
}

function fillFromPoints(color, alpha, width, height, points) {
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(points[0].x, points[0].y);
  for (let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.lineTo(width, height);
  ctx.closePath();

  const r=parseInt(color.slice(1,3),16), g=parseInt(color.slice(3,5),16), b=parseInt(color.slice(5,7),16);
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fill();
}

/* ---------- Drawing ---------- */
const BLUE_RIDGE_ALPHA = 0.32;
const BLUE_RIDGE_WIDTH = 2;

let lastTs = performance.now();
function draw(ts = performance.now()){
  const dt = Math.min(32, ts - lastTs); lastTs = ts;

  fadeFactor = isTalking ? Math.min(fadeFactor+FADE_SPEED,1) : Math.max(fadeFactor-FADE_SPEED,0);
  buttons.forEach(btn => btn.style.display = fadeFactor>0 ? "none" : "flex");
  if (actionbarText) actionbarText.style.display = fadeFactor>0 ? "none" : "block";

  LAYER_CONFIG.forEach(l => l.phase += (l.speed * dt * 0.0015));

  ctx.clearRect(0,0,canvas.width,canvas.height);

  const ampBase = Math.min(1.0, smoothedRMS) * (isMobile ? 180 : 120);
  const w = canvas.clientWidth, h = canvas.clientHeight;

  if (fadeFactor > 0) {
    // Precompute paths
    const paths = LAYER_CONFIG.map(l => pathForLayer(l, w, h, ts, ampBase));

    // Layer 1: teal (base) — normal
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    fillFromPoints('#5A8696', LAYER_CONFIG[0].alpha * fadeFactor, w, h, paths[0]);
    ctx.restore();

    // Layer 2: magenta — multiply (deepen; kills pastel pink)
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    fillFromPoints('#CD568A', LAYER_CONFIG[1].alpha * fadeFactor, w, h, paths[1]);
    ctx.restore();

    // Layer 3: purple — soft-light (adds body without washing)
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    fillFromPoints('#9E6FA8', LAYER_CONFIG[2].alpha * fadeFactor, w, h, paths[2]);
    ctx.restore();

    // Layer 4: blue fill — screen (keeps it luminous but not opaque)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    fillFromPoints('#0D4CAC', LAYER_CONFIG[3].alpha * fadeFactor, w, h, paths[3]);
    ctx.restore();

    // Blue ridge: thin normal stroke to assert top edge
    const bluePts = paths[3];
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    for (let i=0;i<bluePts.length;i++){
      const p=bluePts[i];
      if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle = `rgba(13,76,172,${BLUE_RIDGE_ALPHA * fadeFactor})`;
    ctx.lineWidth = BLUE_RIDGE_WIDTH;
    ctx.stroke();
    ctx.restore();
  }

  requestAnimationFrame(draw);
}

/* ---------- Talk Interaction ---------- */
const touchTarget = document.getElementById("touchTarget");
const talkPrompt = document.getElementById("talkPrompt");
const video = document.getElementById("bgVideo");
if (talkPrompt) talkPrompt.style.display = "none";

function startTalking(e){ isTalking = true; if (actionbarText) actionbarText.textContent = "Release to send"; e.preventDefault(); }
function stopTalking(e){ isTalking = false; if (actionbarText) actionbarText.textContent = isMobile ? "Press and hold screen to talk" : "Hold spacebar to talk"; e.preventDefault(); }

if (touchTarget){
  touchTarget.addEventListener("pointerdown", startTalking);
  touchTarget.addEventListener("pointerup", stopTalking);
  touchTarget.addEventListener("pointercancel", stopTalking);
  touchTarget.addEventListener("touchstart", startTalking, {passive:false});
  touchTarget.addEventListener("touchend", stopTalking, {passive:false});
  touchTarget.addEventListener("touchcancel", stopTalking, {passive:false});
}

/* ---------- Mic Ready ---------- */
document.addEventListener("mic:ready", async (e) => {
  const { stream } = e.detail;
  await initAudio(stream);
  resize();
  requestAnimationFrame(draw);
  audioLoop();
  if (video) video.addEventListener("loadedmetadata", resizeVideo);
});

/* ---------- Reduced motion ---------- */
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  LAYER_CONFIG.forEach(l => l.speed = 0);
}
