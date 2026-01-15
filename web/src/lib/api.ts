/**
 * API client for serverless functions
 * Updated for serverless architecture - uses relative paths
 */

import { League, Match, MatchDetail } from './types';
import { RoundDefinition } from './rounds/roundMappings';
import { MultiResponse } from './multi/types';

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
  round?: number;
}): Promise<Match[]> {
  const searchParams = new URLSearchParams();
  if (params?.league) searchParams.append('league', params.league);
  if (params?.upcoming_only !== undefined) {
    searchParams.append('upcoming_only', String(params.upcoming_only));
  }
  if (params?.round !== undefined) {
    searchParams.append('round', String(params.round));
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

export async function getRounds(league: string): Promise<RoundDefinition[]> {
  return fetchAPI<RoundDefinition[]>(`/api/rounds?league=${league}`);
}

export async function getMultiGenerator(): Promise<MultiResponse> {
  return fetchAPI<MultiResponse>('/api/multi-generator');
}
