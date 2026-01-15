/**
 * Master Multi Generator - Core Logic
 * Generates Triple/Nickel/Dime/Score multis from all sports
 */

import { MultiOutcome, MultiLeg, GeneratedMulti, MultiResponse } from './types';
import { SportConfig } from '../config/sports';
import { getTheOddsAPIClient } from '../odds/providers/theoddsapi';
import { normalizeOdds2Way, normalizeOdds3Way } from '../odds/conversion';

/**
 * Fetches all upcoming matches across all sports and flattens to individual outcomes
 */
export async function getAllUpcomingOutcomes(sports: SportConfig[]): Promise<MultiOutcome[]> {
  const client = getTheOddsAPIClient();
  const allOutcomes: MultiOutcome[] = [];

  // Fetch matches for all sports in parallel
  const matchesBySport = await Promise.all(
    sports.map(async (sport) => {
      try {
        const events = await client.fetchMatches(sport.theoddsapiSport, sport.theoddsapiKey);
        return { sport, events };
      } catch (error) {
        console.error(`Error fetching ${sport.code} matches:`, error);
        return { sport, events: [] };
      }
    })
  );

  // Process each sport's matches
  for (const { sport, events } of matchesBySport) {
    for (const event of events) {
      try {
        // Extract bookmaker odds
        const bookmakerOdds = client.extractBookmakerOdds(event);

        if (bookmakerOdds.length === 0) {
          continue; // Skip matches without odds
        }

        // Determine market type
        const is3Way = sport.marketType === '3way';
        const hasDrawOdds = bookmakerOdds.some((b) => b.draw !== undefined);

        // Calculate average odds for each outcome across all bookmakers
        const avgHomeOdds = bookmakerOdds.reduce((sum, b) => sum + b.home, 0) / bookmakerOdds.length;
        const avgAwayOdds = bookmakerOdds.reduce((sum, b) => sum + b.away, 0) / bookmakerOdds.length;
        const avgDrawOdds = hasDrawOdds && is3Way
          ? bookmakerOdds.reduce((sum, b) => sum + (b.draw || 0), 0) / bookmakerOdds.length
          : undefined;

        // Calculate true probabilities (remove bookmaker margin)
        let homeProb, awayProb, drawProb;
        if (is3Way && avgDrawOdds) {
          [homeProb, drawProb, awayProb] = normalizeOdds3Way(avgHomeOdds, avgDrawOdds, avgAwayOdds);
        } else {
          [homeProb, awayProb] = normalizeOdds2Way(avgHomeOdds, avgAwayOdds);
        }

        // Create bookmaker odds map for each outcome
        const homeBookmakerOdds: Record<string, number> = {};
        const awayBookmakerOdds: Record<string, number> = {};
        const drawBookmakerOdds: Record<string, number> = {};

        for (const odds of bookmakerOdds) {
          homeBookmakerOdds[odds.bookmaker] = odds.home;
          awayBookmakerOdds[odds.bookmaker] = odds.away;
          if (odds.draw) {
            drawBookmakerOdds[odds.bookmaker] = odds.draw;
          }
        }

        // Create outcome objects
        allOutcomes.push({
          sport: sport.code,
          sportName: sport.name,
          sportIcon: sport.icon,
          matchId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          selection: event.home_team,
          selectionType: 'home',
          trueProbability: homeProb,
          bookmakerOdds: homeBookmakerOdds,
          commenceTime: event.commence_time,
        });

        allOutcomes.push({
          sport: sport.code,
          sportName: sport.name,
          sportIcon: sport.icon,
          matchId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          selection: event.away_team,
          selectionType: 'away',
          trueProbability: awayProb,
          bookmakerOdds: awayBookmakerOdds,
          commenceTime: event.commence_time,
        });

        // Add draw outcome if applicable
        if (drawProb && Object.keys(drawBookmakerOdds).length > 0) {
          allOutcomes.push({
            sport: sport.code,
            sportName: sport.name,
            sportIcon: sport.icon,
            matchId: event.id,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            selection: 'Draw',
            selectionType: 'draw',
            trueProbability: drawProb,
            bookmakerOdds: drawBookmakerOdds,
            commenceTime: event.commence_time,
          });
        }
      } catch (error) {
        console.error(`Error processing match ${event.id}:`, error);
      }
    }
  }

  // Sort by true probability descending
  allOutcomes.sort((a, b) => b.trueProbability - a.trueProbability);

  return allOutcomes;
}

/**
 * Selects the best bookmaker for a multi (highest total odds)
 */
