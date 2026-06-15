import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import type { JobSummary } from "../lib/types";
import { JobStatusBadge } from "./JobStatusBadge";

export function JobsTable({ jobs }: { jobs: JobSummary[] }) {
  const { t } = useTranslation();
  const { tenantSlug = "" } = useParams();

  if (jobs.length === 0) {
    return (
      <div className="jobs-empty">
        <div className="jobs-empty__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </div>
        <p className="jobs-empty__title">No jobs yet</p>
        <p className="jobs-empty__text">Upload an audio file to start your first transcription.</p>
        <Link to={`/t/${tenantSlug}/uploads`}>{t("jobs.newUpload")}</Link>
      </div>
    );
  }

  return (
    <div className="jobs-table-wrap">
      <table className="jobs-table">
        <thead>
          <tr>
            <th>{t("jobs.file")}</th>
            <th>{t("jobs.provider")}</th>
            <th>{t("jobs.status")}</th>
            <th>{t("jobs.created")}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <Link className="jobs-table__file-link" to={`/t/${tenantSlug}/jobs/${job.id}`}>
                  {job.original_filename}
                </Link>
              </td>
              <td>
                <span className="jobs-table__provider">{job.provider_key}</span>
              </td>
              <td>
                <JobStatusBadge status={job.status} />
              </td>
              <td className="jobs-table__date">{new Date(job.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
