import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";

import App from "../App";

test("renders upload heading on tenant upload route", () => {
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
