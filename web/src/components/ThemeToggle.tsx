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
        let cur = root.getAttribute("data-theme");
        if (!cur) {
          cur = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        }
        root.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
      }}
    >
      ◐
    </button>
  );
}
