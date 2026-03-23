export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  thinkingSeconds: number;
  answeringSeconds: number;
}

export interface ResumeParseResponse {
  fileName: string;
  contentType: string;
  content: string;
  pageCount: number;
  questions: InterviewQuestion[];
}

export interface ResumeApiError {
  error: string;
  message: string;
  nextAllowedAt?: string;
}
