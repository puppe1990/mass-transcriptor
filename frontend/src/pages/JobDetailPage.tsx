import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { JobStatusBadge } from "../components/JobStatusBadge";
import { TranscriptPreview } from "../components/TranscriptPreview";
import { getJobDetail, retryJob } from "../lib/api";
import type { JobDetail } from "../lib/types";

export default function JobDetailPage() {
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
    return <section className="page"><p>Loading job...</p></section>;
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
      <p>
        <Link to={`/t/${tenantSlug}/jobs`}>Back to jobs</Link>
      </p>
      <h1>{job.original_filename}</h1>
      <p>
        Provider: {job.provider_key} <JobStatusBadge status={job.status} />
      </p>
      <div className="job-actions">
        {job.status === "failed" ? (
          <button type="button" onClick={handleRetry} disabled={isRetrying}>
            {isRetrying ? "Retrying..." : "Retry Job"}
          </button>
        ) : null}
        {job.markdown_path ? (
          <a href={`/t/${tenantSlug}/jobs/${jobId}/download`}>Download Markdown</a>
        ) : null}
      </div>
      {job.error_message ? <p role="alert">{job.error_message}</p> : null}
      {job.markdown_path ? <p>Markdown file: {job.markdown_path}</p> : null}
      <TranscriptPreview text={job.transcript_text} />
    </section>
  );
}
