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
    tenant: { id: 1, slug: "acme", name: "Acme" }
  });
}

test("renders upload heading on tenant upload route", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /upload audio/i })).toBeTruthy();
});

test("renders drag and drop area on upload page", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/audio dropzone/i)).toBeTruthy();
});

test("dropzone accepts a dragged audio file", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  const file = new File(["audio"], "meeting.wav", { type: "audio/wav" });
  fireEvent.drop(screen.getByLabelText(/audio dropzone/i), {
    dataTransfer: { files: [file] }
  });

  expect(screen.getByText(/selected file: meeting\.wav/i)).toBeTruthy();
});

test("manual file selection still works with dropzone enabled", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  const file = new File(["audio"], "manual.wav", { type: "audio/wav" });
  fireEvent.change(screen.getByLabelText(/audio file/i), {
    target: { files: [file] }
  });

  expect(screen.getByText(/selected file: manual\.wav/i)).toBeTruthy();
});
