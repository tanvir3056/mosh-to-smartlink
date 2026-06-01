"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem("bs_theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const storedTheme = getStoredTheme();
    const syncStoredTheme = window.setTimeout(() => setTheme(storedTheme), 0);

    return () => window.clearTimeout(syncStoredTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("bs_theme", nextTheme);
  }

  const Icon = theme === "dark" ? Sun : Moon;
  const title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={toggleTheme}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[7px] border border-transparent bg-transparent text-[var(--app-muted)] transition hover:border-[var(--app-line)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} />
    </button>
  );
}
