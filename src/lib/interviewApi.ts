import { apiClient } from "./apiClient";
import type {
  InterviewQuestion,
  BehavioralQuestion,
  ResumeParseResponse,
  ResumeApiError,
} from "@/types/interview";

export class ResumeUploadError extends Error {
  code: string;
  /** Weekly limit: next available upload slot (ISO timestamp) */
  nextSlotAt?: string;
  uploadsUsed?: number;
  maxUploadsPerWeek?: number;

  constructor(
    code: string,
    message: string,
    opts?: { nextSlotAt?: string; uploadsUsed?: number; maxUploadsPerWeek?: number }
  ) {
    super(message);
    this.code = code;
    this.nextSlotAt = opts?.nextSlotAt;
    this.uploadsUsed = opts?.uploadsUsed;
    this.maxUploadsPerWeek = opts?.maxUploadsPerWeek;
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
    throw new ResumeUploadError(code, message, {
      nextSlotAt: body?.nextSlotAt,
      uploadsUsed: body?.uploadsUsed,
      maxUploadsPerWeek: body?.maxUploadsPerWeek,
    });
  }

  return (await response.json()) as ResumeParseResponse;
}

export async function fetchRandomQuestion(
  difficulty?: string,
  category?: string
): Promise<InterviewQuestion> {
  const params = new URLSearchParams();
  if (difficulty) params.set("difficulty", difficulty);
  if (category) params.set("category", category);
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

export async function fetchBehavioralQuestion(
  language?: string,
  difficulty?: string
): Promise<BehavioralQuestion> {
  const params = new URLSearchParams();
  if (language) params.set("language", language);
  if (difficulty) params.set("difficulty", difficulty);
  const qs = params.toString();
  const url = `/api/resume/questions/behavioral/random${qs ? `?${qs}` : ""}`;

  const response = await apiClient(url, { method: "GET" });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ResumeApiError | null;
    const code = body?.error ?? "fetch_failed";
    const message = body?.message ?? `Failed to fetch behavioral question (${response.status})`;
    throw new ResumeUploadError(code, message);
  }

  return (await response.json()) as BehavioralQuestion;
}

export async function fetchSession(sessionId: string): Promise<import("@/types/session").Session> {
  const response = await apiClient(`/api/sessions/${sessionId}`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Failed to fetch session (${response.status})`);
  }
  return (await response.json()) as import("@/types/session").Session;
}

export async function analyzeSession(
  sessionId: string,
  reanalyze = false
): Promise<unknown> {
  const params = reanalyze ? "?reanalyze=true" : "";
  const response = await apiClient(`/api/sessions/${sessionId}/analyze${params}`, {
    method: "POST",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message ?? `Analysis failed (${response.status})`);
  }

  return await response.json();
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
