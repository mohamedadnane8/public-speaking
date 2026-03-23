import { apiClient } from "./apiClient";
import type {
  InterviewQuestion,
  ResumeParseResponse,
  ResumeApiError,
} from "@/types/interview";

export class ResumeUploadError extends Error {
  code: string;
  nextAllowedAt?: string;

  constructor(code: string, message: string, nextAllowedAt?: string) {
    super(message);
    this.code = code;
    this.nextAllowedAt = nextAllowedAt;
  }
}

export async function parseResume(file: File): Promise<ResumeParseResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient("/api/resume/parse", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ResumeApiError | null;
    const code = body?.error ?? "parse_failed";
    const message = body?.message ?? `Resume upload failed (${response.status})`;
    throw new ResumeUploadError(code, message, body?.nextAllowedAt);
  }

  return (await response.json()) as ResumeParseResponse;
}

export async function fetchRandomQuestion(
  difficulty?: string
): Promise<InterviewQuestion> {
  const params = new URLSearchParams();
  if (difficulty) params.set("difficulty", difficulty);
  const qs = params.toString();
  const url = `/api/resume/questions/random${qs ? `?${qs}` : ""}`;

  const response = await apiClient(url, { method: "GET" });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ResumeApiError | null;
    const code = body?.error ?? "fetch_failed";
    const message = body?.message ?? `Failed to fetch question (${response.status})`;
    throw new ResumeUploadError(code, message);
  }

  return (await response.json()) as InterviewQuestion;
}

export async function fetchCategories(): Promise<string[]> {
  const response = await apiClient("/api/resume/questions/categories", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories (${response.status})`);
  }

  return (await response.json()) as string[];
}
