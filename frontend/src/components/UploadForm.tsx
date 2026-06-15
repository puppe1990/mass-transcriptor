import { DragEvent, FormEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { createUploads } from "../lib/api";
import type { JobResponse } from "../lib/types";

function filesFromList(fileList: FileList | null | undefined): File[] {
  return fileList ? Array.from(fileList) : [];
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function mergeAudioFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map(fileKey));
  const merged = [...existing];
  for (const file of incoming) {
    const key = fileKey(file);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(file);
    }
  }
  return merged;
}

export function removeAudioFile(files: File[], fileToRemove: File): File[] {
  const key = fileKey(fileToRemove);
  return files.filter((file) => fileKey(file) !== key);
}

export function UploadForm({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useTranslation();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function acceptFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) return;
    setFiles((current) => mergeAudioFiles(current, nextFiles));
    setError(null);
  }

  function removeFile(fileToRemove: File) {
    setFiles((current) => removeAudioFile(current, fileToRemove));
  }

  function clearAllFiles() {
    setFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    acceptFiles(filesFromList(event.dataTransfer.files));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const nextJobs = await createUploads(tenantSlug, files);
      setJobs(nextJobs);
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
        multiple
        onChange={(event) => acceptFiles(filesFromList(event.target.files))}
      />

      {files.length > 0 ? (
        <>
          {files.length > 1 ? (
            <div className="upload-file-list__toolbar">
              <p className="upload-file-list__count">
                {t("upload.selectedCount", { count: files.length })}
              </p>
              <button type="button" className="upload-file-list__clear" onClick={clearAllFiles}>
                {t("upload.cleanAll")}
              </button>
            </div>
          ) : null}
          <ul className="upload-file-list">
            {files.map((file) => (
              <li key={fileKey(file)} className="upload-file-card">
                <div className="upload-file-card__icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="upload-file-card__body">
                  <p className="upload-file-card__name">
                    {t("upload.selectedFile", { name: file.name })}
                  </p>
                  <p className="upload-file-card__meta">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  className="upload-file-card__remove"
                  aria-label={t("upload.removeFile", { name: file.name })}
                  onClick={() => removeFile(file)}
                >
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <button type="submit" disabled={files.length === 0 || submitting}>
        {submitting ? t("upload.uploading") : t("upload.startTranscription")}
      </button>

      {error ? (
        <p className="upload-error" role="alert">
          {error}
        </p>
      ) : null}

      {jobs.length > 0 ? (
        <div className="upload-success">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            {jobs.length === 1
              ? t("upload.queued")
              : t("upload.queuedMultiple", { count: jobs.length })}{" "}
            {jobs.length > 1 && jobs[0]?.batch_id ? (
              <Link to={`/t/${tenantSlug}/batches/${jobs[0].batch_id}`}>
                {t("upload.openBatch")}
              </Link>
            ) : (
              jobs.map((job, index) => (
                <span key={job.id}>
                  {index > 0 ? ", " : null}
                  <Link to={`/t/${tenantSlug}/jobs/${job.id}`}>
                    {t("upload.openJob")} #{job.id}
                  </Link>
                </span>
              ))
            )}
          </span>
        </div>
      ) : null}
    </form>
  );
}
