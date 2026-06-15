import { expect, test } from "vitest";

import { buildJobListRows, summarizeBatchStatus } from "../lib/jobGroups";
import type { JobSummary } from "../lib/types";

function job(partial: Partial<JobSummary> & Pick<JobSummary, "id">): JobSummary {
  return {
    id: partial.id,
    status: partial.status ?? "queued",
    provider_key: partial.provider_key ?? "assemblyai",
    batch_id: partial.batch_id ?? null,
    upload_id: partial.upload_id ?? partial.id,
    original_filename: partial.original_filename ?? `file-${partial.id}.wav`,
    created_at: partial.created_at ?? "2026-06-15T12:00:00.000Z",
  };
}

test("buildJobListRows groups jobs with the same batch id", () => {
  const rows = buildJobListRows([
    job({ id: 1, batch_id: 9, original_filename: "a.wav" }),
    job({ id: 2, batch_id: 9, original_filename: "b.wav" }),
    job({ id: 3, original_filename: "solo.wav" }),
  ]);

  expect(rows).toHaveLength(2);
  expect(rows.find((row) => row.kind === "batch")).toMatchObject({
    kind: "batch",
    batchId: 9,
    jobs: expect.arrayContaining([
      expect.objectContaining({ original_filename: "a.wav" }),
      expect.objectContaining({ original_filename: "b.wav" }),
    ]),
  });
  expect(rows.find((row) => row.kind === "single")).toMatchObject({
    kind: "single",
    job: expect.objectContaining({ original_filename: "solo.wav" }),
  });
});

test("summarizeBatchStatus prefers failed and in-progress states", () => {
  expect(
    summarizeBatchStatus([job({ id: 1, status: "completed" }), job({ id: 2, status: "failed" })])
  ).toBe("failed");
  expect(
    summarizeBatchStatus([
      job({ id: 1, status: "completed" }),
      job({ id: 2, status: "processing" }),
    ])
  ).toBe("processing");
});
