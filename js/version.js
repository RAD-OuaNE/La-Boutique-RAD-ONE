window.REDONE_BUILD = "2026.03.20.1";

function applySiteVersion() {
  const version = window.REDONE_BUILD || "dev";
  document.querySelectorAll("[data-site-version]").forEach((node) => {
    node.textContent = `Version ${version}`;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applySiteVersion);
} else {
  applySiteVersion();
}
