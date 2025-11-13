/* ============================================================
 * CANVAS SETUP
 * ============================================================ */

const canvas = document.getElementById("wave");
const ctx    = canvas.getContext("2d", { alpha: true });

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { clientWidth: w, clientHeight: h } = canvas;

  canvas.width  = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Let video layer respond to the same sizing
  if (typeof resizeVideo === "function") {
    resizeVideo();
  }
}

window.addEventListener("resize", resize);


/* ============================================================
 * PLATFORM DETECT
 * ============================================================ */

const isMobile =
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);


/* ============================================================
 * PROMPT ROUTING
 *  - PTT ON  => .actionbar-text
 *  - PTT OFF => #talkPrompt
 * ============================================================ */

const actionbarTextEl  = document.querySelector(".actionbar-text");
const talkPromptEl     = document.getElementById("talkPrompt");
const talkPromptTextEl = talkPromptEl?.querySelector("div");

// Global PTT state (true = ON = use actionbar-text)
window.isPTTOn = true;
let lastPTTState = window.isPTTOn; // track transitions

// Store the current prompt string so we can re-render when mode switches
window.currentPromptText = "";

// Renders the current prompt into the correct UI element
function renderPrompt() {
  if (!actionbarTextEl || !talkPromptEl || !talkPromptTextEl) return;

  let msg = window.currentPromptText || "";

  const idleMobile  = "Press and hold screen to talk";
  const idleDesktop = "Hold spacebar to talk";

  // --------------------------------------------
  // PTT OFF behavior:
  // - Never show the idle "hold to talk" prompts.
  // - Other messages (e.g. "Your mic is muted") still show.
  // --------------------------------------------
  if (!window.isPTTOn && (msg === idleMobile || msg === idleDesktop)) {
    msg = "";
  }

  if (window.isPTTOn) {
    // PTT ON → actionbar-text owns the prompt
    actionbarTextEl.textContent = msg;

    talkPromptTextEl.textContent = "";
    talkPromptEl.style.display = "none";
  } else {
    // PTT OFF → talkPrompt owns the prompt
    actionbarTextEl.textContent = "";
    actionbarTextEl.style.display = "none";

    talkPromptTextEl.textContent = msg;
    talkPromptEl.style.display = msg ? "block" : "none";
  }
}

/* Public helpers other scripts can call */
window.setPromptText = function (msg) {
  window.currentPromptText = msg || "";
  renderPrompt();
};

window.updatePromptMode = function () {
  // Called when PTT mode changes – just re-render the existing text
  renderPrompt();
};


/* ============================================================
 * AUDIO INPUT + ANALYSIS
 * ============================================================ */

let smoothedRMS = 0;
let band        = { low: 0, mid: 0, high: 0 };
let audioCtx    = null;
let analyser    = null;
let freqBuf     = null;
let timeBuf     = null;

const GAIN     = isMobile ? 14 : 1;
const RMS_MULT = isMobile ? 18 : 8;
const RMS_EXP  = isMobile ? 1.4 : 1.2;

// Idle / breathing
const IDLE_FLOOR   = isMobile ? 10 : 8;
const IDLE_SWAY_PX = isMobile ? 7 : 5;

