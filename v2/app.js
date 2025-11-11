/* ---------- Canvas ---------- */
const canvas = document.getElementById("wave");
const ctx = canvas.getContext("2d");
function resize() { 
  canvas.width = canvas.clientWidth; 
  canvas.height = canvas.clientHeight; 
  resizeVideo(); // <-- update video size on window resize
}
window.addEventListener("resize", resize);

/* ---------- Mobile detection ---------- */
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/* ---------- Audio ---------- */
let micInitialized = false, smoothedRMS = 0, targetAmplitude = 0;
const BASE_AMPLITUDE = isMobile ? 25 : 18,
      MIN_WAVE = isMobile ? 25 : 18,
      RESPONSIVE_BOOST = isMobile ? 180 : 120,
      VOICE_Y_SHIFT = isMobile ? 30 : 20;
const RMS_MULTIPLIER = isMobile ? 12 : 5,
      RMS_EXPONENT = isMobile ? 1.4 : 1.2;

let audioCtx = null, analyser = null, buffer = null;

async function initAudio(stream){
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state==="suspended") await audioCtx.resume();

  const source = audioCtx.createMediaStreamSource(stream);
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = isMobile?14:1;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  buffer = new Uint8Array(analyser.frequencyBinCount);

  source.connect(gainNode);
  gainNode.connect(analyser);
}

/* ---------- Audio Loop ---------- */
function audioLoop(){
  if(!analyser||!buffer){requestAnimationFrame(audioLoop);return;}
  analyser.getByteTimeDomainData(buffer);
  let sum=0;
  for(let i=0;i<buffer.length;i++){const v=(buffer[i]-128)/128;sum+=v*v;}
  let rawRMS = Math.sqrt(sum/buffer.length);
  if(rawRMS<0.005) rawRMS=0;
  const scaledRMS = Math.pow(rawRMS*RMS_MULTIPLIER,RMS_EXPONENT);
  const ATTACK=0.8, RELEASE=0.05;
  smoothedRMS = scaledRMS>smoothedRMS ? smoothedRMS*(1-ATTACK)+scaledRMS*ATTACK : smoothedRMS*(1-RELEASE)+scaledRMS*RELEASE;
  targetAmplitude = MIN_WAVE + BASE_AMPLITUDE + smoothedRMS * RESPONSIVE_BOOST;
  requestAnimationFrame(audioLoop);
}

/* ---------- Perlin noise & Wave ---------- */
const noise={grad:Array.from({length:256},()=>Math.random()*2-1),fade:t=>t*t*t*(t*(t*6-15)+10),lerp:(a,b,t)=>a+(b-a)*t,get(x){const X=Math.floor(x)&255;const t=x-Math.floor(x);const g1=this.grad[X],g2=this.grad[X+1];return this.lerp(g1*t,g2*(t-1),this.fade(t));}};
const layers=[
  {color:'#5A8696',alpha:0.6,xShift:0},{color:'#CD568A',alpha:0.6,xShift:80},
  {color:'#9E6FA8',alpha:0.6,xShift:160},{color:'#0D4CAC',alpha:0.7,xShift:240}
];
let t=0,isTalking=false,fadeFactor=1,FADE_SPEED=0.05;

// Keyboard handling (desktop)
["keydown","keyup"].forEach(ev=>{
  window.addEventListener(ev,e=>{
    if(e.code === "Space") {
      isTalking = (ev === "keydown");
      if(talkPrompt) {
        talkPrompt.querySelector("div").textContent = isTalking
          ? "Release to send"
          : "Press and hold screen to talk";
      }
      e.preventDefault(); // prevent scrolling when pressing space
    }
  });
});

const peaks = 3;

function drawWave(layer,width,height,alphaMultiplier=1){
  ctx.beginPath(); ctx.moveTo(0,height);
  const noiseScale=peaks/width, dynamicOffset=smoothedRMS*VOICE_Y_SHIFT, baseY=height*0.75-dynamicOffset;
  for(let x=0;x<width;x++){
    const n=noise.get((x+layer.xShift)*noiseScale+t*0.004);
    ctx.lineTo(x, baseY - n*0.5*targetAmplitude);
  }
  ctx.lineTo(width,height); ctx.closePath();
  const r=parseInt(layer.color.slice(1,3),16), g=parseInt(layer.color.slice(3,5),16), b=parseInt(layer.color.slice(5,7),16);
  ctx.fillStyle=`rgba(${r},${g},${b},${layer.alpha*alphaMultiplier})`;
  ctx.fill();
}

