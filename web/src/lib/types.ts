export interface League {
  id: number;
  name: string;
  sport: string;
  code: string;
  country?: string;
}

export interface TeamInfo {
  id: number;
  name: string;
  short_name?: string;
}

export interface Match {
  id: number;
  home_team: TeamInfo;
  away_team: TeamInfo;
  league: string;
  kickoff_time: string;
  status: string;
  round?: string;
  home_prob?: number;
  away_prob?: number;
  draw_prob?: number;
  tip?: string;
  confidence?: number;
  contributing_providers: number;
  last_updated?: string;
}

export interface Snapshot {
  id: number;
  match_id: number;
  provider_id: number;
  market_type: string;
  captured_at: string;
  home_prob: number;
  away_prob: number;
  draw_prob?: number;
  raw_odds?: Record<string, number>;
}

export interface Provider {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  description?: string;
}

export interface Weight {
  provider_id: number;
  provider_name: string;
  league_id: number;
  league_name: string;
  market_type: string;
  weight: number;
  updated_at: string;
}

export interface ProviderHealth {
  provider_id: number;
  provider_name: string;
  status: string;
  message: string;
  latency_ms: number;
  checked_at: string;
}
