/**
 * Probability aggregation logic
 * Ported from Python aggregation.py
 * Simplified for serverless use (no database, live odds only)
 */

import { WeightMap, ProviderOdds, AggregatedOdds } from './types';

export interface ProviderSnapshot {
  provider_id: string;
  home_prob: number;
  away_prob: number;
  draw_prob?: number;
}

/**
 * Aggregate 2-way market probabilities using weighted average
 * @param snapshots List of snapshots with probabilities
 * @param weights Provider weights mapping
 * @returns Tuple of [aggregated_home_prob, aggregated_away_prob]
 */
export function aggregateOdds2Way(
  snapshots: ProviderSnapshot[],
  weights: WeightMap
): [number, number] {
  if (snapshots.length === 0) {
    throw new Error('No snapshots provided for aggregation');
  }

  let weightedHome = 0.0;
  let weightedAway = 0.0;
  let totalWeight = 0.0;

  for (const snapshot of snapshots) {
    const weight = weights[snapshot.provider_id] || 0.0;

    if (weight > 0) {
      weightedHome += snapshot.home_prob * weight;
      weightedAway += snapshot.away_prob * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    // Fallback to equal weights
    const homeSum = snapshots.reduce((sum, s) => sum + s.home_prob, 0);
    const awaySum = snapshots.reduce((sum, s) => sum + s.away_prob, 0);
    const n = snapshots.length;
    return [homeSum / n, awaySum / n];
  }

  // Normalize
  const homeProb = weightedHome / totalWeight;
  const awayProb = weightedAway / totalWeight;

  // Renormalize to handle floating point errors
  const total = homeProb + awayProb;
  return [homeProb / total, awayProb / total];
}

/**
 * Aggregate 3-way market probabilities using weighted average
 * @param snapshots List of snapshots with probabilities
 * @param weights Provider weights mapping
 * @returns Tuple of [aggregated_home_prob, aggregated_draw_prob, aggregated_away_prob]
 */
export function aggregateOdds3Way(
  snapshots: ProviderSnapshot[],
  weights: WeightMap
): [number, number, number] {
  if (snapshots.length === 0) {
    throw new Error('No snapshots provided for aggregation');
  }

  let weightedHome = 0.0;
  let weightedDraw = 0.0;
  let weightedAway = 0.0;
  let totalWeight = 0.0;

  for (const snapshot of snapshots) {
    const weight = weights[snapshot.provider_id] || 0.0;

    if (weight > 0) {
      weightedHome += snapshot.home_prob * weight;
      weightedDraw += (snapshot.draw_prob || 0.0) * weight;
      weightedAway += snapshot.away_prob * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    // Fallback to equal weights
    const homeSum = snapshots.reduce((sum, s) => sum + s.home_prob, 0);
    const drawSum = snapshots.reduce((sum, s) => sum + (s.draw_prob || 0), 0);
    const awaySum = snapshots.reduce((sum, s) => sum + s.away_prob, 0);
    const n = snapshots.length;
    return [homeSum / n, drawSum / n, awaySum / n];
  }

  // Normalize
  const homeProb = weightedHome / totalWeight;
  const drawProb = weightedDraw / totalWeight;
  const awayProb = weightedAway / totalWeight;

  // Renormalize to handle floating point errors
  const total = homeProb + drawProb + awayProb;
  return [homeProb / total, drawProb / total, awayProb / total];
}

/**
 * Calculate the tip (predicted winner) and confidence
 * @param homeProb Home win probability
 * @param awayProb Away win probability
 * @param drawProb Draw probability (optional, for 3-way markets)
 * @returns Object with tip and confidence
 */
export function calculateTip(
  homeProb: number,
  awayProb: number,
  drawProb?: number
): { tip: 'home' | 'away' | 'draw'; confidence: number } {
  if (drawProb !== undefined) {
    // 3-way market
    const maxProb = Math.max(homeProb, drawProb, awayProb);
    if (homeProb === maxProb) {
      return { tip: 'home', confidence: homeProb };
    } else if (drawProb === maxProb) {
      return { tip: 'draw', confidence: drawProb };
    } else {
      return { tip: 'away', confidence: awayProb };
    }
  } else {
    // 2-way market
    if (homeProb > awayProb) {
      return { tip: 'home', confidence: homeProb };
    } else {
      return { tip: 'away', confidence: awayProb };
    }
  }
}

/**
 * Aggregate probabilities from multiple providers
 * Simplified for serverless use - no freshness filtering or snapshot history
 * @param providerOdds Array of odds from different providers
 * @param weights Provider weights
 * @param marketType Market type ('2way' or '3way')
 * @returns Aggregated odds with tip and confidence
 */
export function aggregateProviderOdds(
  providerOdds: ProviderOdds[],
  weights: WeightMap,
  marketType: '2way' | '3way'
): AggregatedOdds {
  if (providerOdds.length === 0) {
    throw new Error('No provider odds available for aggregation');
  }

  // Convert to snapshot format
  const snapshots: ProviderSnapshot[] = providerOdds.map(po => ({
    provider_id: po.provider,
    home_prob: po.probabilities.home,
    away_prob: po.probabilities.away,
    draw_prob: po.probabilities.draw,
  }));

  // Aggregate
  let homeProb: number;
  let awayProb: number;
  let drawProb: number | undefined;

  if (marketType === '3way') {
    [homeProb, drawProb, awayProb] = aggregateOdds3Way(snapshots, weights);
  } else {
    [homeProb, awayProb] = aggregateOdds2Way(snapshots, weights);
    drawProb = undefined;
  }

  // Calculate tip and confidence
  const { tip, confidence } = calculateTip(homeProb, awayProb, drawProb);

  // Get most recent timestamp
  const lastUpdated = providerOdds.reduce((latest, po) => {
    const timestamp = new Date(po.timestamp).getTime();
    return timestamp > new Date(latest).getTime() ? po.timestamp : latest;
  }, providerOdds[0].timestamp);

  return {
    home_prob: homeProb,
    away_prob: awayProb,
    draw_prob: drawProb,
    tip,
    confidence,
    contributing_providers: providerOdds.length,
    last_updated: lastUpdated,
  };
}
