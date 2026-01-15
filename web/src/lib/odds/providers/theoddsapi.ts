/**
 * TheOddsAPI provider client
 * Ported from Python theoddsapi.py
 */

import { TheOddsAPIEvent, ProviderOdds, RawBookmakerOdds } from '../types';
import {
  decimalOddsToImpliedProbability,
  normalizeOdds2Way,
  normalizeOdds3Way,
} from '../conversion';

const BASE_URL = 'https://api.the-odds-api.com/v4';

// Sport keys mapping - includes ALL sports for multi generator
const SPORT_KEYS: { [sport: string]: { [league: string]: string } } = {
  soccer: {
    EPL: 'soccer_epl',
    LA_LIGA: 'soccer_spain_la_liga',
    BUNDESLIGA: 'soccer_germany_bundesliga',
    SERIE_A: 'soccer_italy_serie_a',
    LIGUE_1: 'soccer_france_ligue_one',
    UEFA_CHAMPIONS: 'soccer_uefa_champs_league',
    UEFA_EUROPA: 'soccer_uefa_europa_league',
  },
  afl: {
    AFL: 'aussierules_afl',
  },
  nrl: {
    NRL: 'rugbyleague_nrl',
  },
  americanfootball: {
    NFL: 'americanfootball_nfl',
    NCAAF: 'americanfootball_ncaaf',
  },
  basketball: {
    NBA: 'basketball_nba',
    NCAAB: 'basketball_ncaab',
  },
  baseball: {
    MLB: 'baseball_mlb',
  },
  icehockey: {
    NHL: 'icehockey_nhl',
  },
  rugbyunion: {
    RUGBY: 'rugbyunion_super_rugby',
    RUGBY_UNION: 'rugbyunion_super_rugby',
  },
  rugbyleague: {
    RUGBY_LEAGUE: 'rugbyleague_nrl',
  },
  mma: {
    UFC: 'mma_mixed_martial_arts',
  },
  boxing: {
    BOXING: 'boxing_boxing',
  },
  // tennis: tennis_atp not available in AU region
  cricket: {
    CRICKET: 'cricket_test_match',
  },
  horse_racing: {
    RACING: 'horse_racing_australia',
  },
};

/**
 * Get TheOddsAPI sport key for a given sport and league
 */
function getSportKey(sport: string, league?: string): string | null {
  const sportLower = sport.toLowerCase();

  if (!SPORT_KEYS[sportLower]) {
    return null;
  }

  if (league) {
    return SPORT_KEYS[sportLower][league] || null;
  }

  // Return first league for sport if no specific league requested
  const leagues = Object.values(SPORT_KEYS[sportLower]);
  return leagues.length > 0 ? leagues[0] : null;
}

/**
 * Determine market type based on sport
 */
function getMarketType(sport: string): '2way' | '3way' {
  // Soccer has 3-way markets (home/draw/away)
  // AFL and NRL have 2-way markets (home/away)
  return sport.toLowerCase() === 'soccer' ? '3way' : '2way';
}

/**
 * TheOddsAPI client class
 */
