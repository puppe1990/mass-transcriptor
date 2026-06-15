import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    tenant: { id: 1, slug: "acme", name: "Acme" },
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
    tenant: { id: 1, slug: "acme", name: "Acme" },
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
        transcript_text: "hello",
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
  expect(await screen.findByRole("button", { name: /download markdown/i })).toBeTruthy();

  global.fetch = originalFetch;
});

test("copies transcript text from job detail", async () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" },
  });
  const originalFetch = global.fetch;
  const originalClipboard = navigator.clipboard;
  const writeText = vi.fn().mockResolvedValue(undefined);

  Object.assign(navigator, {
    clipboard: {
      writeText,
    },
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
        transcript_text: "hello copy",
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

test("downloads markdown through authenticated api endpoint", async () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" },
  });

  const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/t/acme/jobs/123") && init?.method !== "POST") {
      return new Response(
        JSON.stringify({
          id: 123,
          status: "completed",
          provider_key: "assemblyai",
          upload_id: 1,
          original_filename: "sample.wav",
          markdown_path: "/tmp/transcript.md",
          transcript_text: "hello",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.endsWith("/api/t/acme/jobs/123/download")) {
      return new Response("# Transcript\n\nhello", {
        status: 200,
        headers: { "Content-Type": "text/markdown" },
      });
    }
    return new Response("{}", { status: 404 });
  });
  const originalFetch = global.fetch;
  global.fetch = fetchSpy;

  const createObjectURL = vi.fn(() => "blob:transcript");
  const revokeObjectURL = vi.fn();
  const click = vi.fn();
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);

  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName);
    if (tagName === "a") {
      element.click = click;
    }
    return element;
  });

  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs/123"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: /download markdown/i }));

  await waitFor(() => {
    expect(fetchSpy.mock.calls.some(([url]) => String(url).endsWith("/download"))).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
  });

  const downloadCall = fetchSpy.mock.calls.find(([url]) => String(url).endsWith("/download"));
  expect(downloadCall?.[1]?.headers).toMatchObject({ Authorization: "Bearer abc123" });

  global.fetch = originalFetch;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});
