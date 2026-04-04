import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test } from "vitest";

import App from "../App";
import { clearAuth, saveAuth } from "../lib/auth";

afterEach(() => {
  cleanup();
  clearAuth();
});

function signInAsOwner() {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" },
  });
}

test("renders provider settings page", async () => {
  signInAsOwner();
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/t/acme/settings/providers")) {
      return new Response(
        JSON.stringify({
          default_provider: "whisper",
          providers: {
            whisper: { enabled: true, has_api_key: false },
            assemblyai: { enabled: false, has_api_key: false },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  render(
    <MemoryRouter
      initialEntries={["/t/acme/settings"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: /provider settings/i })).toBeTruthy();
  expect(screen.getByDisplayValue("whisper")).toBeTruthy();

  global.fetch = originalFetch;
});

test("saves assemblyai byok settings", async () => {
  signInAsOwner();
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/t/acme/settings/providers") && (!init || init.method === undefined)) {
      return new Response(
        JSON.stringify({
          default_provider: "whisper",
          providers: {
            whisper: { enabled: true, has_api_key: false },
            assemblyai: { enabled: false, has_api_key: false },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("/t/acme/settings/providers") && init?.method === "PATCH") {
      return new Response(
        JSON.stringify({
          default_provider: "assemblyai",
          providers: {
            whisper: { enabled: true, has_api_key: false },
            assemblyai: { enabled: true, has_api_key: true },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  render(
    <MemoryRouter
      initialEntries={["/t/acme/settings"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  await screen.findByRole("heading", { name: /provider settings/i });
  fireEvent.change(screen.getByLabelText(/default provider/i), { target: { value: "assemblyai" } });
  fireEvent.change(screen.getByLabelText(/assemblyai api key/i), { target: { value: "test-key" } });
  fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

  expect(await screen.findByText(/assemblyai key saved/i)).toBeTruthy();

  global.fetch = originalFetch;
});
