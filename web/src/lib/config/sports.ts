/**
 * Sport configuration - central source of truth for all sports
 */

export interface SportConfig {
  code: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  theoddsapiKey: string;
  theoddsapiSport: string;
  marketType: '2way' | '3way' | 'racing';
}

export const SPORTS: Record<string, SportConfig> = {
  AFL: {
    code: 'AFL',
    name: 'Australian Football League',
    displayName: 'AFL',
    icon: '🏉',
    color: 'red',
    theoddsapiKey: 'aussierules_afl',
    theoddsapiSport: 'afl',
    marketType: '2way',
  },
  NRL: {
    code: 'NRL',
    name: 'National Rugby League',
    displayName: 'NRL',
    icon: '🏉',
    color: 'blue',
    theoddsapiKey: 'rugbyleague_nrl',
    theoddsapiSport: 'nrl',
    marketType: '2way',
  },
};

export function getSportConfig(code: string): SportConfig | null {
  return SPORTS[code] || null;
}

export function getAllSports(): SportConfig[] {
  return Object.values(SPORTS);
}
