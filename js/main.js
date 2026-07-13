document.addEventListener("DOMContentLoaded", function () {
  // Root path (no filename) resolves to game.html, the site's landing page
  const currentPage = (location.pathname.split("/").pop() || "game.html");
  document.querySelectorAll(".app-nav .nav-link[data-page]").forEach(function (link) {
    if (link.getAttribute("data-page") === currentPage) {
      link.classList.add("active");
    }
  });
});
