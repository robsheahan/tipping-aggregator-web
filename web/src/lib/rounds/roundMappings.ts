/**
 * Round/Week mappings for sports
 *
 * IMPORTANT: TheOddsAPI doesn't provide round data, so we manually map
 * rounds/weeks based on date ranges. Update this file as seasons progress.
 *
 * TODO: Research and populate accurate season dates for all sports
 */

export interface RoundDefinition {
  roundNumber: number;
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface RoundMappings {
  [sportCode: string]: {
    [leagueCode: string]: RoundDefinition[];
  };
}

export const ROUND_MAPPINGS: RoundMappings = {
  EPL: {
    EPL: [
      {
        roundNumber: 1,
        label: 'Matchweek 1',
        startDate: new Date('2025-08-09'),
        endDate: new Date('2025-08-11'),
      },
      {
        roundNumber: 2,
        label: 'Matchweek 2',
        startDate: new Date('2025-08-16'),
        endDate: new Date('2025-08-18'),
      },
      // TODO: Add remaining matchweeks (typically 38 total)
    ],
  },
  AFL: {
    AFL: [
      {
        roundNumber: 1,
        label: 'Round 1',
        startDate: new Date('2026-03-12'),
        endDate: new Date('2026-03-15'),
      },
      {
        roundNumber: 2,
        label: 'Round 2',
        startDate: new Date('2026-03-19'),
        endDate: new Date('2026-03-22'),
      },
      // TODO: Add remaining rounds (typically 23 regular season rounds)
    ],
  },
  NRL: {
    NRL: [
      {
        roundNumber: 1,
        label: 'Round 1',
        startDate: new Date('2026-03-05'),
        endDate: new Date('2026-03-08'),
      },
      {
        roundNumber: 2,
        label: 'Round 2',
        startDate: new Date('2026-03-12'),
        endDate: new Date('2026-03-15'),
      },
      // TODO: Add remaining rounds (typically 27 rounds)
    ],
  },
  NFL: {
    NFL: [
      {
        roundNumber: 1,
        label: 'Week 1',
        startDate: new Date('2025-09-04'),
        endDate: new Date('2025-09-08'),
      },
      {
        roundNumber: 2,
        label: 'Week 2',
        startDate: new Date('2025-09-11'),
        endDate: new Date('2025-09-15'),
      },
      // TODO: Add remaining weeks (18 regular season weeks)
    ],
  },
  NBA: {
    NBA: [
      {
        roundNumber: 1,
        label: 'Week 1',
        startDate: new Date('2025-10-22'),
        endDate: new Date('2025-10-28'),
      },
      {
        roundNumber: 2,
        label: 'Week 2',
        startDate: new Date('2025-10-29'),
        endDate: new Date('2025-11-04'),
      },
      // TODO: Add remaining weeks (season runs Oct-Apr, ~26 weeks)
    ],
  },
  RUGBY: {
    RUGBY: [
      {
        roundNumber: 1,
        label: 'Round 1',
        startDate: new Date('2026-02-13'),
        endDate: new Date('2026-02-15'),
      },
      {
        roundNumber: 2,
        label: 'Round 2',
        startDate: new Date('2026-02-20'),
        endDate: new Date('2026-02-22'),
      },
      // TODO: Add remaining rounds (Super Rugby typically has ~18 rounds)
    ],
  },
};

/**
 * Get rounds for a specific sport/league
 */
export function getRoundsForLeague(
  sportCode: string,
  leagueCode: string
): RoundDefinition[] {
  return ROUND_MAPPINGS[sportCode]?.[leagueCode] || [];
}

/**
 * Determine which round a given date falls into
 */
export function getRoundForDate(
  sportCode: string,
  leagueCode: string,
  date: Date
): RoundDefinition | null {
  const rounds = getRoundsForLeague(sportCode, leagueCode);
  return (
    rounds.find(
      (round) => date >= round.startDate && date <= round.endDate
    ) || null
  );
}

/**
 * Get current round (based on today's date)
 */
export function getCurrentRound(
  sportCode: string,
  leagueCode: string
): RoundDefinition | null {
  return getRoundForDate(sportCode, leagueCode, new Date());
}
