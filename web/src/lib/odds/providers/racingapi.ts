/**
 * The Racing API Provider
 * Documentation: https://api.theracingapi.com/documentation
 * Provides Australian horse racing data with odds
 */

const BASE_URL = 'https://api.theracingapi.com/v1';
const USERNAME = process.env.RACINGAPI_USERNAME || '';
const PASSWORD = process.env.RACINGAPI_PASSWORD || '';

// Rate limit: 2 requests per second
const RATE_LIMIT_DELAY = 500; // ms

interface Meet {
  id: string;
  date: string;
  course: string;
  country: string;
  region: string;
}

interface RaceRunner {
  number: number;
  name: string;
  jockey?: string;
  trainer?: string;
  weight?: string;
  odds?: {
    [bookmaker: string]: number;
  };
}

interface Race {
  race_number: number;
  race_time: string;
  distance?: string;
  race_class?: string;
  runners: RaceRunner[];
}

/**
 * Create Basic Auth header
 */
function getAuthHeader(): string {
  const credentials = `${USERNAME}:${PASSWORD}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Make authenticated request to Racing API
 */
async function fetchFromAPI<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Racing API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get today's Australian race meets
 */
export async function getTodaysAustralianMeets(): Promise<Meet[]> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const data = await fetchFromAPI<{ meets: Meet[] }>(`/australia/meets?date=${today}`);
  return data.meets || [];
}

/**
 * Get races for a specific meet
 */
export async function getRacesForMeet(meetId: string): Promise<Race[]> {
  const data = await fetchFromAPI<{ races: Race[] }>(`/australia/meets/${meetId}/races`);
  return data.races || [];
}

/**
 * Get detailed race with odds
 */
export async function getRaceDetails(meetId: string, raceNumber: number): Promise<Race> {
  const data = await fetchFromAPI<Race>(`/australia/meets/${meetId}/races/${raceNumber}`);
  return data;
}

/**
 * Get all today's races with odds (aggregated)
 */
export async function getTodaysRacesWithOdds() {
  const meets = await getTodaysAustralianMeets();

  const allRaces = [];

  for (const meet of meets) {
    // Respect rate limit
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    try {
      const races = await getRacesForMeet(meet.id);

      for (const race of races) {
        allRaces.push({
          id: `${meet.id}-${race.race_number}`,
          meetId: meet.id,
          venue: meet.course,
          raceNumber: race.race_number,
          startTime: race.race_time,
          distance: race.distance || 'Unknown',
          raceClass: race.race_class,
          runners: race.runners.map(runner => ({
            number: runner.number,
            name: runner.name,
            jockey: runner.jockey,
            trainer: runner.trainer,
            weight: runner.weight,
            odds: runner.odds || {},
            bestOdds: Math.max(...Object.values(runner.odds || {})),
            bestBookmaker: Object.entries(runner.odds || {})
              .reduce((best, [bm, odds]) =>
                odds > (best.odds || 0) ? { bookmaker: bm, odds } : best,
                { bookmaker: '', odds: 0 }
              ).bookmaker,
          })),
          status: 'upcoming' as const,
        });
      }
    } catch (error) {
      console.error(`Error fetching races for meet ${meet.id}:`, error);
      // Continue with other meets
    }
  }

  return allRaces;
}

/**
 * Check if Racing API credentials are configured
 */
export function isRacingAPIConfigured(): boolean {
  return Boolean(USERNAME && PASSWORD);
}