export function selectBestBookmakerForMulti(
  outcomes: MultiOutcome[]
): { bookmaker: string; totalOdds: number } | null {
  if (outcomes.length === 0) {
    return null;
  }

  // Get all unique bookmakers
  const allBookmakers = new Set<string>();
  for (const outcome of outcomes) {
    Object.keys(outcome.bookmakerOdds).forEach((b) => allBookmakers.add(b));
  }

  let bestBookmaker = '';
  let bestTotalOdds = 0;

  // Test each bookmaker (convert Set to Array for iteration)
  for (const bookmaker of Array.from(allBookmakers)) {
    // Check if this bookmaker has odds for ALL outcomes
    let hasAllOdds = true;
    let totalOdds = 1.0;

    for (const outcome of outcomes) {
      const odds = outcome.bookmakerOdds[bookmaker];
      if (!odds || odds <= 1.0) {
        hasAllOdds = false;
        break;
      }
      totalOdds *= odds;
    }

    if (hasAllOdds && totalOdds > bestTotalOdds) {
      bestTotalOdds = totalOdds;
      bestBookmaker = bookmaker;
    }
  }

  // If no bookmaker covers all outcomes, use most common bookmaker
  if (!bestBookmaker) {
    const bookmakerCounts = new Map<string, number>();
    for (const outcome of outcomes) {
      for (const bookmaker of Object.keys(outcome.bookmakerOdds)) {
        bookmakerCounts.set(bookmaker, (bookmakerCounts.get(bookmaker) || 0) + 1);
      }
    }

    let maxCount = 0;
    for (const [bookmaker, count] of Array.from(bookmakerCounts.entries())) {
      if (count > maxCount) {
        maxCount = count;
        bestBookmaker = bookmaker;
      }
    }

    // Calculate total odds for this bookmaker
    let totalOdds = 1.0;
    for (const outcome of outcomes) {
      const odds = outcome.bookmakerOdds[bestBookmaker];
      if (odds && odds > 1.0) {
        totalOdds *= odds;
      } else {
        // Use average odds as fallback
        const avgOdds = Object.values(outcome.bookmakerOdds).reduce((a, b) => a + b, 0) /
                        Object.values(outcome.bookmakerOdds).length;
        totalOdds *= avgOdds;
      }
    }
    bestTotalOdds = totalOdds;
  }

  return { bookmaker: bestBookmaker, totalOdds: bestTotalOdds };
}

/**
 * Generates a multi of given size from outcomes
 */
export function generateMulti(
  outcomes: MultiOutcome[],
  size: number,
  type: 'triple' | 'nickel' | 'dime' | 'score'
): GeneratedMulti {
  // Take top N outcomes
  const selectedOutcomes = outcomes.slice(0, size);

  // Check if we have enough outcomes
  let warning: string | undefined;
  if (selectedOutcomes.length < size) {
    warning = `Only ${selectedOutcomes.length} ${selectedOutcomes.length === 1 ? 'leg' : 'legs'} available`;
  }

  // Select best bookmaker
  const bookmakerResult = selectBestBookmakerForMulti(selectedOutcomes);

  if (!bookmakerResult) {
    // No bookmakers available - return empty multi
    return {
      type,
      size,
      legs: [],
      bookmaker: 'None',
      totalOdds: 0,
      successProbability: 0,
      potentialPayout: 0,
      lastUpdated: new Date().toISOString(),
      warning: warning || 'No bookmakers available',
    };
  }

  const { bookmaker, totalOdds } = bookmakerResult;

  // Build legs
  const legs: MultiLeg[] = selectedOutcomes.map((outcome) => ({
    sport: outcome.sport,
    sportName: outcome.sportName,
    sportIcon: outcome.sportIcon,
    homeTeam: outcome.homeTeam,
    awayTeam: outcome.awayTeam,
    selection: outcome.selection,
    trueProbability: outcome.trueProbability,
    odds: outcome.bookmakerOdds[bookmaker] || 0,
    commenceTime: outcome.commenceTime,
  }));

  // Calculate success probability (product of true probabilities)
  const successProbability = legs.reduce((prod, leg) => prod * leg.trueProbability, 1.0);

  return {
    type,
    size,
    legs,
    bookmaker,
    totalOdds,
    successProbability,
    potentialPayout: totalOdds,
    lastUpdated: new Date().toISOString(),
    warning,
  };
}

/**
 * Generates all 4 multi types from outcomes
 */
export function generateAllMultis(outcomes: MultiOutcome[]): MultiResponse {
  const triple = generateMulti(outcomes, 3, 'triple');
  const nickel = generateMulti(outcomes, 5, 'nickel');
  const dime = generateMulti(outcomes, 10, 'dime');
  const score = generateMulti(outcomes, 20, 'score');

  return {
    triple,
    nickel,
    dime,
    score,
    totalOutcomesAvailable: outcomes.length,
    lastUpdated: new Date().toISOString(),
  };
}
