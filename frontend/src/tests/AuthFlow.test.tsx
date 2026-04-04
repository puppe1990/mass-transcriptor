import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test } from "vitest";

import App from "../App";
import { clearAuth, getAccessToken, saveAuth } from "../lib/auth";

afterEach(() => {
  cleanup();
  clearAuth();
});

test("saveAuth persists the access token", () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [],
    tenant: null
  });
  expect(getAccessToken()).toBe("abc123");
  clearAuth();
});

test("renders sign up route", () => {
  render(
    <MemoryRouter
      initialEntries={["/signup"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /create workspace/i })).toBeTruthy();
  expect(screen.getByText(/turn raw audio into structured notes/i)).toBeTruthy();
});

test("renders sign in route", () => {
  render(
    <MemoryRouter
      initialEntries={["/signin"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /sign in/i })).toBeTruthy();
});

test("sign in page links to sign up", () => {
  render(
    <MemoryRouter
      initialEntries={["/signin"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(screen.getByRole("link", { name: /create workspace/i }).getAttribute("href")).toBe("/signup");
});

test("sign up page links to sign in", () => {
  render(
    <MemoryRouter
      initialEntries={["/signup"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(screen.getByRole("link", { name: /sign in instead/i }).getAttribute("href")).toBe("/signin");
});

test("password field has visibility toggle on sign in", () => {
  render(
    <MemoryRouter
      initialEntries={["/signin"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(screen.getByRole("button", { name: /show password/i })).toBeTruthy();
});

test("password visibility toggle switches input type", () => {
  render(
    <MemoryRouter
      initialEntries={["/signin"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
  expect(passwordInput.type).toBe("password");

  fireEvent.click(screen.getByRole("button", { name: /show password/i }));
  expect(passwordInput.type).toBe("text");

  fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
  expect(passwordInput.type).toBe("password");
});

test("redirects tenant route to sign in when unauthenticated", () => {
  clearAuth();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
  expect(screen.getAllByRole("heading", { name: /sign in/i }).length).toBeGreaterThan(0);
});

test("signup stores auth and redirects to workspace", async () => {
  clearAuth();
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/auth/signup")) {
      return new Response(
        JSON.stringify({
          access_token: "signup-token",
          token_type: "bearer",
          user: { id: 1, name: "Owner", email: "owner@example.com" },
          memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
          tenant: { id: 1, slug: "acme", name: "Acme" }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  render(
    <MemoryRouter
      initialEntries={["/signup"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByLabelText(/workspace name/i), { target: { value: "Acme" } });
  fireEvent.change(screen.getByLabelText(/workspace slug/i), { target: { value: "acme" } });
  fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Owner" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "owner@example.com" } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "secret123" } });
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));

  expect(await screen.findByRole("heading", { name: /upload audio/i })).toBeTruthy();
  expect(getAccessToken()).toBe("signup-token");

  global.fetch = originalFetch;
  clearAuth();
});

test("signin stores auth and redirects to tenant jobs", async () => {
  clearAuth();
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/auth/signin")) {
      return new Response(
        JSON.stringify({
          access_token: "signin-token",
          token_type: "bearer",
          user: { id: 1, name: "Owner", email: "owner@example.com" },
          memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
          tenant: null
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("/t/acme/jobs")) {
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  render(
    <MemoryRouter
      initialEntries={["/signin"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "owner@example.com" } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "secret123" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

  expect(await screen.findByRole("heading", { name: /jobs/i })).toBeTruthy();
  expect(getAccessToken()).toBe("signin-token");

  global.fetch = originalFetch;
  clearAuth();
});

test("shows logout action on protected routes", () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" }
  });

  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(screen.getByRole("button", { name: /sign out/i })).toBeTruthy();
});

test("sign out clears auth and redirects to signin", async () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" }
  });

  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

  expect(await screen.findByRole("heading", { name: /sign in/i })).toBeTruthy();
  expect(getAccessToken()).toBe(null);
});
