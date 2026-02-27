export type Mode = 
  | "EXPLANATION"
  | "STORY"
  | "DEBATE"
  | "ELEVATOR"
  | "SPEED"
  | "MANUAL";

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

export interface SessionRatings {
  opening: RatingValue;
  structure: RatingValue;
  ending: RatingValue;
  confidence: RatingValue;
  clarity: RatingValue;
  authenticity: RatingValue;
  languageExpression: RatingValue;
}

export interface SessionAudio {
  available: boolean;
  fileUri?: string;
  durationMs?: number;
  recordingStartedAt?: string;
  recordingEndedAt?: string;
  errorCode?: AudioErrorCode;
}

export interface Session {
  id: string;
  createdAt: string;
  completedAt?: string;

  mode: Mode;
  word: string;

  thinkSeconds: number;
  speakSeconds: number;

  status: SessionStatus;
  cancelReason?: CancelReason;

  ratings?: SessionRatings;
  overallScore?: number;
  notes?: string;

  audio?: SessionAudio;
}

export type Screen = 
  | "HOME"
  | "WORD_REVEAL"
  | "THINK"
  | "SPEAK"
  | "PLAYBACK"
  | "REFLECT"
  | "SCORE_SUMMARY";
