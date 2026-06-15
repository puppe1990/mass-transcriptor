import { afterEach, expect, test, vi } from "vitest";

import { clearAuth, saveAuth } from "../lib/auth";
import { downloadJobMarkdown, jobMarkdownFilename } from "../lib/api";

afterEach(() => {
  clearAuth();
  vi.restoreAllMocks();
});

test("jobMarkdownFilename strips audio extension", () => {
  expect(jobMarkdownFilename("sample.wav")).toBe("sample.md");
  expect(jobMarkdownFilename("WhatsApp Ptt 2026-06-14 at 22.21.51.ogg")).toBe(
    "WhatsApp Ptt 2026-06-14 at 22.21.51.md"
  );
});

test("downloadJobMarkdown fetches authenticated api endpoint and triggers browser download", async () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" },
  });

  const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
    new Response("# Transcript\n\nhello", {
      status: 200,
      headers: { "Content-Type": "text/markdown" },
    })
  );

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

  await downloadJobMarkdown("acme", "123", "sample.wav");

  expect(fetchSpy).toHaveBeenCalledWith("/api/t/acme/jobs/123/download", {
    headers: { Authorization: "Bearer abc123" },
  });
  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(click).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:transcript");

  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});
