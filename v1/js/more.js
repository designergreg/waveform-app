// js/more.js
(() => {
  /* ----------------------------------------------------------
   * DOM ELEMENTS
   * ---------------------------------------------------------- */
  const moreBtn      = document.getElementById("moreBtn");
  const moreMenu     = document.getElementById("moreMenu");
  const talkPromptEl = document.getElementById("talkPrompt");
  const touchTarget  = document.getElementById("touchTarget");

  // Elements inside the More menu for PTT toggle
  const pttRow    = moreMenu?.querySelector(".ptt-row");
  const pttToggle = moreMenu?.querySelector(".toggle-switch");

  // Mute button in the actionbar (shown when PTT is OFF)
  const muteBtn   = document.getElementById("muteBtn");

  /* ----------------------------------------------------------
   * STATE
   * ---------------------------------------------------------- */
  let menuOpen = false;
  // Tracks if talkPrompt was visible before opening the menu
  let wasPromptVisible = false;

  /* ----------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------- */

  // Returns true if the call is currently on hold
  // (controlled by pause.js via body.on-hold or window.isOnHold)
  function isHoldActive() {
    return document.body.classList.contains("on-hold") || !!window.isOnHold;
  }

  /* ----------------------------------------------------------
   * MENU OPEN / CLOSE
   * ---------------------------------------------------------- */

  function openMenu() {
    if (menuOpen || !moreMenu || !moreBtn) return;
    menuOpen = true;

    // Remember if the prompt bubble was visible before opening
    if (talkPromptEl) {
      const disp = getComputedStyle(talkPromptEl).display;
      wasPromptVisible = disp !== "none";
      talkPromptEl.style.display = "none";      // hide while menu is open
    }

    // Show and animate menu
    moreMenu.classList.add("open");
    moreMenu.style.display = "block";

    // Visually mark the More button as "selected / open"
    moreBtn.classList.add("more-open");

    // Disable touch interactions with the main PTT area while menu is open
    if (touchTarget) {
      touchTarget.style.pointerEvents = "none";
    }
  }

  function closeMenu() {
    if (!menuOpen || !moreMenu || !moreBtn) return;
    menuOpen = false;

    // Close animation
    moreMenu.classList.remove("open");
    setTimeout(() => {
      if (!menuOpen) {
        moreMenu.style.display = "none";
      }
    }, 150);

    // Clear "open" visual state on More button
    moreBtn.classList.remove("more-open");
    moreBtn.style.background = "";   // in case any inline background lingered

    // Re-enable interactions with PTT touch area
    if (touchTarget) {
      touchTarget.style.pointerEvents = "";
    }

    // Restore talkPrompt only if:
    //  - it was visible before AND
    //  - the call is still on hold
    if (talkPromptEl) {
      talkPromptEl.style.display =
        wasPromptVisible && isHoldActive() ? "block" : "none";
    }
  }

  /* ----------------------------------------------------------
   * BUTTON / OUTSIDE INTERACTION
   * ---------------------------------------------------------- */

  if (moreBtn) {
    // Toggle menu when clicking/pointer-down on More
    moreBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      menuOpen ? closeMenu() : openMenu();
    });
  }

  // Close when clicking outside the menu
  function outsidePressHandler(e) {
    if (!menuOpen || !moreMenu || !moreBtn) return;

    const insideMenu = moreMenu.contains(e.target);
    const onButton   = moreBtn.contains(e.target);

    if (!insideMenu && !onButton) {
      closeMenu();
    }
  }

  document.addEventListener("pointerdown", outsidePressHandler, {
    passive: true,
  });

  // Prevent clicks inside the menu from bubbling and closing it
  if (moreMenu) {
    moreMenu.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  // Close menu with ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });

  /* ----------------------------------------------------------
   * PTT TOGGLE (visual + prompt routing)
   * ---------------------------------------------------------- */

  if (pttRow && pttToggle) {
    pttRow.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Toggle visual OFF state
      const isNowOff = pttToggle.classList.toggle("off");
      const isOn = !isNowOff;

      // Update label attribute
      pttToggle.setAttribute("data-toggle", isOn ? "On" : "Off");

      // Update global PTT mode so other scripts (wave2.js, etc.) can react
      window.isPTTOn = isOn;

      // Add/remove body.ptt-off for CSS-based UI changes
      document.body.classList.toggle("ptt-off", !isOn);

      // Show/hide mute button when PTT is OFF
      if (muteBtn) {
        muteBtn.style.display = isOn ? "none" : "flex";
      }

      // Re-render prompt UI to route text to actionbar vs talkPrompt
      if (typeof window.updatePromptMode === "function") {
        window.updatePromptMode();
      }
    });
  }
})();
