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
    dataTransfer: { files: [file] },
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
    target: { files: [file] },
  });

  expect(screen.getByText(/selected file: manual\.wav/i)).toBeTruthy();
});

test("file input accepts multiple audio files at once", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  const first = new File(["audio-a"], "meeting-a.wav", { type: "audio/wav" });
  const second = new File(["audio-b"], "meeting-b.wav", { type: "audio/wav" });
  fireEvent.change(screen.getByLabelText(/audio file/i), {
    target: { files: [first, second] },
  });

  expect(screen.getByText(/meeting-a\.wav/i)).toBeTruthy();
  expect(screen.getByText(/meeting-b\.wav/i)).toBeTruthy();
});

test("dropzone accepts multiple dragged audio files", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  const first = new File(["audio-a"], "drag-a.wav", { type: "audio/wav" });
  const second = new File(["audio-b"], "drag-b.wav", { type: "audio/wav" });
  fireEvent.drop(screen.getByLabelText(/audio dropzone/i), {
    dataTransfer: { files: [first, second] },
  });

  expect(screen.getByText(/drag-a\.wav/i)).toBeTruthy();
  expect(screen.getByText(/drag-b\.wav/i)).toBeTruthy();
});

test("selecting files in separate picker sessions keeps all selections visible", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  const fileInput = screen.getByLabelText(/audio file/i);
  const first = new File(["audio-a"], "WhatsApp Ptt 2026-06-14 at 22.22.13.ogg", {
    type: "audio/ogg",
  });
  const second = new File(["audio-b"], "WhatsApp Ptt 2026-06-14 at 22.22.14.ogg", {
    type: "audio/ogg",
  });

  fireEvent.change(fileInput, { target: { files: [first] } });
  fireEvent.change(fileInput, { target: { files: [second] } });

  expect(screen.getByText(/22\.22\.13\.ogg/i)).toBeTruthy();
  expect(screen.getByText(/22\.22\.14\.ogg/i)).toBeTruthy();
});

test("removing a selected file hides it from the upload list", () => {
  signInAsOwner();
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  const first = new File(["audio-a"], "keep-me.wav", { type: "audio/wav" });
  const second = new File(["audio-b"], "remove-me.wav", { type: "audio/wav" });
  fireEvent.change(screen.getByLabelText(/audio file/i), {
    target: { files: [first, second] },
  });

  fireEvent.click(screen.getByRole("button", { name: /remove remove-me\.wav/i }));

  expect(screen.getByText(/keep-me\.wav/i)).toBeTruthy();
  expect(screen.queryByText(/remove-me\.wav/i)).toBeNull();
});
