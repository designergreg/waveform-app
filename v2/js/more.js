/* ---------- More Menu ---------- */
const moreBtn = document.getElementById("moreBtn");
const moreMenu = document.getElementById("moreMenu");
const talkPromptEl = document.getElementById("talkPrompt"); // renamed

let menuOpen = false;

moreBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // safety: prevent doc handler from firing immediately
  menuOpen = !menuOpen;

  if (menuOpen) {
    moreMenu.classList.add("open");
    moreMenu.style.display = "block";
    moreBtn.style.background = "#1F4C7D";
    if (talkPromptEl) talkPromptEl.style.display = "none";
  } else {
    moreMenu.classList.remove("open");
    setTimeout(() => { if (!menuOpen) moreMenu.style.display = "none"; }, 150);
    moreBtn.style.background = "rgba(0,0,0,0.4)";
    if (talkPromptEl) talkPromptEl.style.display = "block";
  }
});

document.addEventListener("click", (e) => {
  if (!menuOpen) return;
  const clickedInsideMenu = moreMenu.contains(e.target);
  const clickedButton = moreBtn.contains(e.target);
  if (!clickedInsideMenu && !clickedButton) {
    menuOpen = false;
    moreMenu.classList.remove("open");
    setTimeout(() => { moreMenu.style.display = "none"; }, 150);
    moreBtn.style.background = "rgba(0,0,0,0.4)";
    if (talkPromptEl) talkPromptEl.style.display = "block";
  }
});
