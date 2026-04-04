import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "../App";
import { clearAuth, saveAuth } from "../lib/auth";

afterEach(() => {
  cleanup();
  clearAuth();
});

test("renders loading state on job detail route", () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" }
  });
  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs/123"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText(/loading job/i)).toBeTruthy();
});

test("exposes retry and download actions based on job state", async () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" }
  });
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 123,
        status: "failed",
        provider_key: "whisper",
        upload_id: 1,
        original_filename: "sample.wav",
        error_message: "failed once",
        markdown_path: "/tmp/transcript.md",
        transcript_text: "hello"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs/123"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByRole("button", { name: /retry job/i })).toBeTruthy();
  expect(await screen.findByRole("link", { name: /download markdown/i })).toBeTruthy();

  global.fetch = originalFetch;
});

test("copies transcript text from job detail", async () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" }
  });
  const originalFetch = global.fetch;
  const originalClipboard = navigator.clipboard;
  const writeText = vi.fn().mockResolvedValue(undefined);

  Object.assign(navigator, {
    clipboard: {
      writeText
    }
  });

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 123,
        status: "completed",
        provider_key: "whisper",
        upload_id: 1,
        original_filename: "sample.wav",
        markdown_path: "/tmp/transcript.md",
        transcript_text: "hello copy"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs/123"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: /copy text/i }));

  expect(writeText).toHaveBeenCalledWith("hello copy");

  global.fetch = originalFetch;
  Object.assign(navigator, { clipboard: originalClipboard });
});