async function initAudio(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  const src  = audioCtx.createMediaStreamSource(stream);
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

/* Main audio loop: updates RMS + band data */
function audioLoop() {
  if (!analyser) {
    requestAnimationFrame(audioLoop);
    return;
  }

  // --- Time-domain RMS ---
  analyser.getByteTimeDomainData(timeBuf);
  let sum = 0;
  for (let i = 0; i < timeBuf.length; i++) {
    const v = (timeBuf[i] - 128) / 128;
    sum += v * v;
  }
  let rawRMS = Math.sqrt(sum / timeBuf.length);

  // Gate tiny noise so idle really cools down
  if (rawRMS < 0.004) rawRMS = 0;

  // More sensitive curve for speech
  const scaled = Math.pow(rawRMS * RMS_MULT, RMS_EXP);

  const ATTACK  = 0.8;
  const RELEASE = 0.05;

  smoothedRMS = scaled > smoothedRMS
    ? smoothedRMS * (1 - ATTACK)  + scaled * ATTACK
    : smoothedRMS * (1 - RELEASE) + scaled * RELEASE;

  // --- Frequency bands (low / mid / high) ---
  analyser.getByteFrequencyData(freqBuf);
  const N   = freqBuf.length;
  const avg = (a, b) => {
    let c = 0;
    for (let i = a; i < b; i++) c += freqBuf[i];
    return c / Math.max(1, (b - a));
  };

  band.low  = avg(2, Math.floor(N * 0.12)) / 255;                    // ~80–500 Hz
  band.mid  = avg(Math.floor(N * 0.12), Math.floor(N * 0.35)) / 255; // ~500–2k
  band.high = avg(Math.floor(N * 0.35), Math.floor(N * 0.75)) / 255; // ~2k–8k

  requestAnimationFrame(audioLoop);
}


/* ============================================================
 * PERLIN NOISE HELPERS
 * ============================================================ */

function makeNoise(seed = Math.random()) {
  const grad = Array.from({ length: 256 }, () => Math.random() * 2 - 1);
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;

  return {
    get(x) {
      const X = (Math.floor(x + seed * 1e4)) & 255;
      const t = x - Math.floor(x);
      const g1 = grad[X];
      const g2 = grad[(X + 1) & 255];
      return lerp(g1 * t, g2 * (t - 1), fade(t));
    }
  };
}


/* ============================================================
 * COLOR HELPERS
 * ============================================================ */

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h, s;
  let l = (max + min) / 2;

  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, l };
}

function hslToRgba(h, s, l, a = 1) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60)      { r = c; g = x; }
  else if (h < 120){ r = x; g = c; }
  else if (h < 180){ g = c; b = x; }
  else if (h < 240){ g = x; b = c; }
  else if (h < 300){ r = c; b = x; }
  else             { r = x; b = c; }

  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);

  return `rgba(${R},${G},${B},${a})`;
}

/* warmed/cooled variant of a hex color based on engagement (0..1) */
function warmCool(hex, engagement) {
  const e = clamp01(engagement);
  const { h, s, l } = hexToHsl(hex);

  const hueShift = (-6) * (1 - e) + (10) * e; // cool at rest, warm when speaking
  const satBoost = s * (0.00 + 0.10 * e);     // up to +10% saturation with speech
  const lightAdj = (e > 0.2 ? 0.03 * e : -0.03 * (1 - e));

  const H = h + hueShift;
  const S = clamp01(s + satBoost);
  const L = clamp01(l + lightAdj);

  return { H, S, L };
}


/* ============================================================
 * WAVE LAYER CONFIG
 *  - Draw order is BACK → FRONT (array order)
 * ============================================================ */

const LAYER_CONFIG = [
  { id: "teal",     color: "#4A6D7C", alpha: 0.55, speed:  0.60, freq: 4.6, amp: 0.82, yOff: +10, band: "mid",  seed: 404 },
  { id: "rose",     color: "#D98C8C", alpha: 0.50, speed: -0.55, freq: 3.8, amp: 0.86, yOff:  +3, band: "high", seed: 303 },
  { id: "lavender", color: "#A98ACB", alpha: 0.50, speed:  0.38, freq: 3.0, amp: 0.90, yOff:  -3, band: "mid",  seed: 202 },
  // top
  { id: "blue",     color: "#3B6BBA", alpha: 0.45, speed: -0.28, freq: 2.2, amp: 1.00, yOff:  -8, band: "low",  seed: 101 }
].map(cfg => ({
  ...cfg,
  noise: makeNoise(cfg.seed),
  phase: Math.random() * 1000
}));


/* ============================================================
 * INTERACTION STATE
 * ============================================================ */

