// js/more.js
(() => {
  const moreBtn      = document.getElementById("moreBtn");
  const moreMenu     = document.getElementById("moreMenu");
  const talkPromptEl = document.getElementById("talkPrompt");
  const touchTarget  = document.getElementById("touchTarget"); // PTT layer

  let menuOpen = false;

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    moreMenu.classList.add("open");
    moreMenu.style.display = "block";
    moreBtn.style.background = "#1F4C7D";
    if (talkPromptEl) talkPromptEl.style.display = "none";
    if (touchTarget) touchTarget.style.pointerEvents = "none"; // disable PTT layer
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    moreMenu.classList.remove("open");
    setTimeout(() => { if (!menuOpen) moreMenu.style.display = "none"; }, 150);
    moreBtn.style.background = "rgba(0,0,0,0.4)";
    if (talkPromptEl) talkPromptEl.style.display = "block";
    if (touchTarget) touchTarget.style.pointerEvents = ""; // restore PTT layer
  }

  // Open/close the menu on POINTER, not click (avoids race between click and outside close)
  moreBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();       // prevent outside handler from firing immediately
    e.preventDefault();        // avoid ghost clicks on mobile
    menuOpen ? closeMenu() : openMenu();
  });

  // Close when pressing anywhere outside (desktop + mobile)
  function outsidePressHandler(e) {
    if (!menuOpen) return;
    const insideMenu = moreMenu.contains(e.target);
    const onButton   = moreBtn.contains(e.target);
    if (!insideMenu && !onButton) closeMenu();
  }
  document.addEventListener("pointerdown", outsidePressHandler, { passive: true });

  // Prevent inside taps from bubbling up
  moreMenu.addEventListener("pointerdown", (e) => e.stopPropagation());

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
})();
