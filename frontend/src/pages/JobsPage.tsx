import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { JobsTable } from "../components/JobsTable";
import { listJobs } from "../lib/api";
import type { JobSummary } from "../lib/types";

export default function JobsPage() {
  const { tenantSlug = "" } = useParams();
  const [jobs, setJobs] = useState<JobSummary[]>([]);

  useEffect(() => {
    listJobs(tenantSlug).then(setJobs).catch(() => setJobs([]));
  }, [tenantSlug]);

  return (
    <section className="page">
      <h1>Jobs</h1>
      <p>
        <Link to={`/t/${tenantSlug}/uploads`}>New upload</Link>
      </p>
      <JobsTable jobs={jobs} />
    </section>
  );
}
