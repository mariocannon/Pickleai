"use client";

export function ThemeToggle() {
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle light / dark theme"
      title="Toggle theme"
      onClick={() => {
        const root = document.documentElement;
        const cur = root.getAttribute("data-theme") ?? "light";
        root.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
      }}
    >
      ◐
    </button>
  );
}
