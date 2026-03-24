export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  thinkingSeconds: number;
  answeringSeconds: number;
}

/** Behavioral questions from the static pool (no id, no category) */
export interface BehavioralQuestion {
  question: string;
  difficulty: "Easy" | "Medium" | "Hard";
  thinkingSeconds: number;
  answeringSeconds: number;
}

export interface ResumeParseResponse {
  fileName: string;
  contentType: string;
  pageCount: number;
  questionsGenerated: number;
  detectedLanguage: string;
  detectedField: string;
}

export interface ResumeApiError {
  error: string;
  message: string;
  /** Weekly limit fields (429) */
  uploadsUsed?: number;
  maxUploadsPerWeek?: number;
  nextSlotAt?: string;
}
