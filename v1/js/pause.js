/* ---------- On Hold ---------- */
const pauseBtn = document.getElementById("pauseBtn");
const scrim = document.getElementById("onHoldScrim");
const pauseIcon = pauseBtn?.querySelector("img");

// Query what we need locally in this file
const actionbarTextEl = document.querySelector(".actionbar-text");
const talkPromptEl = document.getElementById("talkPrompt");
const talkPromptText = talkPromptEl?.querySelector("div");

let isOnHold = false;

if (pauseBtn && scrim && pauseIcon) {
  pauseBtn.addEventListener("click", () => {
    isOnHold = !isOnHold;

    document.body.classList.toggle('on-hold', isOnHold);
    window.isOnHold = isOnHold; // optional

    if (isOnHold) {
      // Enter On Hold
      scrim.style.display = "block";
      pauseBtn.classList.add("on-hold");
      pauseIcon.src = "../icons/bold/play.svg";
      // HIDING TALK PROMPT FOR THIS PROTOTYPE - SAVING THE BELOW CODE FOR LATER
      // if (talkPromptEl && talkPromptText) {
      //   talkPromptText.textContent = "On hold";
      //   talkPromptEl.style.display = "block";
      // }
      if (actionbarTextEl) actionbarTextEl.textContent = "On hold";
    } else {
      // Exit On Hold
      scrim.style.display = "none";
      pauseBtn.classList.remove("on-hold");
      pauseIcon.src = "../icons/linear/pause.svg";
      const idleText = window.isMobile
        ? "Press and hold screen to talk"
        : "Hold spacebar to talk";
      
      // HIDING TALK PROMPT FOR THIS PROTOTYPE - SAVING THE BELOW CODE FOR LATER
      // if (talkPromptEl && talkPromptText) {
      //   talkPromptText.textContent = "";
      //   talkPromptEl.style.display = "none";
      // }
      if (actionbarTextEl) actionbarTextEl.textContent = idleText;
    }
  });

  document.body.classList.toggle('on-hold', isOnHold);
  window.isOnHold = isOnHold; // optional
}
