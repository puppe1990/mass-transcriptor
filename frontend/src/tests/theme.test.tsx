import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test } from "vitest";

import App from "../App";
import { ThemeToggle } from "../components/ThemeToggle";
import "../i18n";
import { applyTheme, getStoredTheme, setTheme, toggleTheme } from "../lib/theme";

afterEach(() => {
  cleanup();
  localStorage.clear();
  applyTheme("dark");
});

test("theme helpers persist and apply light mode", () => {
  setTheme("light");
  expect(getStoredTheme()).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");

  expect(toggleTheme()).toBe("dark");
  expect(getStoredTheme()).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("theme toggle button switches to light mode", () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeToggle />
    </MemoryRouter>
  );

  expect(document.documentElement.dataset.theme).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: /switch to light mode/i }));

  expect(document.documentElement.dataset.theme).toBe("light");
  expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeTruthy();
});

test("sign in page exposes theme toggle", () => {
  render(
    <MemoryRouter
      initialEntries={["/signin"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeTruthy();
});
