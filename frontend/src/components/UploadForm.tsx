import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { createUpload } from "../lib/api";
import type { JobResponse } from "../lib/types";

export function UploadForm({ tenantSlug }: { tenantSlug: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const nextJob = await createUpload(tenantSlug, file);
      setJob(nextJob);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={onSubmit}>
      <input
        aria-label="Audio file"
        type="file"
        accept="audio/*"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button type="submit" disabled={!file || submitting}>
        {submitting ? "Uploading..." : "Start Transcription"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {job ? (
        <p>
          Job queued. <Link to={`/t/${tenantSlug}/jobs/${job.id}`}>Open job</Link>
        </p>
      ) : null}
    </form>
  );
}
