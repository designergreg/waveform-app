/* ---------- More Menu ---------- */
const moreBtn = document.getElementById("moreBtn");
const moreMenu = document.getElementById("moreMenu");

let menuOpen = false;

moreBtn.addEventListener("click", () => {
  menuOpen = !menuOpen;

  if (menuOpen) {
    moreMenu.classList.add("open");
    moreMenu.style.display = "block";
    moreBtn.style.background = "#1F4C7D";
  } else {
    moreMenu.classList.remove("open");
    setTimeout(() => {
      if (!menuOpen) moreMenu.style.display = "none";
    }, 150);
    moreBtn.style.background = "rgba(0,0,0,0.4)";
  }
});

// Close menu when clicking anywhere else
document.addEventListener("click", (e) => {
  if (!menuOpen) return;

  const clickedInsideMenu = moreMenu.contains(e.target);
  const clickedButton = moreBtn.contains(e.target);

  if (!clickedInsideMenu && !clickedButton) {
    menuOpen = false;
    moreMenu.classList.remove("open");
    setTimeout(() => moreMenu.style.display = "none", 150);
    moreBtn.style.background = "rgba(0,0,0,0.4)";
  }
});