/**
 * Master Multi Generator - Core Logic
 * Generates Triple/Nickel/Dime/Score multis from ALL sports
 */

import { MultiOutcome, MultiLeg, GeneratedMulti, MultiResponse } from './types';
import { getTheOddsAPIClient } from '../odds/providers/theoddsapi';
import {
  powerMethodNormalization,
  calculateEdge,
} from '../odds/conversion';

/**
 * All available sports from The Odds API
 * This includes many more than what's configured on the site
 */
const ALL_SPORTS = [
  // Soccer
  { code: 'EPL', name: 'English Premier League', icon: '⚽', sport: 'soccer', key: 'soccer_epl', marketType: '3way' as const },
  { code: 'LA_LIGA', name: 'La Liga', icon: '⚽', sport: 'soccer', key: 'soccer_spain_la_liga', marketType: '3way' as const },
  { code: 'BUNDESLIGA', name: 'Bundesliga', icon: '⚽', sport: 'soccer', key: 'soccer_germany_bundesliga', marketType: '3way' as const },
  { code: 'SERIE_A', name: 'Serie A', icon: '⚽', sport: 'soccer', key: 'soccer_italy_serie_a', marketType: '3way' as const },
  { code: 'LIGUE_1', name: 'Ligue 1', icon: '⚽', sport: 'soccer', key: 'soccer_france_ligue_one', marketType: '3way' as const },
  { code: 'UEFA_CHAMPIONS', name: 'UEFA Champions League', icon: '⚽', sport: 'soccer', key: 'soccer_uefa_champs_league', marketType: '3way' as const },
  { code: 'UEFA_EUROPA', name: 'UEFA Europa League', icon: '⚽', sport: 'soccer', key: 'soccer_uefa_europa_league', marketType: '3way' as const },

  // Australian Sports
  { code: 'AFL', name: 'Australian Football League', icon: '🏉', sport: 'afl', key: 'aussierules_afl', marketType: '2way' as const },
  { code: 'NRL', name: 'National Rugby League', icon: '🏉', sport: 'nrl', key: 'rugbyleague_nrl', marketType: '2way' as const },

  // American Sports
  { code: 'NFL', name: 'NFL', icon: '🏈', sport: 'americanfootball', key: 'americanfootball_nfl', marketType: '2way' as const },
  { code: 'NBA', name: 'NBA', icon: '🏀', sport: 'basketball', key: 'basketball_nba', marketType: '2way' as const },
  { code: 'MLB', name: 'MLB', icon: '⚾', sport: 'baseball', key: 'baseball_mlb', marketType: '2way' as const },
  { code: 'NHL', name: 'NHL', icon: '🏒', sport: 'icehockey', key: 'icehockey_nhl', marketType: '2way' as const },
  { code: 'NCAAF', name: 'NCAA Football', icon: '🏈', sport: 'americanfootball', key: 'americanfootball_ncaaf', marketType: '2way' as const },
  { code: 'NCAAB', name: 'NCAA Basketball', icon: '🏀', sport: 'basketball', key: 'basketball_ncaab', marketType: '2way' as const },

  // Rugby
  { code: 'RUGBY_UNION', name: 'Rugby Union', icon: '🏉', sport: 'rugbyunion', key: 'rugbyunion_super_rugby', marketType: '2way' as const },
  { code: 'RUGBY_LEAGUE', name: 'Rugby League', icon: '🏉', sport: 'rugbyleague', key: 'rugbyleague_nrl', marketType: '2way' as const },

  // Other Popular Sports
  { code: 'UFC', name: 'UFC/MMA', icon: '🥊', sport: 'mma', key: 'mma_mixed_martial_arts', marketType: '2way' as const },
  { code: 'BOXING', name: 'Boxing', icon: '🥊', sport: 'boxing', key: 'boxing_boxing', marketType: '2way' as const },
  // Tennis removed - tennis_atp not available in AU region
  { code: 'CRICKET', name: 'Cricket', icon: '🏏', sport: 'cricket', key: 'cricket_test_match', marketType: '2way' as const },
];

/**
 * Fetches all upcoming matches across ALL sports and flattens to individual outcomes
 * Only includes matches within the next 7 days
 */
export async function getAllUpcomingOutcomes(): Promise<MultiOutcome[]> {
  const client = getTheOddsAPIClient();
  const allOutcomes: MultiOutcome[] = [];

  // Calculate cutoff date (7 days from now)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch matches for all sports in parallel
  const matchesBySport = await Promise.all(
    ALL_SPORTS.map(async (sport) => {
      try {
        const events = await client.fetchMatches(sport.sport, sport.code);
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
        // Filter: Only matches within next 7 days
        const matchDate = new Date(event.commence_time);
        if (matchDate < now || matchDate > sevenDaysFromNow) {
          continue; // Skip matches outside 7-day window
        }

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

        // Use Power Method for margin removal (more accurate for favorites)
        let homeProb, awayProb, drawProb;
        if (is3Way && avgDrawOdds) {
          // 3-way market: home, draw, away
          const allOdds = [avgHomeOdds, avgDrawOdds, avgAwayOdds];
          const trueProbabilities = powerMethodNormalization(allOdds);
          [homeProb, drawProb, awayProb] = trueProbabilities;
        } else {
          // 2-way market: home, away
          const allOdds = [avgHomeOdds, avgAwayOdds];
          const trueProbabilities = powerMethodNormalization(allOdds);
          [homeProb, awayProb] = trueProbabilities;
        }

        // Get best odds across all bookmakers for edge calculation
        const bestHomeOdds = Math.max(...bookmakerOdds.map(b => b.home));
        const bestAwayOdds = Math.max(...bookmakerOdds.map(b => b.away));
        const bestDrawOdds = hasDrawOdds && is3Way
          ? Math.max(...bookmakerOdds.filter(b => b.draw).map(b => b.draw!))
          : undefined;

        // Calculate Edge for each outcome
        const homeEdge = calculateEdge(homeProb, bestHomeOdds);
        const awayEdge = calculateEdge(awayProb, bestAwayOdds);
        const drawEdge = drawProb && bestDrawOdds ? calculateEdge(drawProb, bestDrawOdds) : undefined;

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

        // Create outcome objects with Edge values
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
          edge: homeEdge,
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
          edge: awayEdge,
          bookmakerOdds: awayBookmakerOdds,
          commenceTime: event.commence_time,
        });

        // Add draw outcome if applicable
        if (drawProb && drawEdge !== undefined && Object.keys(drawBookmakerOdds).length > 0) {
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
            edge: drawEdge,
            bookmakerOdds: drawBookmakerOdds,
            commenceTime: event.commence_time,
          });
        }
      } catch (error) {
        console.error(`Error processing match ${event.id}:`, error);
      }
    }
  }

  // FILTER: Only outcomes with True Probability > 65%
  const filteredOutcomes = allOutcomes.filter(outcome => outcome.trueProbability > 0.65);

  // SORT: By Edge (highest to lowest) - prioritize value, not just probability
  filteredOutcomes.sort((a, b) => b.edge - a.edge);

  console.log(`Filtered to ${filteredOutcomes.length} high-probability outcomes (TP > 65%), sorted by Edge`);

  return filteredOutcomes;
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

  // Build legs with Edge values
  const legs: MultiLeg[] = selectedOutcomes.map((outcome) => ({
    sport: outcome.sport,
    sportName: outcome.sportName,
    sportIcon: outcome.sportIcon,
    homeTeam: outcome.homeTeam,
    awayTeam: outcome.awayTeam,
    selection: outcome.selection,
    trueProbability: outcome.trueProbability,
    edge: outcome.edge,
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
