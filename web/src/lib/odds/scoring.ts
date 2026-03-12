/**
 * Scoring utilities for accuracy tracking
 * Brier score: measures accuracy of probabilistic predictions
 * Range: 0 (perfect) to 2 (maximally wrong)
 */

import { decimalOddsToImpliedProbability, normalizeOdds2Way } from './conversion';

export function determineWinner(
  homeScore: number,
  awayScore: number
): 'home' | 'away' | 'draw' {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

/**
 * Calculate Brier score for a 2-way market prediction.
 * BS = (p_home - actual_home)^2 + (p_away - actual_away)^2
 * where actual is 1 for winner, 0 for loser (0.5 each for draw)
 */
export function calculateBrierScore2Way(
  predictedHome: number,
  predictedAway: number,
  actualWinner: 'home' | 'away' | 'draw'
): number {
  let actualHome: number;
  let actualAway: number;

  if (actualWinner === 'home') {
    actualHome = 1;
    actualAway = 0;
  } else if (actualWinner === 'away') {
    actualHome = 0;
    actualAway = 1;
  } else {
    actualHome = 0.5;
    actualAway = 0.5;
  }

  return (
    Math.pow(predictedHome - actualHome, 2) +
    Math.pow(predictedAway - actualAway, 2)
  );
}

/**
 * Convert raw decimal odds to normalized probabilities
 */
export function oddsToNormalizedProbs(
  homeOdds: number,
  awayOdds: number
): { home: number; away: number } {
  const homeProb = decimalOddsToImpliedProbability(homeOdds);
  const awayProb = decimalOddsToImpliedProbability(awayOdds);
  const [normalizedHome, normalizedAway] = normalizeOdds2Way(homeProb, awayProb);
  return { home: normalizedHome, away: normalizedAway };
}

/**
 * Determine if a prediction was correct (predicted winner matches actual)
 */
export function predictionCorrect(
  predictedHome: number,
  predictedAway: number,
  actualWinner: 'home' | 'away' | 'draw'
): boolean {
  const predictedWinner = predictedHome > predictedAway ? 'home' : 'away';
  return predictedWinner === actualWinner;
}
