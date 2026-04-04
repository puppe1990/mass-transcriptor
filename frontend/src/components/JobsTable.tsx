import { Link, useParams } from "react-router-dom";

import type { JobSummary } from "../lib/types";
import { JobStatusBadge } from "./JobStatusBadge";

export function JobsTable({ jobs }: { jobs: JobSummary[] }) {
  const { tenantSlug = "" } = useParams();

  return (
    <table className="jobs-table">
      <thead>
        <tr>
          <th>File</th>
          <th>Provider</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id}>
            <td>
              <Link to={`/t/${tenantSlug}/jobs/${job.id}`}>{job.original_filename}</Link>
            </td>
            <td>{job.provider_key}</td>
            <td>
              <JobStatusBadge status={job.status} />
            </td>
            <td>{new Date(job.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
