export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobResponse {
  id: number;
  status: JobStatus;
  provider_key: string;
}

export interface JobSummary extends JobResponse {
  upload_id: number;
  original_filename: string;
  created_at: string;
}

export interface JobDetail extends JobResponse {
  upload_id: number;
  original_filename: string;
  error_message?: string | null;
  markdown_path?: string | null;
  transcript_text?: string | null;
}
