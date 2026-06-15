export type Theme = "dark" | "light";

const STORAGE_KEY = "mass-transcriptor-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }
  return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const nextTheme: Theme = getStoredTheme() === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  return nextTheme;
}

export function initializeTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}
