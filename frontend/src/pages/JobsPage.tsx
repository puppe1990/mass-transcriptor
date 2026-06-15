import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { JobsTable } from "../components/JobsTable";
import { listJobs } from "../lib/api";
import type { JobSummary } from "../lib/types";

export default function JobsPage() {
  const { t } = useTranslation();
  const { tenantSlug = "" } = useParams();
  const [jobs, setJobs] = useState<JobSummary[]>([]);

  useEffect(() => {
    listJobs(tenantSlug)
      .then(setJobs)
      .catch(() => setJobs([]));
  }, [tenantSlug]);

  return (
    <section className="page">
      <header className="page__header">
        <p className="page__eyebrow">{tenantSlug}</p>
        <h1 className="page__title">{t("jobs.title")}</h1>
        <div className="page__actions">
          <Link to={`/t/${tenantSlug}/uploads`}>{t("jobs.newUpload")}</Link>
        </div>
      </header>
      <div className="page__body">
        <JobsTable jobs={jobs} />
      </div>
    </section>
  );
}
