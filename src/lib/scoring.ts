import type { SessionRatings, RatingValue } from "@/types/session";

/**
 * Convert a 1-5 rating to 0-10 scale
 * converted = (rating / 5) * 10
 */
export function convertRatingToTenScale(rating: RatingValue): number {
  return (rating / 5) * 10;
}

/**
 * Calculate overall score from ratings
 * Average of converted ratings, rounded to 1 decimal
 */
export function calculateOverallScore(ratings: SessionRatings): number {
  const converted = [
    convertRatingToTenScale(ratings.opening),
    convertRatingToTenScale(ratings.structure),
    convertRatingToTenScale(ratings.ending),
    convertRatingToTenScale(ratings.confidence),
    convertRatingToTenScale(ratings.clarity),
    convertRatingToTenScale(ratings.authenticity),
    convertRatingToTenScale(ratings.languageExpression),
  ];
  
  const average = converted.reduce((sum, val) => sum + val, 0) / converted.length;
  return Math.round(average * 10) / 10;
}

/**
 * Check if all 7 ratings are provided
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
