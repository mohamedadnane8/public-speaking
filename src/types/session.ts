export type Mode =
  | "EXPLANATION"
  | "STORY"
  | "DEBATE"
  | "ELEVATOR"
  | "SPEED"
  | "MANUAL";

export type SessionType = "General" | "Interview";
export type SessionLanguage = "EN" | "FR" | "AR";
export type SessionDifficulty = "EASY" | "MEDIUM" | "HARD";

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export type SessionStatus = "COMPLETED" | "CANCELLED" | "FAILED";

export type CancelReason =
  | "USER_BACK"
  | "APP_BACKGROUND"
  | "ERROR"
  | "PERMISSION_DENIED"
  | "AUDIO_INTERRUPTED";

export type AudioErrorCode =
  | "MIC_PERMISSION"
  | "REC_START_FAIL"
  | "REC_STOP_FAIL"
  | "INTERRUPTED"
  | "NO_AUDIO"
  | "UNKNOWN";

/** General practice ratings (7 core + 1 bonus) */
export interface SessionRatings {
  opening: RatingValue;
  structure: RatingValue;
  ending: RatingValue;
  confidence: RatingValue;
  clarity: RatingValue;
  authenticity: RatingValue;
  languageExpression: RatingValue;
  passion?: RatingValue;
}

/** Interview STAR framework ratings (6 criteria) */
export interface InterviewRatings {
  relevance: RatingValue;
  situationStakes: RatingValue;
  action: RatingValue;
  resultImpact: RatingValue;
  deliveryComposure: RatingValue;
  conciseness: RatingValue;
}

export interface SessionAudio {
  available: boolean;
  fileUri?: string;
  durationMs?: number;
  recordingStartedAt?: string;
  recordingEndedAt?: string;
  errorCode?: AudioErrorCode;
  objectKey?: string;
  bucketName?: string;
  region?: string;
  uploadedAt?: string;
}

export type TranscriptionStatus = "Pending" | "Processing" | "Completed" | "Failed";

export interface Session {
  id: string;
  createdAt: string;
  completedAt?: string;

  type?: SessionType;
  mode: Mode;
  language: SessionLanguage;
  difficulty: SessionDifficulty;
  word: string;

  thinkSeconds: number;
  speakSeconds: number;

  status: SessionStatus;
  cancelReason?: CancelReason;

  ratings?: SessionRatings;
  interviewRatings?: InterviewRatings;
  overallScore?: number;
  aiScored?: boolean;
  notes?: string;

  audio?: SessionAudio;
  transcript?: string;
  transcriptionStatus?: TranscriptionStatus;
  transcriptionError?: string;
  advice?: string;

  speechAnalysis?: unknown;
  analyzedAt?: string;
}

export type Screen =
  | "HOME"
  | "HISTORY"
  | "FEATURE_REQUEST"
  | "WORD_REVEAL"
  | "THINK"
  | "SPEAK"
  | "PLAYBACK"
  | "REFLECT"
  | "SCORE_SUMMARY"
  | "INTERVIEW_HOME"
  | "INTERVIEW_QUESTION"
  | "INTERVIEW_THINK"
  | "INTERVIEW_SPEAK"
  | "INTERVIEW_PLAYBACK"
  | "INTERVIEW_REFLECT"
  | "INTERVIEW_SCORE";
