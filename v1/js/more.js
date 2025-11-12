// js/more.js
(() => {
  const moreBtn      = document.getElementById("moreBtn");
  const moreMenu     = document.getElementById("moreMenu");
  const talkPromptEl = document.getElementById("talkPrompt");
  const touchTarget  = document.getElementById("touchTarget");

  let menuOpen = false;
  let wasPromptVisible = false; // ✅ track pre-menu visibility

  function isHoldActive() {
    // pause.js should toggle body.on-hold; window.isOnHold is optional
    return document.body.classList.contains('on-hold') || !!window.isOnHold;
  }

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;

    // ✅ remember if the prompt was currently visible
    if (talkPromptEl) {
      // computed style handles cases where .style.display is empty
      const disp = getComputedStyle(talkPromptEl).display;
      wasPromptVisible = disp !== "none";
      talkPromptEl.style.display = "none"; // hide while menu is open
    }

    moreMenu.classList.add("open");
    moreMenu.style.display = "block";
    moreBtn.style.background = "#1F4C7D";
    if (touchTarget) touchTarget.style.pointerEvents = "none";
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;

    moreMenu.classList.remove("open");
    setTimeout(() => { if (!menuOpen) moreMenu.style.display = "none"; }, 150);
    moreBtn.style.background = "rgba(0,0,0,0.4)";
    if (touchTarget) touchTarget.style.pointerEvents = "";

    // ✅ Restore only if it was visible before AND the call is still on hold
    if (talkPromptEl) {
      talkPromptEl.style.display = (wasPromptVisible && isHoldActive())
        ? "block"
        : "none";
    }
  }

  moreBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    menuOpen ? closeMenu() : openMenu();
  });

  function outsidePressHandler(e) {
    if (!menuOpen) return;
    const insideMenu = moreMenu.contains(e.target);
    const onButton   = moreBtn.contains(e.target);
    if (!insideMenu && !onButton) closeMenu();
  }
  document.addEventListener("pointerdown", outsidePressHandler, { passive: true });
  moreMenu.addEventListener("pointerdown", (e) => e.stopPropagation());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
})();
