// Runs before first paint (kept as a file so the production Content-Security-Policy can stay strict).
try {
  if (localStorage.getItem("theme") === "light") {
    document.documentElement.classList.add("light");
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", "#f0f3ff");
  }
} catch (e) {}
