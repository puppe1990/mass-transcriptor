import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { buildJobListRows, summarizeBatchStatus } from "../lib/jobGroups";
import type { JobSummary } from "../lib/types";
import { JobStatusBadge } from "./JobStatusBadge";

export function JobsTable({ jobs }: { jobs: JobSummary[] }) {
  const { t } = useTranslation();
  const { tenantSlug = "" } = useParams();
  const rows = buildJobListRows(jobs);

  if (rows.length === 0) {
    return (
      <div className="jobs-empty">
        <div className="jobs-empty__icon" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
          {rows.map((row) => {
            if (row.kind === "batch") {
              const provider = row.jobs[0]?.provider_key ?? "";
              return (
                <tr key={`batch-${row.batchId}`}>
                  <td>
                    <Link
                      className="jobs-table__file-link"
                      to={`/t/${tenantSlug}/batches/${row.batchId}`}
                    >
                      {t("jobs.batchLabel", { count: row.jobs.length })}
                    </Link>
                    <p className="jobs-table__batch-files">
                      {row.jobs.map((job) => job.original_filename).join(" · ")}
                    </p>
                  </td>
                  <td>
                    <span className="jobs-table__provider">{provider}</span>
                  </td>
                  <td>
                    <JobStatusBadge status={summarizeBatchStatus(row.jobs)} />
                  </td>
                  <td className="jobs-table__date">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              );
            }

            return (
              <tr key={row.job.id}>
                <td>
                  <Link
                    className="jobs-table__file-link"
                    to={`/t/${tenantSlug}/jobs/${row.job.id}`}
                  >
                    {row.job.original_filename}
                  </Link>
                </td>
                <td>
                  <span className="jobs-table__provider">{row.job.provider_key}</span>
                </td>
                <td>
                  <JobStatusBadge status={row.job.status} />
                </td>
                <td className="jobs-table__date">
                  {new Date(row.job.created_at).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
