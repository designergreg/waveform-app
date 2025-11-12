// ptt.js — handles all press-to-talk interactions and updates prompt text
import { isMobile, talkPrompt, actionbarText, touchTarget, setTalking } from "./app.js";

/* ---------- Keyboard handling (desktop) ----------
   This reproduces your original behavior:
   - Space keydown => press (isTalking true)
   - Space keyup   => release (isTalking false)
   - updates the talkPrompt and actionbarText exactly like original
*/
["keydown","keyup"].forEach(ev=>{
  window.addEventListener(ev, e=>{
    if(e.code === "Space") {
      const nowTalking = (ev === "keydown");
      setTalking(nowTalking);

      if(talkPrompt) {
        talkPrompt.querySelector("div").textContent = nowTalking
          ? "Release to send"
          : "Press and hold screen to talk";
      }
      if (actionbarText) {
        actionbarText.textContent = nowTalking
          ? (isMobile ? "Release to send" : "Release spacebar to send")
          : (isMobile ? "Press and hold screen to talk" : "Hold spacebar to talk");
      }
      e.preventDefault(); // prevent scrolling when pressing space
    }
  });
});

/* ---------- Touch Target Press & Hold ----------
   Functions mirror original startTalking/stopTalking behavior,
   but they call setTalking(...) so app.js's draw() responds.
*/
function startTalking(e){
  setTalking(true);
  if(talkPrompt) talkPrompt.querySelector("div").textContent = "Release to send";
  if (actionbarText) {
    actionbarText.textContent = isMobile
      ? "Release to send"
      : "Release spacebar to send";
  }
  e.preventDefault();
}
function stopTalking(e){
  setTalking(false);
  if(talkPrompt) talkPrompt.querySelector("div").textContent = "Press and hold screen to talk";
  if (actionbarText) {
    actionbarText.textContent = isMobile
      ? "Press and hold screen to talk"
      : "Hold spacebar to talk";
  }
  e.preventDefault();
}

/* Pointer events (desktop) */
touchTarget.addEventListener("pointerdown", startTalking);
touchTarget.addEventListener("pointerup", stopTalking);
touchTarget.addEventListener("pointercancel", stopTalking);

/* Touch events (mobile) */
touchTarget.addEventListener("touchstart", startTalking, {passive:false});
touchTarget.addEventListener("touchend", stopTalking, {passive:false});
touchTarget.addEventListener("touchcancel", stopTalking, {passive:false});