import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";

import App from "../App";

test("renders loading state on job detail route", () => {
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
