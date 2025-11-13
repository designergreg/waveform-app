// js/more.js
(() => {
  /* ============================================================
   * MORE MENU + PTT TOGGLE
   *
   * Responsibilities:
   *  - Open/close the "More" glass menu
   *  - Temporarily hide the floating talk prompt while menu is open
   *  - Restore the prompt when closed (for hold + mute cases)
   *  - Toggle PTT state + UI + prompt routing
   * ============================================================ */

  const moreBtn      = document.getElementById("moreBtn");
  const moreMenu     = document.getElementById("moreMenu");
  const talkPromptEl = document.getElementById("talkPrompt");
  const touchTarget  = document.getElementById("touchTarget");

  let menuOpen = false;
  let wasPromptVisible = false; // tracks prompt visibility before opening menu

  /* ------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------ */

  // "On hold" is driven by pause.js (body class + optional window.isOnHold)
  function isHoldActive() {
    return (
      document.body.classList.contains("on-hold") ||
      !!window.isOnHold
    );
  }

  // Should the talk prompt be visible after closing the menu?
  function shouldRestorePrompt() {
    if (!wasPromptVisible) return false;

    const pttOn   = window.isPTTOn !== false;   // default true if undefined
    const pttOff  = !pttOn;
    const muted   = !!window.isMicMuted;

    // Restore if:
    //  - still on hold, OR
    //  - PTT is OFF and we're currently muted ("Your mic is muted" prompt)
    if (isHoldActive()) return true;
    if (pttOff && muted) return true;

    return false;
  }

  /* ------------------------------------------------------------
   * Menu open / close
   * ------------------------------------------------------------ */

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;

    // Remember if the floating talk prompt was visible
    if (talkPromptEl) {
      const disp = getComputedStyle(talkPromptEl).display;
      wasPromptVisible = disp !== "none";
      talkPromptEl.style.display = "none"; // hide while menu is open
    }

    moreMenu.classList.add("open");
    moreMenu.style.display = "block";

    if (moreBtn) {
      moreBtn.classList.add("more-open");
    }

    // Disable touch target while menu is open so the user doesn't
    // accidentally start PTT behind the glass panel
    if (touchTarget) {
      touchTarget.style.pointerEvents = "none";
    }
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;

    moreMenu.classList.remove("open");
    setTimeout(() => {
      if (!menuOpen) moreMenu.style.display = "none";
    }, 150);

    if (moreBtn) {
      moreBtn.classList.remove("more-open");
      moreBtn.style.background = "";
    }

    if (touchTarget) {
      touchTarget.style.pointerEvents = "";
    }

    // Restore prompt only if it was visible before AND
    // either we're still on hold OR we're muted in PTT-off mode.
    if (talkPromptEl) {
      talkPromptEl.style.display = shouldRestorePrompt()
        ? "block"
        : "none";
    }
  }

  /* ------------------------------------------------------------
   * Menu button + outside clicks
   * ------------------------------------------------------------ */

  if (moreBtn) {
    moreBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      menuOpen ? closeMenu() : openMenu();
    });
  }

  function outsidePressHandler(e) {
    if (!menuOpen) return;
    const insideMenu = moreMenu.contains(e.target);
    const onButton   = moreBtn && moreBtn.contains(e.target);
    if (!insideMenu && !onButton) {
      closeMenu();
    }
  }

  document.addEventListener("pointerdown", outsidePressHandler, {
    passive: true,
  });

  moreMenu.addEventListener("pointerdown", (e) => e.stopPropagation());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* ------------------------------------------------------------
   * Push-to-talk toggle: visual + prompt routing
   * ------------------------------------------------------------ */

  const pttRow    = moreMenu.querySelector(".ptt-row");
  const pttToggle = moreMenu.querySelector(".toggle-switch");

  if (pttRow && pttToggle) {
    pttRow.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();

      const isNowOff = pttToggle.classList.toggle("off");
      const isOn     = !isNowOff;

      pttToggle.setAttribute("data-toggle", isOn ? "On" : "Off");

      // Update global PTT mode
      window.isPTTOn = isOn;

      // If we are switching PTT back ON, force mute OFF
      if (isOn && typeof window.setMutedState === "function") {
        window.setMutedState(false);
      }

      // If PTT just turned ON and we're NOT on hold,
      // explicitly restore the idle PTT prompt so it appears immediately
      const onHold =
        document.body.classList.contains("on-hold") || !!window.isOnHold;

      if (isOn && !onHold && typeof window.setPromptText === "function") {
        const isMobile =
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

        const idleMsg = isMobile
          ? "Press and hold screen to talk"
          : "Hold spacebar to talk";

        window.setPromptText(idleMsg);
      }

      // Toggle body class for PTT-off styles
      document.body.classList.toggle("ptt-off", !isOn);

      // Show/hide mute button in the action bar
      const muteBtn = document.getElementById("muteBtn");
      if (muteBtn) {
        muteBtn.style.display = isOn ? "none" : "flex";
      }

      // Re-render prompt routing (actionbar-text vs talkPrompt)
      if (typeof window.updatePromptMode === "function") {
        window.updatePromptMode();
      }
    });
  }


})();
