import { afterEach, expect, test, vi } from "vitest";

import {
  createUpload,
  getJobDetail,
  getProviderSettings,
  listJobs,
  retryJob,
  signIn,
  signUp,
  updateProviderSettings,
} from "../lib/api";

afterEach(() => {
  vi.restoreAllMocks();
});

test("api helpers use /api-prefixed endpoints", async () => {
  const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async () =>
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  await signUp({});
  await signIn({});
  await createUpload("acme", new File(["audio"], "sample.wav", { type: "audio/wav" }));
  await listJobs("acme");
  await getJobDetail("acme", "123");
  await retryJob("acme", "123");
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
    "/api/t/acme/jobs",
    "/api/t/acme/jobs/123",
    "/api/t/acme/jobs/123/retry",
    "/api/t/acme/settings/providers",
    "/api/t/acme/settings/providers",
  ]);
});
