import { getAccessToken } from "./auth";
import type { AuthPayload, JobDetail, JobResponse, JobSummary } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function buildHeaders(init?: HeadersInit): HeadersInit {
  const token = getAccessToken();
  return token ? { ...init, Authorization: `Bearer ${token}` } : init ?? {};
}

export async function createUpload(tenantSlug: string, file: File): Promise<JobResponse> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`/t/${tenantSlug}/uploads`, { method: "POST", body, headers: buildHeaders() });
  return parseJson<JobResponse>(response);
}

export async function listJobs(tenantSlug: string): Promise<JobSummary[]> {
  const response = await fetch(`/t/${tenantSlug}/jobs`, { headers: buildHeaders() });
  return parseJson<JobSummary[]>(response);
}

export async function getJobDetail(tenantSlug: string, jobId: string): Promise<JobDetail> {
  const response = await fetch(`/t/${tenantSlug}/jobs/${jobId}`, { headers: buildHeaders() });
  return parseJson<JobDetail>(response);
}

export async function retryJob(tenantSlug: string, jobId: string): Promise<JobResponse> {
  const response = await fetch(`/t/${tenantSlug}/jobs/${jobId}/retry`, { method: "POST", headers: buildHeaders() });
  return parseJson<JobResponse>(response);
}

export async function signUp(payload: Record<string, string>): Promise<AuthPayload> {
  const response = await fetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<AuthPayload>(response);
}

export async function signIn(payload: Record<string, string>): Promise<AuthPayload> {
  const response = await fetch("/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<AuthPayload>(response);
}
