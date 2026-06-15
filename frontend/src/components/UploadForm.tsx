import { DragEvent, FormEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { createUpload } from "../lib/api";
import type { JobResponse } from "../lib/types";

export function UploadForm({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useTranslation();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setError(nextError instanceof Error ? nextError.message : t("upload.uploadFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <form className="upload-form" onSubmit={onSubmit}>
      <div
        className={`upload-dropzone${isDragging ? " upload-dropzone--active" : ""}`}
        aria-label="Audio dropzone"
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="upload-dropzone__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <p className="upload-dropzone__title">{t("upload.dropzone")}</p>
        <p className="upload-dropzone__hint">MP3, WAV, M4A, FLAC and more</p>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        className="upload-file-input"
        aria-label="Audio file"
        type="file"
        accept="audio/*"
        onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="upload-file-card">
          <div className="upload-file-card__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <p className="upload-file-card__name">Selected file: {file.name}</p>
            <p className="upload-file-card__meta">{formatFileSize(file.size)}</p>
          </div>
        </div>
      ) : null}

      <button type="submit" disabled={!file || submitting}>
        {submitting ? t("upload.uploading") : t("upload.startTranscription")}
      </button>

      {error ? <p className="upload-error" role="alert">{error}</p> : null}

      {job ? (
        <div className="upload-success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            {t("upload.queued")}{" "}
            <Link to={`/t/${tenantSlug}/jobs/${job.id}`}>{t("upload.openJob")}</Link>
          </span>
        </div>
      ) : null}
    </form>
  );
}
