import { League, Match, Snapshot, Provider, Weight, ProviderHealth } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export async function getLeagues(): Promise<League[]> {
  return fetchAPI<League[]>('/leagues');
}

export async function getMatches(params?: {
  league?: string;
  from_date?: string;
  to_date?: string;
  upcoming_only?: boolean;
}): Promise<Match[]> {
  const searchParams = new URLSearchParams();
  if (params?.league) searchParams.append('league', params.league);
  if (params?.from_date) searchParams.append('from_date', params.from_date);
  if (params?.to_date) searchParams.append('to_date', params.to_date);
  if (params?.upcoming_only !== undefined) {
    searchParams.append('upcoming_only', String(params.upcoming_only));
  }

  const query = searchParams.toString();
  return fetchAPI<Match[]>(`/matches${query ? `?${query}` : ''}`);
}

export async function getMatch(id: number): Promise<Match> {
  return fetchAPI<Match>(`/matches/${id}`);
}

export async function getMatchSnapshots(
  matchId: number,
  providerId?: number,
  limit?: number
): Promise<Snapshot[]> {
  const searchParams = new URLSearchParams();
  if (providerId) searchParams.append('provider_id', String(providerId));
  if (limit) searchParams.append('limit', String(limit));

  const query = searchParams.toString();
  return fetchAPI<Snapshot[]>(`/matches/${matchId}/snapshots${query ? `?${query}` : ''}`);
}

export async function getProviders(): Promise<Provider[]> {
  return fetchAPI<Provider[]>('/providers');
}

export async function getWeights(params?: {
  league?: string;
  market_type?: string;
}): Promise<Weight[]> {
  const searchParams = new URLSearchParams();
  if (params?.league) searchParams.append('league', params.league);
  if (params?.market_type) searchParams.append('market_type', params.market_type);

  const query = searchParams.toString();
  return fetchAPI<Weight[]>(`/weights${query ? `?${query}` : ''}`);
}

export async function getProviderHealth(
  adminPassword: string
): Promise<ProviderHealth[]> {
  const response = await fetch(`${API_URL}/providers/health`, {
    headers: {
      Authorization: `Bearer ${adminPassword}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
