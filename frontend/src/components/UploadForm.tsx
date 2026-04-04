import { DragEvent, FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { createUpload } from "../lib/api";
import type { JobResponse } from "../lib/types";

export function UploadForm({ tenantSlug }: { tenantSlug: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function acceptFile(nextFile: File | null) {
    setFile(nextFile);
    if (nextFile) {
      setError(null);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0] ?? null);
  }

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
      <div
        aria-label="Audio dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          padding: "1rem",
          border: `2px dashed ${isDragging ? "#9fe870" : "#5c6b5c"}`,
          borderRadius: "0.75rem",
          background: isDragging ? "rgba(159, 232, 112, 0.08)" : "transparent",
        }}
      >
        Drag and drop an audio file here, or use the file picker below.
      </div>
      <input
        aria-label="Audio file"
        type="file"
        accept="audio/*"
        onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
      />
      {file ? <p>Selected file: {file.name}</p> : null}
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
