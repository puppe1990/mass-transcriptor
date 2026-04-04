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

export interface UserSummary {
  id: number;
  name: string;
  email: string;
}

export interface MembershipSummary {
  tenant_id: number;
  user_id: number;
  role: string;
  tenant_slug: string;
}

export interface TenantSummary {
  id: number;
  slug: string;
  name: string;
}

export interface AuthPayload {
  access_token: string;
  token_type: string;
  user: UserSummary;
  memberships: MembershipSummary[];
  tenant: TenantSummary | null;
}
