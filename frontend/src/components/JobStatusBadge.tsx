import type { JobStatus } from "../lib/types";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={`status status-${status}`}>{status}</span>;
}
