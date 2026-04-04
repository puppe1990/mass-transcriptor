import type { JobDetail, JobResponse, JobSummary } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function createUpload(tenantSlug: string, file: File): Promise<JobResponse> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`/t/${tenantSlug}/uploads`, { method: "POST", body });
  return parseJson<JobResponse>(response);
}

export async function listJobs(tenantSlug: string): Promise<JobSummary[]> {
  const response = await fetch(`/t/${tenantSlug}/jobs`);
  return parseJson<JobSummary[]>(response);
}

export async function getJobDetail(tenantSlug: string, jobId: string): Promise<JobDetail> {
  const response = await fetch(`/t/${tenantSlug}/jobs/${jobId}`);
  return parseJson<JobDetail>(response);
}

export async function retryJob(tenantSlug: string, jobId: string): Promise<JobResponse> {
  const response = await fetch(`/t/${tenantSlug}/jobs/${jobId}/retry`, { method: "POST" });
  return parseJson<JobResponse>(response);
}
