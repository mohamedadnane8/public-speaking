import type { SessionRatings, InterviewRatings } from "@/types/session";

/**
 * General session weights (sum to 100%)
 * Passion is a bonus (+5% max = +0.5 on 10-scale)
 */
const GENERAL_WEIGHTS: Record<string, number> = {
  opening: 0.15,
  structure: 0.20,
  ending: 0.15,
  confidence: 0.15,
  clarity: 0.15,
  authenticity: 0.10,
  languageExpression: 0.10,
};

const PASSION_BONUS_WEIGHT = 0.05;

/**
 * Interview STAR weights (sum to 100%)
 */
const INTERVIEW_WEIGHTS: Record<string, number> = {
  relevance: 0.20,
  situationStakes: 0.15,
  action: 0.30,
  resultImpact: 0.20,
  deliveryComposure: 0.10,
  conciseness: 0.05,
};

/** Relevance gate: if relevance = 1, total capped at 4.0 */
const RELEVANCE_GATE_CAP = 4.0;

/**
 * Calculate overall score for General sessions.
 * Each rating (1-5) is weighted, summed, then scaled to 0-10.
 * Passion adds up to +0.5 bonus. Max = 10.5.
 */
export function calculateOverallScore(ratings: SessionRatings): number {
  let weightedSum = 0;
  for (const [key, weight] of Object.entries(GENERAL_WEIGHTS)) {
    const value = ratings[key as keyof SessionRatings];
    if (typeof value === "number") {
      weightedSum += (value / 5) * 10 * weight;
    }
  }

  // Passion bonus
  if (ratings.passion) {
    weightedSum += (ratings.passion / 5) * 10 * PASSION_BONUS_WEIGHT;
  }

  return Math.round(weightedSum * 10) / 10;
}

/**
 * Calculate overall score for Interview sessions.
 * STAR framework with relevance gate. Max = 10.0.
 */
export function calculateInterviewScore(ratings: InterviewRatings): number {
  let weightedSum = 0;
  for (const [key, weight] of Object.entries(INTERVIEW_WEIGHTS)) {
    const value = ratings[key as keyof InterviewRatings];
    if (typeof value === "number") {
      weightedSum += (value / 5) * 10 * weight;
    }
  }

  // Relevance gate: if relevance = 1, cap total at 4.0
  if (ratings.relevance === 1) {
    weightedSum = Math.min(weightedSum, RELEVANCE_GATE_CAP);
  }

  return Math.round(weightedSum * 10) / 10;
}

/**
 * Check if all 7 core General ratings are provided (passion optional)
 */
export function hasAllRatings(ratings: Partial<SessionRatings>): ratings is SessionRatings {
  return (
    ratings.opening !== undefined &&
    ratings.structure !== undefined &&
    ratings.ending !== undefined &&
    ratings.confidence !== undefined &&
    ratings.clarity !== undefined &&
    ratings.authenticity !== undefined &&
    ratings.languageExpression !== undefined
  );
}

/**
 * Check if all 6 Interview ratings are provided
 */
export function hasAllInterviewRatings(ratings: Partial<InterviewRatings>): ratings is InterviewRatings {
  return (
    ratings.relevance !== undefined &&
    ratings.situationStakes !== undefined &&
    ratings.action !== undefined &&
    ratings.resultImpact !== undefined &&
    ratings.deliveryComposure !== undefined &&
    ratings.conciseness !== undefined
  );
}
