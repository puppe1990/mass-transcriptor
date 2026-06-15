import { afterEach, expect, test, vi } from "vitest";

import {
  createUpload,
  createUploads,
  downloadJobMarkdown,
  getJobDetail,
  getProviderSettings,
  listJobs,
  retryJob,
  signIn,
  signUp,
  updateProviderSettings,
} from "../lib/api";
import { saveAuth } from "../lib/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockBrowserDownload() {
  URL.createObjectURL = vi.fn(() => "blob:transcript");
  URL.revokeObjectURL = vi.fn();
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName);
    if (tagName === "a") {
      element.click = vi.fn();
    }
    return element;
  });
}

test("api helpers use /api-prefixed endpoints", async () => {
  saveAuth({
    access_token: "abc123",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "owner@example.com" },
    memberships: [{ tenant_id: 1, user_id: 1, role: "owner", tenant_slug: "acme" }],
    tenant: { id: 1, slug: "acme", name: "Acme" },
  });
  mockBrowserDownload();
  const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  );

  await signUp({});
  await signIn({});
  await createUpload("acme", new File(["audio"], "sample.wav", { type: "audio/wav" }));
  await createUploads("acme", [
    new File(["audio-a"], "a.wav", { type: "audio/wav" }),
    new File(["audio-b"], "b.wav", { type: "audio/wav" }),
  ]);
  await listJobs("acme");
  await getJobDetail("acme", "123");
  await retryJob("acme", "123");
  await downloadJobMarkdown("acme", "123", "sample.wav");
  await getProviderSettings("acme");
  await updateProviderSettings("acme", {
    workspace_name: "Acme",
    default_provider: "whisper",
    whisper_language: "auto",
  });

  expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([
    "/api/auth/signup",
    "/api/auth/signin",
    "/api/t/acme/uploads",
    "/api/t/acme/uploads",
    "/api/t/acme/jobs",
    "/api/t/acme/jobs/123",
    "/api/t/acme/jobs/123/retry",
    "/api/t/acme/jobs/123/download",
    "/api/t/acme/settings/providers",
    "/api/t/acme/settings/providers",
  ]);
});
