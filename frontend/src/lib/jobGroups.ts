import type { JobStatus, JobSummary } from "./types";

export type JobListRow =
  | { kind: "single"; job: JobSummary }
  | { kind: "batch"; batchId: number; jobs: JobSummary[]; createdAt: string };

export function buildJobListRows(jobs: JobSummary[]): JobListRow[] {
  const batches = new Map<number, JobSummary[]>();
  const singles: JobSummary[] = [];

  for (const job of jobs) {
    if (job.batch_id != null) {
      const group = batches.get(job.batch_id) ?? [];
      group.push(job);
      batches.set(job.batch_id, group);
    } else {
      singles.push(job);
    }
  }

  const rows: JobListRow[] = [];

  for (const [batchId, batchJobs] of batches) {
    const sorted = [...batchJobs].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
    rows.push({
      kind: "batch",
      batchId,
      jobs: sorted,
      createdAt: sorted[0]?.created_at ?? "",
    });
  }

  for (const job of singles) {
    rows.push({ kind: "single", job });
  }

  return rows.sort((left, right) => {
    const leftDate = left.kind === "batch" ? left.createdAt : left.job.created_at;
    const rightDate = right.kind === "batch" ? right.createdAt : right.job.created_at;
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
}

export function summarizeBatchStatus(jobs: JobSummary[]): JobStatus {
  if (jobs.some((job) => job.status === "failed")) return "failed";
  if (jobs.some((job) => job.status === "processing")) return "processing";
  if (jobs.some((job) => job.status === "queued")) return "queued";
  return "completed";
}
