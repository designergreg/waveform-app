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