let isTalking         = false;
let hasStartedTalking = false;  // used to gate drawing until first PTT/open-mic
let isOnHold          = false;  // global hold state from pause.js
let fadeFactor        = 1;
const FADE_SPEED      = 0.05;

/* Speech engagement (0..1) */
let engage = 0;

/* Cooling / hold behavior after speech stops */
const HOLD_AFTER_SPEECH_MS = 280;
let lastActiveAt = performance.now();

/* Hysteresis gates for stable speech detection */
const RISE_GATE = 0.10;   // need this much to "start speaking"
const FALL_GATE = 0.06;   // go below this to be considered "not speaking"
let isActiveSpeech = false;


/* ============================================================
 * HOLD WIRING (API + EVENTS + DOM FALLBACK)
 * ============================================================ */

function setOnHold(state) {
  const next = !!state;
  if (isOnHold === next) return;

  isOnHold = next;

  // If entering hold, forcibly end PTT and hide the waveform & glow
  if (isOnHold) {
    if (isTalking) {
      stopTalking(new Event("hold"));
    }
    fadeFactor = 0; // snap hide the wave if it was up
  }
}

window.setOnHold = setOnHold; // allow pause.js to call

// Listen for custom hold events (from pause.js)
document.addEventListener("hold:change", (e) => {
  if (!e || !e.detail) return;
  setOnHold(!!e.detail.onHold);
});

// DOM fallbacks—sync if you already toggle these in your UI
const pauseBtn    = document.getElementById("pauseBtn");
const onHoldScrim = document.getElementById("onHoldScrim");

if (pauseBtn) {
  new MutationObserver(() => {
    if (pauseBtn.classList.contains("on-hold")) {
      setOnHold(true);
    }
  }).observe(pauseBtn, { attributes: true, attributeFilter: ["class"] });
}

if (onHoldScrim) {
  new MutationObserver(() => {
    const visible =
      getComputedStyle(onHoldScrim).display !== "none" &&
      onHoldScrim.style.display !== "none";

    if (visible) {
      setOnHold(true);
    }
  }).observe(onHoldScrim, { attributes: ["style"] });
}


/* ============================================================
 * KEYBOARD PTT (SPACEBAR)
 * ============================================================ */

["keydown", "keyup"].forEach((ev) => {
  window.addEventListener(ev, (e) => {
    if (e.code === "Space") {
      if (isOnHold) {
        e.preventDefault();
        return; // block PTT while on hold
      }

      // Only meaningful when PTT is ON
      if (!window.isPTTOn) {
        e.preventDefault();
        return;
      }

      isTalking = (ev === "keydown");
      if (isTalking) {
        hasStartedTalking = true;
      }

      e.preventDefault();
    }
  });
});

// Icon buttons (minus the mute button; it stays always visible)
const buttons = document.querySelectorAll(".icon-button:not(#muteBtn)");

// Initial prompt message
if (typeof window.setPromptText === "function") {
  window.setPromptText(
    isMobile ? "Press and hold screen to talk" : "Hold spacebar to talk"
  );
}


/* ============================================================
 * ACTIONBAR AUTO-HIDE + TOGGLE (PTT OFF MODE)
 * ============================================================ */

const actionbar = document.querySelector(".actionbar");
let actionbarVisible   = true;              // source of truth for visibility
let actionbarHideTimer = null;
const AUTO_HIDE_MS     = 7000;

// Check if any actionbar button is "selected"
function isAnyActionbarButtonActive() {
  const pause = document.getElementById("pauseBtn");
  const mute  = document.getElementById("muteBtn");
  const more  = document.getElementById("moreBtn");

  const pauseActive = pause && pause.classList.contains("on-hold");
  const muteActive  = mute && mute.classList.contains("muted");
  const moreActive  = more && more.classList.contains("more-open");

  return !!(pauseActive || muteActive || moreActive);
}

