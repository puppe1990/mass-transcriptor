import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";

import App from "../App";

test("renders jobs heading on jobs route", () => {
  render(
    <MemoryRouter
      initialEntries={["/t/acme/jobs"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /jobs/i })).toBeTruthy();
});
