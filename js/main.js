document.addEventListener("DOMContentLoaded", function () {
  const currentPage = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".app-nav .nav-link[data-page]").forEach(function (link) {
    if (link.getAttribute("data-page") === currentPage) {
      link.classList.add("active");
    }
  });
});