const buttons = document.querySelectorAll(".icon-button");
const actionbarText = document.querySelector(".actionbar-text");

// ---------- NEW: set initial actionbar text based on platform ----------
if (actionbarText) {
  actionbarText.textContent = isMobile
    ? "Press and hold screen to talk"
    : "Hold spacebar to talk";
}

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

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  fadeFactor = isTalking ? Math.min(fadeFactor+FADE_SPEED,1) : Math.max(fadeFactor-FADE_SPEED,0);
  buttons.forEach(btn=>{btn.style.display=fadeFactor>0?"none":"flex";});

  // hide actionbar text when waveform is visible
  if (actionbarText) {
    actionbarText.style.display = fadeFactor > 0 ? "none" : "block";
  }

  if(fadeFactor>0) layers.forEach(layer=>drawWave(layer,canvas.width,canvas.height,fadeFactor));
  t+=1; requestAnimationFrame(draw);
}

/* ---------- Start Button ---------- */
const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const agentScreen = document.getElementById("agentScreen");
const video = document.getElementById("bgVideo");
const touchTarget = document.getElementById("touchTarget");
const talkPrompt = document.getElementById("talkPrompt");

function startConvo() {
  if(micInitialized) return;
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})
    .then(async stream=>{
      micInitialized=true;
      await initAudio(stream);
      startScreen.style.display="none";
      agentScreen.style.display="block";

      video.muted=true; video.playsInline=true;
      await video.play().catch(()=>{});

      resize(); draw(); audioLoop();

      // resize video when metadata is ready
      video.addEventListener('loadedmetadata', resizeVideo);
    })
    .catch(err=>{
      console.error("Mic access failed:",err);
      alert("Mic access is required to continue.");
    });
}

// Start button events
startBtn.addEventListener("click", startConvo);
startBtn.addEventListener("touchend", startConvo);

/* ---------- Touch Target Press & Hold ---------- */
function startTalking(e){
  isTalking = true;
  if(talkPrompt) talkPrompt.querySelector("div").textContent = "Release to send";
  if (actionbarText) {
    actionbarText.textContent = isMobile
      ? "Release to send"
      : "Release spacebar to send";
  }
  e.preventDefault();
}
function stopTalking(e){
  isTalking = false;
  if(talkPrompt) talkPrompt.querySelector("div").textContent = "Press and hold screen to talk";
  if (actionbarText) {
    actionbarText.textContent = isMobile
      ? "Press and hold screen to talk"
      : "Hold spacebar to talk";
  }
  e.preventDefault();
}

// Pointer events (desktop)
touchTarget.addEventListener("pointerdown", startTalking);
touchTarget.addEventListener("pointerup", stopTalking);
touchTarget.addEventListener("pointercancel", stopTalking);

// Touch events (mobile)
touchTarget.addEventListener("touchstart", startTalking, {passive:false});
touchTarget.addEventListener("touchend", stopTalking, {passive:false});
touchTarget.addEventListener("touchcancel", stopTalking, {passive:false});

/* ---------- On Hold ---------- */
const pauseBtn = document.getElementById("pauseBtn");
const scrim = document.getElementById("onHoldScrim");
const pauseIcon = pauseBtn.querySelector("img");

let isOnHold = false;

pauseBtn.addEventListener("click", () => {
  isOnHold = !isOnHold;

  if (isOnHold) {
    // Enter On Hold
    scrim.style.display = "block";
    pauseBtn.classList.add("on-hold");
    pauseIcon.src = "../icons/bold/play.svg";   // ✅ swap to play icon
    talkPrompt.querySelector("div").textContent = "On hold";
  } else {
    // Exit On Hold
    scrim.style.display = "none";
    pauseBtn.classList.remove("on-hold");
    pauseIcon.src = "../icons/linear/pause.svg"; // ✅ swap back to pause icon
    talkPrompt.querySelector("div").textContent =
      isMobile ? "Press and hold screen to talk" : "Hold spacebar to talk";
  }
});