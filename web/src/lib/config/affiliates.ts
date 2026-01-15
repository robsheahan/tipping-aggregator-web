/**
 * Affiliate Configuration
 *
 * Configure your affiliate IDs and base URLs here for each bookmaker.
 * Deep links will be automatically generated when users click on odds.
 */

export interface AffiliateConfig {
  bookmakerName: string;
  displayName: string;
  affiliateId: string;
  baseUrl: string;
  deepLinkPattern: string; // Pattern with {raceId}, {runnerNumber}, {affiliateId} placeholders
  enabled: boolean;
}

export const AFFILIATE_BOOKMAKERS: Record<string, AffiliateConfig> = {
  sportsbet: {
    bookmakerName: 'sportsbet',
    displayName: 'Sportsbet',
    affiliateId: 'YOUR_SPORTSBET_AFFILIATE_ID', // Replace with your actual ID
    baseUrl: 'https://www.sportsbet.com.au',
    deepLinkPattern: '/racing/{raceId}/runner/{runnerNumber}?affiliate={affiliateId}',
    enabled: true,
  },
  ladbrokes: {
    bookmakerName: 'ladbrokes',
    displayName: 'Ladbrokes',
    affiliateId: 'YOUR_LADBROKES_AFFILIATE_ID', // Replace with your actual ID
    baseUrl: 'https://www.ladbrokes.com.au',
    deepLinkPattern: '/racing/{raceId}/runner/{runnerNumber}?btag={affiliateId}',
    enabled: true,
  },
  neds: {
    bookmakerName: 'neds',
    displayName: 'Neds',
    affiliateId: 'YOUR_NEDS_AFFILIATE_ID', // Replace with your actual ID
    baseUrl: 'https://www.neds.com.au',
    deepLinkPattern: '/racing/{raceId}/runner/{runnerNumber}?affiliate={affiliateId}',
    enabled: true,
  },
  tab: {
    bookmakerName: 'tab',
    displayName: 'TAB',
    affiliateId: 'YOUR_TAB_AFFILIATE_ID', // Replace with your actual ID
    baseUrl: 'https://www.tab.com.au',
    deepLinkPattern: '/racing/{raceId}/runner/{runnerNumber}?promo={affiliateId}',
    enabled: false, // TAB may not have affiliate program
  },
};

/**
 * Generate an affiliate deep link for a specific runner
 */
export function generateAffiliateLink(
  bookmakerName: string,
  raceId: string,
  runnerNumber: number
): string {
  const config = AFFILIATE_BOOKMAKERS[bookmakerName.toLowerCase()];

  if (!config || !config.enabled) {
    // Return base URL if affiliate not configured
    return config?.baseUrl || '#';
  }

  const path = config.deepLinkPattern
    .replace('{raceId}', encodeURIComponent(raceId))
    .replace('{runnerNumber}', runnerNumber.toString())
    .replace('{affiliateId}', config.affiliateId);

  return config.baseUrl + path;
}

/**
 * Get all enabled bookmakers
 */
export function getEnabledBookmakers(): AffiliateConfig[] {
  return Object.values(AFFILIATE_BOOKMAKERS).filter(bm => bm.enabled);
}
