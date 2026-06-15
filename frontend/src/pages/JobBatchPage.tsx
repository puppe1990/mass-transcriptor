import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { JobStatusBadge } from "../components/JobStatusBadge";
import { TranscriptPreview } from "../components/TranscriptPreview";
import { getJobBatch, retryJob, downloadJobMarkdown } from "../lib/api";
import type { JobBatchDetail, JobDetail } from "../lib/types";

export default function JobBatchPage() {
  const { t } = useTranslation();
  const { tenantSlug = "", batchId = "" } = useParams();
  const [batch, setBatch] = useState<JobBatchDetail | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    async function load() {
      const next = await getJobBatch(tenantSlug, batchId);
      setBatch(next);
      setActiveJobId((current) => current ?? next.jobs[0]?.id ?? null);
      if (next.jobs.some((job) => job.status === "queued" || job.status === "processing")) {
        timer = window.setTimeout(load, 2000);
      }
    }

    load().catch(() => setBatch(null));
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [tenantSlug, batchId]);

  if (!batch) {
    return (
      <section className="page">
        <div className="page-loading">
          <div className="page-loading__spinner" aria-hidden="true" />
          <span>{t("jobs.loadingBatch")}</span>
        </div>
      </section>
    );
  }

  const activeJob = batch.jobs.find((job) => job.id === activeJobId) ?? batch.jobs[0];

  async function handleRetry(job: JobDetail) {
    setIsRetrying(true);
    try {
      await retryJob(tenantSlug, String(job.id));
      const next = await getJobBatch(tenantSlug, batchId);
      setBatch(next);
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleDownload(job: JobDetail) {
    if (!job.markdown_path) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await downloadJobMarkdown(tenantSlug, String(job.id), job.original_filename);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : t("jobs.downloadFailed"));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <Link className="page__back" to={`/t/${tenantSlug}/jobs`}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t("jobs.backToJobs")}
        </Link>
        <h1 className="page__title">{t("jobs.batchTitle", { count: batch.jobs.length })}</h1>
        <p className="page__subtitle">{new Date(batch.created_at).toLocaleString()}</p>
      </header>

      <div className="page__body">
        <div className="job-batch-tabs" role="tablist" aria-label={t("jobs.batchTabs")}>
          {batch.jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              role="tab"
              aria-selected={job.id === activeJob?.id}
              className={`job-batch-tabs__tab${job.id === activeJob?.id ? " job-batch-tabs__tab--active" : ""}`}
              onClick={() => setActiveJobId(job.id)}
            >
              <span className="job-batch-tabs__label">{job.original_filename}</span>
              <JobStatusBadge status={job.status} />
            </button>
          ))}
        </div>

        {activeJob ? (
          <div className="job-batch-panel" role="tabpanel">
            <div className="job-meta">
              <div className="job-meta__item">
                <p className="job-meta__label">{t("jobs.provider")}</p>
                <p className="job-meta__value">{activeJob.provider_key}</p>
              </div>
              <div className="job-meta__item">
                <p className="job-meta__label">{t("jobs.status")}</p>
                <p className="job-meta__value">
                  <JobStatusBadge status={activeJob.status} />
                </p>
              </div>
            </div>

            <div className="job-actions">
              {activeJob.status === "failed" ? (
                <button type="button" onClick={() => handleRetry(activeJob)} disabled={isRetrying}>
                  {isRetrying ? t("jobs.retrying") : t("jobs.retryJob")}
                </button>
              ) : null}
              {activeJob.markdown_path ? (
                <button
                  type="button"
                  onClick={() => handleDownload(activeJob)}
                  disabled={isDownloading}
                >
                  {isDownloading ? t("jobs.downloadingMarkdown") : t("jobs.downloadMarkdown")}
                </button>
              ) : null}
            </div>

            {downloadError ? (
              <p className="page-alert" role="alert">
                {downloadError}
              </p>
            ) : null}

            {activeJob.error_message ? (
              <p className="page-alert" role="alert">
                {activeJob.error_message}
              </p>
            ) : null}

            <TranscriptPreview text={activeJob.transcript_text} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
