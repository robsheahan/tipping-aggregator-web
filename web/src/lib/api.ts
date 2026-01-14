/**
 * API client for serverless functions
 * Updated for serverless architecture - uses relative paths
 */

import { League, Match, MatchDetail } from './types';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    // Get response body as text first
    const responseText = await response.text();
    console.error('API error response:', responseText);

    // Try to parse as JSON
    try {
      const errorData = JSON.parse(responseText);
      const errorMessage = errorData.message || errorData.error || 'Unknown error';
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    } catch (parseError) {
      // If not JSON, use the text directly
      const errorMessage = responseText || response.statusText || 'Unknown error';
      throw new Error(`API error: ${errorMessage} (Status: ${response.status})`);
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
