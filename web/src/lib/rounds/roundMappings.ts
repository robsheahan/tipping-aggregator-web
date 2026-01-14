/**
 * Round/Week mappings for sports
 *
 * This module provides both manual and automatic round detection:
 * 1. Manual mappings (ROUND_MAPPINGS) serve as overrides when provided
 * 2. Automatic detection (generateRoundsFromMatches) creates rounds dynamically
 *    by analyzing match dates and grouping them into weeks/rounds
 */

export interface RoundDefinition {
  roundNumber: number;
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface MatchWithDate {
  commence_time: string;
}

export interface RoundMappings {
  [sportCode: string]: {
    [leagueCode: string]: RoundDefinition[];
  };
}

/**
 * Format a date as "Mon, Jan 15"
 */
function formatMatchDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Create a label for a round based on its date range
 */
function createRoundLabel(startDate: Date, endDate: Date): string {
  const startFormatted = formatMatchDate(startDate);
  const endFormatted = formatMatchDate(endDate);

  // If same day, just show one date
  if (startDate.toDateString() === endDate.toDateString()) {
    return startFormatted;
  }

  // If different days, show range
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Automatically generate rounds by analyzing match dates
 * Groups matches that occur within the same week into rounds
 */
export function generateRoundsFromMatches(
  matches: MatchWithDate[],
  sportCode: string
): RoundDefinition[] {
  if (matches.length === 0) return [];

  // Sort matches by date
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
  );

  const rounds: RoundDefinition[] = [];
  let currentRound: { matches: Date[]; roundNumber: number } | null = null;

  for (const match of sortedMatches) {
    const matchDate = new Date(match.commence_time);

    if (!currentRound) {
      // Start first round
      currentRound = { matches: [matchDate], roundNumber: 1 };
    } else {
      const lastMatchInRound = currentRound.matches[currentRound.matches.length - 1];
      const daysDiff = (matchDate.getTime() - lastMatchInRound.getTime()) / (1000 * 60 * 60 * 24);

      // If match is more than 5 days after the last match in current round, start new round
      if (daysDiff > 5) {
        // Save current round
        const startDate = new Date(Math.min(...currentRound.matches.map(d => d.getTime())));
        const endDate = new Date(Math.max(...currentRound.matches.map(d => d.getTime())));

        rounds.push({
          roundNumber: currentRound.roundNumber,
          label: createRoundLabel(startDate, endDate),
          startDate,
          endDate,
        });

        // Start new round
        currentRound = { matches: [matchDate], roundNumber: currentRound.roundNumber + 1 };
      } else {
        // Add to current round
        currentRound.matches.push(matchDate);
      }
    }
  }

  // Save final round
  if (currentRound) {
    const startDate = new Date(Math.min(...currentRound.matches.map(d => d.getTime())));
    const endDate = new Date(Math.max(...currentRound.matches.map(d => d.getTime())));

    rounds.push({
      roundNumber: currentRound.roundNumber,
      label: createRoundLabel(startDate, endDate),
      startDate,
      endDate,
    });
  }

  return rounds;
}

