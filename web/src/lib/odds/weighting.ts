/**
 * Provider weighting logic
 * Simplified for serverless use without historical performance tracking
 */

import { WeightMap, ProviderAccuracyRow } from './types';

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

/**
 * Softmax weight calculation.
 * Converts scores to probability-like weights where higher scores get more weight.
 * Temperature controls how much to differentiate: lower temp = more extreme weights.
 */
export function calculateSoftmaxWeights(
  scores: Record<string, number>,
  temperature: number = 0.5
): WeightMap {
  const ids = Object.keys(scores);
  if (ids.length === 0) return {};

  // Find max for numerical stability
  const maxScore = Math.max(...Object.values(scores));

  const expValues: Record<string, number> = {};
  let sumExp = 0;

  for (const id of ids) {
    const exp = Math.exp((scores[id] - maxScore) / temperature);
    expValues[id] = exp;
    sumExp += exp;
  }

  const weights: WeightMap = {};
  for (const id of ids) {
    weights[id] = expValues[id] / sumExp;
  }

  return weights;
}

/**
 * Generate dynamic weights based on historical Brier scores.
 * Falls back to equal weights when insufficient history exists.
 *
 * Lower Brier score = better accuracy = higher weight.
 * Uses softmax on negated Brier scores so lower scores get higher weights.
 */
export function getDynamicWeights(
  providerIds: string[],
  accuracyData: ProviderAccuracyRow[],
  minSampleSize: number = 20,
  temperature: number = 0.5,
  weightFloor: number = 0.03,
  weightCeiling: number = 0.40
): WeightMap {
  if (providerIds.length === 0) return {};

  // Build lookup of provider -> accuracy data
  const accuracyMap = new Map<string, ProviderAccuracyRow>();
  for (const row of accuracyData) {
    if (row.provider_type === 'bookmaker') {
      accuracyMap.set(row.provider_name, row);
    }
  }

  // Separate into qualified (enough history) and unqualified
  const qualified: { id: string; brierAvg: number }[] = [];
  const unqualified: string[] = [];

  for (const id of providerIds) {
    const acc = accuracyMap.get(id);
    if (acc && acc.total_predictions >= minSampleSize && acc.brier_score_avg != null) {
      qualified.push({ id, brierAvg: acc.brier_score_avg });
    } else {
      unqualified.push(id);
    }
  }

  // Need at least 3 qualified providers to use dynamic weighting
  if (qualified.length < 3) {
    return generateWeightMapForProviders(providerIds);
  }

  // Calculate softmax weights from negated Brier scores
  // (negate because lower Brier = better, but softmax rewards higher values)
  const negatedScores: Record<string, number> = {};
  for (const q of qualified) {
    negatedScores[q.id] = -q.brierAvg;
  }

  const softmaxWeights = calculateSoftmaxWeights(negatedScores, temperature);

  // Apply floor/ceiling constraints
  const constrained = applyWeightConstraints(softmaxWeights, weightFloor, weightCeiling);

  // Assign unqualified providers the median weight from qualified set
  const qualifiedWeightValues = Object.values(constrained).sort((a, b) => a - b);
  const medianWeight =
    qualifiedWeightValues.length % 2 === 0
      ? (qualifiedWeightValues[qualifiedWeightValues.length / 2 - 1] +
         qualifiedWeightValues[qualifiedWeightValues.length / 2]) /
        2
      : qualifiedWeightValues[Math.floor(qualifiedWeightValues.length / 2)];

  const finalWeights: WeightMap = { ...constrained };
  for (const id of unqualified) {
    finalWeights[id] = medianWeight;
  }

  // Normalize to sum to 1.0
  return normalizeWeights(finalWeights);
}
