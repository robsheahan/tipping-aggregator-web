/**
 * Core types for odds aggregation system
 */

export interface OddsData {
  home: number;
  away: number;
  draw?: number;
}

export interface RawBookmakerOdds {
  bookmaker: string;
  home: number;
  away: number;
  draw?: number;
  last_update: string;
}

export interface ProviderOdds {
  provider: string;
  odds: OddsData;
  probabilities: OddsData;
  timestamp: string;
}

export interface AggregatedOdds {
  home_prob: number;
  away_prob: number;
  draw_prob?: number;
  tip: 'home' | 'away' | 'draw';
  confidence: number;
  contributing_providers: number;
  last_updated: string;
}

export interface WeightMap {
  [provider: string]: number;
}

// TheOddsAPI response types
export interface TheOddsAPIOutcome {
  name: string;
  price: number;
}

export interface TheOddsAPIMarket {
  key: string;
  outcomes: TheOddsAPIOutcome[];
}

export interface TheOddsAPIBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: TheOddsAPIMarket[];
}

export interface TheOddsAPIEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: TheOddsAPIBookmaker[];
}

export type MarketType = 'moneyline_2way' | 'moneyline_3way';

export interface NormalizedOdds {
  home: number;
  away: number;
  draw?: number;
}
