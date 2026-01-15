/**
 * Type definitions for the Master Multi Generator system
 */

export interface MultiOutcome {
  sport: string;              // 'EPL', 'AFL', etc.
  sportName: string;          // 'English Premier League'
  sportIcon: string;          // '⚽', '🏉', etc.
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  selection: string;          // Team name or 'Draw'
  selectionType: 'home' | 'away' | 'draw';
  trueProbability: number;    // 0-1, normalized using Power Method
  edge: number;               // Edge = (TP × Best Odds) - 1
  bookmakerOdds: Record<string, number>; // { 'Sportsbet': 2.5, 'TAB': 2.45, ... }
  commenceTime: string;       // ISO timestamp
}

export interface MultiLeg {
  sport: string;
  sportName: string;
  sportIcon: string;
  homeTeam: string;
  awayTeam: string;
  selection: string;
  trueProbability: number;
  edge: number;               // Edge percentage for this selection
  odds: number;               // Decimal odds from selected bookmaker
  commenceTime: string;
}

export interface GeneratedMulti {
  type: 'triple' | 'nickel' | 'dime' | 'score';
  size: number;               // 3, 5, 10, 20
  legs: MultiLeg[];
  bookmaker: string;          // Selected bookmaker name
  totalOdds: number;          // Product of all odds
  successProbability: number; // Product of all true probabilities
  potentialPayout: number;    // totalOdds (assumes $1 bet)
  lastUpdated: string;        // ISO timestamp
  warning?: string;           // e.g., "Only 8 legs available"
}

export interface MultiResponse {
  triple: GeneratedMulti;
  nickel: GeneratedMulti;
  dime: GeneratedMulti;
  score: GeneratedMulti;
  totalOutcomesAvailable: number;
  lastUpdated: string;
}
