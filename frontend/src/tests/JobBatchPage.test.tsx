import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";

import App from "../App";
import { clearAuth, saveAuth } from "../lib/auth";

afterEach(() => {
  cleanup();
  clearAuth();
  vi.restoreAllMocks();
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

test("jobs page groups batched uploads into a single row", async () => {
  signInAsOwner();
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/t/acme/jobs")) {
      return new Response(
        JSON.stringify([
          {
            id: 1,
            status: "queued",
            provider_key: "assemblyai",
            batch_id: 7,
            upload_id: 10,
            original_filename: "first.ogg",
            created_at: "2026-06-15T12:00:00.000Z",
          },
          {
            id: 2,
            status: "queued",
            provider_key: "assemblyai",
            batch_id: 7,
            upload_id: 11,
            original_filename: "second.ogg",
            created_at: "2026-06-15T12:00:00.000Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  });

  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByRole("link", { name: /2 audios/i })).toBeTruthy();
  expect(screen.getByText(/first\.ogg · second\.ogg/i)).toBeTruthy();
});

test("batch page shows tabs for each audio in the group", async () => {
  signInAsOwner();
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/t/acme/batches/7")) {
      return new Response(
        JSON.stringify({
          id: 7,
          created_at: "2026-06-15T12:00:00.000Z",
          jobs: [
            {
              id: 1,
              status: "completed",
              provider_key: "assemblyai",
              batch_id: 7,
              upload_id: 10,
              original_filename: "first.ogg",
              transcript_text: "hello one",
            },
            {
              id: 2,
              status: "completed",
              provider_key: "assemblyai",
              batch_id: 7,
              upload_id: 11,
              original_filename: "second.ogg",
              transcript_text: "hello two",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  });

  render(
    <MemoryRouter
      initialEntries={["/t/acme/batches/7"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: /upload group · 2 audios/i })).toBeTruthy();
  expect(screen.getByRole("tab", { name: /first\.ogg/i })).toBeTruthy();
  expect(screen.getByRole("tab", { name: /second\.ogg/i })).toBeTruthy();
  expect(screen.getByText("hello one")).toBeTruthy();
});
