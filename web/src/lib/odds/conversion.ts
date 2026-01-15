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

/**
 * Power Method for margin removal (more accurate for favorites)
 * Solves for k in: sum((1/odds_i)^k) = 1
 * Then calculates true probability: TP_i = (1/odds_i)^k
 *
 * @param odds Array of decimal odds for all outcomes
 * @returns Array of true probabilities using Power Method
 */
export function powerMethodNormalization(odds: number[]): number[] {
  // Convert odds to implied probabilities
  const impliedProbs = odds.map(o => 1.0 / o);

  // Binary search to find k such that sum((p_i)^k) = 1
  let kLow = 0.1;
  let kHigh = 10.0;
  let k = 1.0;
  const tolerance = 0.0001;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    k = (kLow + kHigh) / 2.0;

    // Calculate sum of p^k
    const sum = impliedProbs.reduce((acc, p) => acc + Math.pow(p, k), 0);

    if (Math.abs(sum - 1.0) < tolerance) {
      break; // Found k
    }

    if (sum > 1.0) {
      kLow = k; // k too low, increase
    } else {
      kHigh = k; // k too high, decrease
    }
  }

  // Calculate true probabilities using found k
  return impliedProbs.map(p => Math.pow(p, k));
}

/**
 * Calculate Edge for a selection
 * Edge = (True Probability × Best Market Odds) - 1
 *
 * @param trueProbability True probability after margin removal
 * @param bestOdds Best available odds in market
 * @returns Edge as decimal (e.g., 0.042 for 4.2% edge)
 */
export function calculateEdge(trueProbability: number, bestOdds: number): number {
  return (trueProbability * bestOdds) - 1.0;
}
