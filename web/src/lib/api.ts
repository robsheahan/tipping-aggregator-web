/**
 * API client for serverless functions
 * Updated for serverless architecture - uses relative paths
 */

import { League, Match, MatchDetail } from './types';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    // Try to get error message from response body
    try {
      const errorData = await response.json();
      const errorMessage = errorData.message || errorData.error || response.statusText;
      throw new Error(`API error: ${errorMessage}`);
    } catch (e) {
      throw new Error(`API error: ${response.statusText}`);
    }
  }
  return response.json();
}

export async function getLeagues(): Promise<League[]> {
  return fetchAPI<League[]>('/api/leagues');
}

export async function getMatches(params?: {
  league?: string;
  upcoming_only?: boolean;
}): Promise<Match[]> {
  const searchParams = new URLSearchParams();
  if (params?.league) searchParams.append('league', params.league);
  if (params?.upcoming_only !== undefined) {
    searchParams.append('upcoming_only', String(params.upcoming_only));
  }

  const query = searchParams.toString();
  return fetchAPI<Match[]>(`/api/matches${query ? `?${query}` : ''}`);
}

export async function getMatch(id: string, league?: string): Promise<MatchDetail> {
  const searchParams = new URLSearchParams();
  if (league) searchParams.append('league', league);

  const query = searchParams.toString();
  return fetchAPI<MatchDetail>(`/api/matches/${id}${query ? `?${query}` : ''}`);
}
