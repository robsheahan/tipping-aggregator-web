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
  marketType: '2way' | '3way';
}

export const SPORTS: Record<string, SportConfig> = {
  EPL: {
    code: 'EPL',
    name: 'English Premier League',
    displayName: 'EPL',
    icon: '⚽',
    color: 'purple',
    theoddsapiKey: 'soccer_epl',
    theoddsapiSport: 'soccer',
    marketType: '3way',
  },
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
  NFL: {
    code: 'NFL',
    name: 'National Football League',
    displayName: 'NFL',
    icon: '🏈',
    color: 'green',
    theoddsapiKey: 'americanfootball_nfl',
    theoddsapiSport: 'americanfootball',
    marketType: '2way',
  },
  NBA: {
    code: 'NBA',
    name: 'National Basketball Association',
    displayName: 'NBA',
    icon: '🏀',
    color: 'orange',
    theoddsapiKey: 'basketball_nba',
    theoddsapiSport: 'basketball',
    marketType: '2way',
  },
  RUGBY: {
    code: 'RUGBY',
    name: 'Super Rugby Pacific',
    displayName: 'Super Rugby',
    icon: '🏉',
    color: 'cyan',
    theoddsapiKey: 'rugbyunion_super_rugby',
    theoddsapiSport: 'rugbyunion',
    marketType: '2way',
  },
};

export function getSportConfig(code: string): SportConfig | null {
  return SPORTS[code] || null;
}

export function getAllSports(): SportConfig[] {
  return Object.values(SPORTS);
}