function applyActionbarVisibility() {
  if (!actionbar) return;
  actionbar.style.opacity       = actionbarVisible ? "1" : "0";
  actionbar.style.pointerEvents = actionbarVisible ? "auto" : "none";
}

// Schedules/cancels auto-hide based on current state
function scheduleAutoHide() {
  if (!actionbar) return;

  // Only auto-hide when:
  //  - PTT is OFF
  //  - no buttons are active
  if (window.isPTTOn || isAnyActionbarButtonActive()) {
    if (actionbarHideTimer) {
      clearTimeout(actionbarHideTimer);
      actionbarHideTimer = null;
    }
    // If we just turned PTT ON while hidden, bring the bar back
    if (window.isPTTOn && !actionbarVisible) {
      actionbarVisible = true;
      applyActionbarVisibility();
    }
    return;
  }

  // If there's already a timer running, don't restart it
  if (actionbarHideTimer) return;

  actionbarHideTimer = setTimeout(() => {
    // Re-check conditions at fire time
    if (!window.isPTTOn && !isAnyActionbarButtonActive() && actionbarVisible) {
      actionbarVisible = false;
      applyActionbarVisibility();
    }
    actionbarHideTimer = null;
  }, AUTO_HIDE_MS);
}

// Public helpers for other scripts (pause.js, mute.js, more.js)
window.refreshActionbarAutoHide = scheduleAutoHide;

window.showActionbar = function () {
  actionbarVisible = true;
  applyActionbarVisibility();
  scheduleAutoHide();
};

window.hideActionbar = function () {
  actionbarVisible = false;
  applyActionbarVisibility();
  if (actionbarHideTimer) {
    clearTimeout(actionbarHideTimer);
    actionbarHideTimer = null;
  }
};


/* ============================================================
 * DRAWING / WAVEFORM RENDERING
 * ============================================================ */

const CREST_ALPHA = 0.10;  // softer crest so colors aren’t lightened too much
const CREST_WIDTH = 1;

