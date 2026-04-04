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
          workspace_name: "Acme",
          default_provider: "whisper",
          whisper_language: "auto",
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
  expect(screen.getByText(/choose which engine runs each transcript/i)).toBeTruthy();
  expect(screen.getByDisplayValue("Acme")).toBeTruthy();
  expect(screen.getByDisplayValue("whisper")).toBeTruthy();
  expect(screen.getByDisplayValue("Auto detect")).toBeTruthy();
  expect(screen.getByText(/^missing$/i)).toBeTruthy();

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
          workspace_name: "Acme",
          default_provider: "whisper",
          whisper_language: "auto",
          providers: {
            whisper: { enabled: true, has_api_key: false },
            assemblyai: { enabled: false, has_api_key: false },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("/t/acme/settings/providers") && init?.method === "PATCH") {
      expect(init.body).toContain('"workspace_name":"Acme Studio"');
      expect(init.body).toContain('"whisper_language":"pt"');
      return new Response(
        JSON.stringify({
          workspace_name: "Acme Studio",
          default_provider: "assemblyai",
          whisper_language: "pt",
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
  fireEvent.change(screen.getByLabelText(/workspace name/i), { target: { value: "Acme Studio" } });
  fireEvent.change(screen.getByLabelText(/default provider/i), { target: { value: "assemblyai" } });
  fireEvent.change(screen.getByLabelText(/whisper default language/i), { target: { value: "pt" } });
  fireEvent.change(screen.getByLabelText(/assemblyai api key/i), { target: { value: "test-key" } });
  fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

  expect(await screen.findByText(/assemblyai key saved/i)).toBeTruthy();
  expect(screen.getByDisplayValue("Acme Studio")).toBeTruthy();
  expect(screen.getByDisplayValue("Portuguese")).toBeTruthy();

  global.fetch = originalFetch;
});
