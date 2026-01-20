/**
 * Provider weighting logic
 * Simplified for serverless use without historical performance tracking
 */

import { WeightMap } from './types';

/**
 * Get provider weights for a given league and market type
 * Simplified version - uses equal weights for all providers
 * In a full implementation, this would use historical Brier scores
 *
 * @param league League code (e.g., 'AFL', 'NRL')
 * @param marketType Market type (e.g., 'moneyline_2way', 'moneyline_3way')
 * @returns Weight map for providers
 */
export function getProviderWeights(
  league: string,
  marketType: string
): WeightMap {
  // For now, return equal weights for all bookmakers
  // In future, this could be enhanced with:
  // - Historical performance data stored in a database
  // - Dynamic weight calculation based on Brier scores
  // - League-specific and market-specific weighting

  // Equal weight strategy (simplest and safest for MVP)
  return {
    // All bookmakers get equal weight of 1.0
    // When aggregating, we'll use all available bookmaker odds
    default: 1.0,
  };
}

/**
 * Generate weight map for a list of provider IDs
 * @param providerIds List of provider/bookmaker identifiers
 * @param league League code
 * @param marketType Market type
 * @returns Weight map with equal weights for all providers
 */
export function generateWeightMapForProviders(
  providerIds: string[],
  league: string = 'default',
  marketType: string = 'default'
): WeightMap {
  const weights: WeightMap = {};

  // Assign equal weight to each provider
  const equalWeight = 1.0 / providerIds.length;

  for (const providerId of providerIds) {
    weights[providerId] = equalWeight;
  }

  return weights;
}

/**
 * Normalize weights to sum to 1.0
 * @param weights Weight map
 * @returns Normalized weight map
 */
export function normalizeWeights(weights: WeightMap): WeightMap {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

  if (total === 0) {
    throw new Error('Total weight cannot be zero');
  }

  const normalized: WeightMap = {};
  for (const [provider, weight] of Object.entries(weights)) {
    normalized[provider] = weight / total;
  }

  return normalized;
}

/**
 * Apply weight constraints (floor and ceiling)
 * @param weights Weight map
 * @param floor Minimum weight (default: 0.05 or 5%)
 * @param ceiling Maximum weight (default: 0.50 or 50%)
 * @returns Constrained weight map
 */
export function applyWeightConstraints(
  weights: WeightMap,
  floor: number = 0.05,
  ceiling: number = 0.50
): WeightMap {
  const constrained: WeightMap = {};

  for (const [provider, weight] of Object.entries(weights)) {
    constrained[provider] = Math.max(floor, Math.min(ceiling, weight));
  }

  // Renormalize after applying constraints
  return normalizeWeights(constrained);
}

// Future enhancement: Calculate weights based on historical Brier scores
// This would require storing historical performance data
/**
 * Calculate softmax weights from Brier scores (future enhancement)
 * @param brierScores Map of provider to Brier score
 * @param temperature Temperature parameter for softmax (default: 1.0)
 * @returns Weight map
 */
export function calculateSoftmaxWeights(
  brierScores: { [provider: string]: number },
  temperature: number = 1.0
): WeightMap {
  const providers = Object.keys(brierScores);

  // Negate scores (lower Brier is better)
  const negScores = providers.map(p => -brierScores[p] / temperature);

  // Apply softmax
  const maxScore = Math.max(...negScores);
  const expScores = negScores.map(s => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((sum, e) => sum + e, 0);

  const weights: WeightMap = {};
  providers.forEach((provider, i) => {
    weights[provider] = expScores[i] / sumExp;
  });

  return weights;
}
