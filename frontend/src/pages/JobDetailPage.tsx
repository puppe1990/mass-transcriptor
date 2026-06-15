import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { JobStatusBadge } from "../components/JobStatusBadge";
import { TranscriptPreview } from "../components/TranscriptPreview";
import { getJobDetail, retryJob } from "../lib/api";
import type { JobDetail } from "../lib/types";

export default function JobDetailPage() {
  const { t } = useTranslation();
  const { tenantSlug = "", jobId = "" } = useParams();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let timer: number | undefined;

    async function load() {
      const next = await getJobDetail(tenantSlug, jobId);
      setJob(next);
      if (next.status === "queued" || next.status === "processing") {
        timer = window.setTimeout(load, 2000);
      }
    }

    load().catch(() => setJob(null));
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [tenantSlug, jobId]);

  if (!job) {
    return (
      <section className="page">
        <div className="page-loading">
          <div className="page-loading__spinner" aria-hidden="true" />
          <span>{t("jobs.loadingJob")}</span>
        </div>
      </section>
    );
  }

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await retryJob(tenantSlug, jobId);
      const next = await getJobDetail(tenantSlug, jobId);
      setJob(next);
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <Link className="page__back" to={`/t/${tenantSlug}/jobs`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t("jobs.backToJobs")}
        </Link>
        <h1 className="page__title">{job.original_filename}</h1>
      </header>

      <div className="page__body">
        <div className="job-meta">
          <div className="job-meta__item">
            <p className="job-meta__label">{t("jobs.provider")}</p>
            <p className="job-meta__value">{job.provider_key}</p>
          </div>
          <div className="job-meta__item">
            <p className="job-meta__label">{t("jobs.status")}</p>
            <p className="job-meta__value">
              <JobStatusBadge status={job.status} />
            </p>
          </div>
          {job.markdown_path ? (
            <div className="job-meta__item">
              <p className="job-meta__label">Output</p>
              <p className="job-meta__value" style={{ fontSize: "12px", fontWeight: 400, color: "var(--color-text-muted)" }}>
                {job.markdown_path}
              </p>
            </div>
          ) : null}
        </div>

        <div className="job-actions">
          {job.status === "failed" ? (
            <button type="button" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? t("jobs.retrying") : t("jobs.retryJob")}
            </button>
          ) : null}
          {job.markdown_path ? (
            <a href={`/t/${tenantSlug}/jobs/${jobId}/download`}>{t("jobs.downloadMarkdown")}</a>
          ) : null}
        </div>

        {job.error_message ? <p className="page-alert" role="alert">{job.error_message}</p> : null}

        <TranscriptPreview text={job.transcript_text} />
      </div>
    </section>
  );
}