function fillLayer(layer, width, height, tMs, ampBase, alphaMul = 1) {
  const { color, alpha, noise, freq, amp, yOff } = layer;

  const noiseScale = freq / width; // peaks per width
  const idleLFO    = Math.sin(tMs * 0.00055 + layer.phase) * IDLE_SWAY_PX; // slow sway
  const baseY      = height * 0.75 + yOff - idleLFO;

  const bandBoost =
    layer.band === "low"  ? band.low  :
    layer.band === "mid"  ? band.mid  :
    band.high;

  // Amplitude combines: idle floor + global RMS + band emphasis
  const amplitude = (IDLE_FLOOR + ampBase * (0.65 + 0.9 * bandBoost)) * amp;

  ctx.beginPath();
  ctx.moveTo(0, height);

  const crest = [];

  for (let x = 0; x <= width; x++) {
    const n = noise.get((x * noiseScale) + layer.phase);
    const y = baseY - n * 0.5 * amplitude;

    if (x === 0) ctx.lineTo(0, y);
    else         ctx.lineTo(x, y);

    if ((x & 3) === 0) {
      crest.push({ x, y });
    }
  }

  ctx.lineTo(width, height);
  ctx.closePath();

  // --- Dynamic color & alpha (warm when speaking, cool/dimmer at rest)
  const warm         = warmCool(color, engage);
  const baseAlpha    = alpha * alphaMul;
  const dynamicAlpha = clamp01(baseAlpha * (0.8 + 0.35 * engage)); // dimmer at rest, brighter when speaking

  ctx.fillStyle = hslToRgba(warm.H, warm.S, warm.L, dynamicAlpha);
  ctx.fill();

  // Subtle crest for separation
  if (CREST_ALPHA > 0) {
    ctx.save();
    ctx.globalAlpha = CREST_ALPHA * alphaMul;
    ctx.lineWidth   = CREST_WIDTH;
    ctx.strokeStyle = hslToRgba(warm.H, warm.S, warm.L, 1);

    ctx.beginPath();
    for (let i = 0; i < crest.length; i++) {
      const p = crest[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else         ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

let lastTs = performance.now();

function draw(ts = performance.now()) {
  const dt = Math.min(32, ts - lastTs);
  lastTs   = ts;

  /* --- Detect PTT transitions to kick auto-hide on first OFF --- */
  if (window.isPTTOn !== lastPTTState) {
    // Just switched from ON → OFF
    if (!window.isPTTOn) {
      scheduleAutoHide();
    } else {
      // OFF → ON: ensure bar visible & cancel hide
      actionbarVisible = true;
      applyActionbarVisibility();
      if (actionbarHideTimer) {
        clearTimeout(actionbarHideTimer);
        actionbarHideTimer = null;
      }
    }
    lastPTTState = window.isPTTOn;
  }

  /* --- Engagement with hysteresis + delayed cool-down --- */
  const now          = ts;
  const targetEngage = Math.min(1, smoothedRMS * 1.4);
  const ENGAGE_ATTACK  = 0.25;
  const ENGAGE_RELEASE = 0.02;   // slower cool-down

  // Hysteresis for stable speech detection
  if (isActiveSpeech) {
    if (targetEngage < FALL_GATE) isActiveSpeech = false;
  } else {
    if (targetEngage > RISE_GATE) isActiveSpeech = true;
  }

  // Refresh "last active" timestamp when actively speaking
  if (isActiveSpeech) {
    lastActiveAt = now;
  }

  if (targetEngage > engage) {
    // Rising toward speech: quick attack
    engage = engage * (1 - ENGAGE_ATTACK) + targetEngage * ENGAGE_ATTACK;
  } else {
    // Falling: hold warmth for a bit after speech, then release slowly
    const silentForMs = now - lastActiveAt;
    if (silentForMs >= HOLD_AFTER_SPEECH_MS) {
      engage = engage * (1 - ENGAGE_RELEASE) + targetEngage * ENGAGE_RELEASE;
    }
  }

  /* --- Fade UI in/out under the waves depending on mode --- */
  if (isOnHold) {
    // On hold → always hide waveform & glow
    fadeFactor = 0;
  } else if (!window.isPTTOn) {
    // PTT OFF (open-mic) → waveform always on
    fadeFactor        = 1;
    hasStartedTalking = true; // ensure we draw even if user never pressed PTT
  } else {
    // PTT ON → original behavior (fade in while talking, fade out when idle)
    fadeFactor = isTalking
      ? Math.min(fadeFactor + FADE_SPEED, 1)
      : Math.max(fadeFactor - FADE_SPEED, 0);
  }

  /* --- Show/hide buttons --- */
  buttons.forEach((btn) => {
    if (window.isPTTOn) {
      // PTT ON → hide while wave is up
      btn.style.display = fadeFactor > 0 ? "none" : "flex";
    } else {
      // PTT OFF → always visible
      btn.style.display = "flex";
    }
  });

  // Only show actionbar text when PTT is ON; otherwise keep it hidden
  const actionbarText = document.querySelector(".actionbar-text");
  if (actionbarText) {
    if (window.isPTTOn) {
      actionbarText.style.display = fadeFactor > 0 ? "none" : "block";
    } else {
      actionbarText.style.display = "none";
    }
  }

  // Advance per-layer phase by speed (parallax + opposing motion)
  LAYER_CONFIG.forEach((l) => {
    l.phase += (l.speed * dt * 0.0015);
  });

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  /* --- Soft gold under-glow (when waveform is live) --- */
  ctx.save();

  const waveLive   = hasStartedTalking && !isOnHold && fadeFactor > 0;
  const glowActive = window.isPTTOn ? isTalking : true; // always on in PTT OFF (open-mic) mode

  if (waveLive && glowActive) {
    const glow = Math.min(0.20, 0.28 * engage) * fadeFactor;
    if (glow > 0.001) {
      const lg = ctx.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0.00, `rgba(255, 204, 153, 0)`);
      lg.addColorStop(0.55, `rgba(255, 204, 153, ${glow * 0.25})`);
      lg.addColorStop(1.00, `rgba(255, 204, 153, ${glow})`);
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  ctx.restore();

  // Global amplitude base from RMS; clamp for taste
  // speechBoost makes normal voice taller but leaves silence cooling down
  const speechBoost = isMobile ? 1.6 : 1.4;
  const ampBase     = Math.min(1.0, smoothedRMS * speechBoost) *
                      (isMobile ? 220 : 160);

  // Draw back → front with additive-like blend (only after first PTT / open-mic)
  if (hasStartedTalking && fadeFactor > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < LAYER_CONFIG.length; i++) {
      fillLayer(LAYER_CONFIG[i], w, h, ts, ampBase, fadeFactor);
    }
    ctx.restore();
  }

  requestAnimationFrame(draw);
}


/* ============================================================
 * TOUCH / POINTER PTT + ACTIONBAR TOGGLE (PTT OFF)
 * ============================================================ */

const touchTarget = document.getElementById("touchTarget");
const talkPrompt  = document.getElementById("talkPrompt");
const video       = document.getElementById("bgVideo");

if (talkPrompt) {
  talkPrompt.style.display = "none";
}

function startTalking(e) {
  // In open-mic mode (PTT OFF), use tap to toggle the actionbar
  if (!window.isPTTOn) {
    actionbarVisible = !actionbarVisible;
    applyActionbarVisibility();

    if (actionbarVisible) {
      // When shown again, (re)start auto-hide countdown
      scheduleAutoHide();
    } else {
      if (actionbarHideTimer) {
        clearTimeout(actionbarHideTimer);
        actionbarHideTimer = null;
      }
    }

    e.preventDefault();
    return;
  }

  // Normal PTT ON behavior
  if (isOnHold) {
    e.preventDefault();
    return; // block touch PTT during hold
  }

  isTalking         = true;
  hasStartedTalking = true; // show waveform only after first PTT

  // Only change prompts in PTT ON mode
  if (window.isPTTOn && typeof window.setPromptText === "function") {
    window.setPromptText("Release to send");
  }

  e.preventDefault();
}

function stopTalking(e) {
  // In open-mic mode, startTalking already handled the toggle
  if (!window.isPTTOn) {
    e.preventDefault();
    return;
  }

  isTalking = false;

  // Only change prompts in PTT ON mode
  if (window.isPTTOn && typeof window.setPromptText === "function") {
    window.setPromptText(
      isMobile ? "Press and hold screen to talk" : "Hold spacebar to talk"
    );
  }

  e.preventDefault();
}

// Pointer & Touch handlers
if (touchTarget) {
  touchTarget.addEventListener("pointerdown",  startTalking);
  touchTarget.addEventListener("pointerup",    stopTalking);
  touchTarget.addEventListener("pointercancel", stopTalking);

  touchTarget.addEventListener("touchstart",   startTalking, { passive: false });
  touchTarget.addEventListener("touchend",     stopTalking,  { passive: false });
  touchTarget.addEventListener("touchcancel",  stopTalking,  { passive: false });
}


/* ============================================================
 * MIC READY EVENT (BOOTSTRAP AUDIO + DRAWING)
 * ============================================================ */

document.addEventListener("mic:ready", async (e) => {
  const { stream } = e.detail;

  await initAudio(stream);
  resize();
  requestAnimationFrame(draw);
  audioLoop();

  if (video) {
    video.addEventListener("loadedmetadata", resizeVideo);
  }
});


/* ============================================================
 * REDUCED MOTION SUPPORT
 * ============================================================ */

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Keep reactive to audio, but stop drifting
  LAYER_CONFIG.forEach((l) => {
    l.speed = 0;
  });
}
