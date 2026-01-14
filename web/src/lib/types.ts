/**
 * Frontend types for serverless architecture
 * Simplified - no database IDs, live odds only
 */

export interface League {
  id: number;
  name: string;
  sport: string;
  code: string;
  country?: string;
  icon?: string;
  color?: string;
  displayName?: string;
}

export interface TeamInfo {
  name: string;
}

export interface Match {
  id: string;
  home_team: TeamInfo;
  away_team: TeamInfo;
  league: {
    code: string;
    name: string;
    sport: string;
  };
  kickoff_time: string;
  status: string;
  home_prob: number | null;
  away_prob: number | null;
  draw_prob?: number | null;
  tip: 'home' | 'away' | 'draw' | null;
  confidence: number | null;
  contributing_providers: number;
  last_updated: string | null;
}

export interface ProviderOddsDetail {
  provider: string;
  home_prob: number;
  away_prob: number;
  draw_prob?: number;
  home_odds: number;
  away_odds: number;
  draw_odds?: number;
  timestamp: string;
}

export interface MatchDetail extends Match {
  provider_odds: ProviderOddsDetail[];
}