export class TheOddsAPIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('TheOddsAPI key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Fetch upcoming matches for a sport/league
   */
  async fetchMatches(sport: string, league?: string): Promise<TheOddsAPIEvent[]> {
    const sportKey = getSportKey(sport, league);
    if (!sportKey) {
      console.warn(`No sport key found for ${sport}/${league}`);
      return [];
    }

    const url = `${BASE_URL}/sports/${sportKey}/odds`;
    const params = new URLSearchParams({
      apiKey: this.apiKey,
      regions: 'au', // Australian bookmakers
      markets: 'h2h',
      oddsFormat: 'decimal',
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`TheOddsAPI error for ${sportKey}: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`TheOddsAPI error (${sportKey}): ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`TheOddsAPI returned ${data.length} events for ${sportKey}`);
      return data as TheOddsAPIEvent[];
    } catch (error) {
      console.error(`Error fetching matches from TheOddsAPI for ${sportKey}:`, error);
      throw error;
    }
  }

  /**
   * Fetch current odds for a specific match
   */
  async fetchMatchOdds(
    eventId: string,
    sport: string,
    league?: string
  ): Promise<TheOddsAPIEvent | null> {
    const sportKey = getSportKey(sport, league);
    if (!sportKey) {
      console.warn(`No sport key found for ${sport}/${league}`);
      return null;
    }

    const url = `${BASE_URL}/sports/${sportKey}/events/${eventId}/odds`;
    const params = new URLSearchParams({
      apiKey: this.apiKey,
      regions: 'au',
      markets: 'h2h',
      oddsFormat: 'decimal',
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        next: { revalidate: 60 }, // Cache for 1 minute
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`TheOddsAPI error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as TheOddsAPIEvent;
    } catch (error) {
      console.error(`Error fetching odds for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Extract and normalize odds from all bookmakers for an event
   */
  extractBookmakerOdds(event: TheOddsAPIEvent): RawBookmakerOdds[] {
    const odds: RawBookmakerOdds[] = [];

    for (const bookmaker of event.bookmakers) {
      const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
      if (!h2hMarket) {
        continue;
      }

      // Extract outcomes
      const outcomes: { [name: string]: number } = {};
      for (const outcome of h2hMarket.outcomes) {
        outcomes[outcome.name] = outcome.price;
      }

      const homeOdds = outcomes[event.home_team];
      const awayOdds = outcomes[event.away_team];
      const drawOdds = outcomes['Draw'];

      if (!homeOdds || !awayOdds) {
        continue;
      }

      odds.push({
        bookmaker: bookmaker.title,
        home: homeOdds,
        away: awayOdds,
        draw: drawOdds,
        last_update: bookmaker.last_update,
      });
    }

    return odds;
  }

  /**
   * Convert bookmaker odds to provider odds with normalized probabilities
   */
  convertToProviderOdds(
    bookmakerOdds: RawBookmakerOdds[],
    marketType: '2way' | '3way'
  ): ProviderOdds[] {
    return bookmakerOdds.map(bo => {
      // Convert to probabilities
      const homeProb = decimalOddsToImpliedProbability(bo.home);
      const awayProb = decimalOddsToImpliedProbability(bo.away);
      const drawProb = bo.draw ? decimalOddsToImpliedProbability(bo.draw) : undefined;

      // Normalize
      let normalized: {
        home: number;
        away: number;
        draw?: number;
      };

      if (marketType === '3way' && drawProb !== undefined) {
        const [home, draw, away] = normalizeOdds3Way(homeProb, drawProb, awayProb);
        normalized = { home, draw, away };
      } else {
        const [home, away] = normalizeOdds2Way(homeProb, awayProb);
        normalized = { home, away };
      }

      return {
        provider: bo.bookmaker,
        odds: {
          home: bo.home,
          away: bo.away,
          draw: bo.draw,
        },
        probabilities: normalized,
        timestamp: bo.last_update,
      };
    });
  }

  /**
   * Fetch and aggregate odds for a match
   * Returns provider odds ready for aggregation
   */
  async fetchAndExtractOdds(
    eventId: string,
    sport: string,
    league?: string
  ): Promise<ProviderOdds[]> {
    const event = await this.fetchMatchOdds(eventId, sport, league);
    if (!event) {
      return [];
    }

    const bookmakerOdds = this.extractBookmakerOdds(event);
    const marketType = getMarketType(sport);

    return this.convertToProviderOdds(bookmakerOdds, marketType);
  }

  /**
   * Health check - verify API is accessible
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    latency_ms: number;
  }> {
    const url = `${BASE_URL}/sports`;
    const params = new URLSearchParams({
      apiKey: this.apiKey,
    });

    const start = Date.now();

    try {
      const response = await fetch(`${url}?${params}`, {
        next: { revalidate: 0 }, // No cache for health checks
      });

      if (!response.ok) {
        return {
          status: 'unhealthy',
          message: `API returned ${response.status}`,
          latency_ms: Date.now() - start,
        };
      }

      return {
        status: 'healthy',
        message: 'API accessible',
        latency_ms: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - start,
      };
    }
  }
}

/**
 * Get TheOddsAPI client instance
 * Reads API key from environment variables
 */
export function getTheOddsAPIClient(): TheOddsAPIClient {
  const apiKey = process.env.THEODDSAPI_KEY;
  if (!apiKey) {
    throw new Error('THEODDSAPI_KEY environment variable is not set');
  }
  return new TheOddsAPIClient(apiKey);
}
