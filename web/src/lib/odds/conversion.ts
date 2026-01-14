/**
 * Utilities for odds conversion and normalization
 * Ported from Python odds_utils.py
 */

import { OddsData, NormalizedOdds } from './types';

/**
 * Convert decimal odds to implied probability
 * @param odds Decimal odds (e.g., 2.5)
 * @returns Implied probability (0.0 to 1.0)
 */
export function decimalOddsToImpliedProbability(odds: number): number {
  if (odds <= 1.0) {
    throw new Error(`Decimal odds must be > 1.0, got ${odds}`);
  }
  return 1.0 / odds;
}

/**
 * Convert American odds to implied probability
 * @param odds American odds (e.g., +150 or -200)
 * @returns Implied probability (0.0 to 1.0)
 */
export function americanOddsToImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100.0 / (odds + 100.0);
  } else if (odds < 0) {
    return (-odds) / (-odds + 100.0);
  } else {
    throw new Error('American odds cannot be 0');
  }
}

/**
 * Normalize 2-way market probabilities to remove overround/vig
 * @param home Home team implied probability
 * @param away Away team implied probability
 * @returns Tuple of [normalized_home, normalized_away]
 */
export function normalizeOdds2Way(home: number, away: number): [number, number] {
  const total = home + away;
  if (total <= 0) {
    throw new Error(`Total probability must be > 0, got ${total}`);
  }

  return [home / total, away / total];
}

/**
 * Normalize 3-way market probabilities to remove overround/vig
 * @param home Home team implied probability
 * @param draw Draw implied probability
 * @param away Away team implied probability
 * @returns Tuple of [normalized_home, normalized_draw, normalized_away]
 */
export function normalizeOdds3Way(
  home: number,
  draw: number,
  away: number
): [number, number, number] {
  const total = home + draw + away;
  if (total <= 0) {
    throw new Error(`Total probability must be > 0, got ${total}`);
  }

  return [home / total, draw / total, away / total];
}

/**
 * Convert odds to implied probabilities
 * @param oddsData Object with home, away, and optionally draw odds
 * @param marketType Type of odds - 'decimal' or 'american'
 * @returns Object with same keys but probability values
 */
export function convertOddsToProbabilities(
  oddsData: OddsData,
  marketType: 'decimal' | 'american' = 'decimal'
): OddsData {
  const converter = marketType === 'decimal'
    ? decimalOddsToImpliedProbability
    : americanOddsToImpliedProbability;

  const probabilities: OddsData = {
    home: converter(oddsData.home),
    away: converter(oddsData.away),
  };

  if (oddsData.draw !== undefined) {
    probabilities.draw = converter(oddsData.draw);
  }

  return probabilities;
}

/**
 * Normalize market probabilities based on number of outcomes
 * @param probabilities Object with home, away, and optionally draw probabilities
 * @returns Normalized probabilities object
 */
export function normalizeMarketProbabilities(probabilities: OddsData): NormalizedOdds {
  const hasDraw = probabilities.draw !== undefined;

  if (hasDraw) {
    const [home, draw, away] = normalizeOdds3Way(
      probabilities.home,
      probabilities.draw!,
      probabilities.away
    );
    return { home, draw, away };
  } else {
    const [home, away] = normalizeOdds2Way(
      probabilities.home,
      probabilities.away
    );
    return { home, away };
  }
}

/**
 * Calculate the overround (bookmaker margin) from probabilities
 * @param probabilities Object of probabilities
 * @returns Overround as percentage (e.g., 5.0 for 5%)
 */
export function calculateOverround(probabilities: OddsData): number {
  const total = probabilities.home + probabilities.away + (probabilities.draw || 0);
  return (total - 1.0) * 100.0;
}
