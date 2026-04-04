import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";

import App from "../App";
import { clearAuth, saveAuth } from "../lib/auth";

test("renders upload heading on tenant upload route", () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" }
  });
  render(
    <MemoryRouter
      initialEntries={["/t/acme/uploads"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /upload audio/i })).toBeTruthy();
  clearAuth();
});
