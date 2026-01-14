"""
Bet365 provider stub.

COMPLIANCE NOTE:
Bet365 does NOT provide a public API and explicitly prohibits:
- Automated scraping in their Terms of Service
- Use of bots or automated systems
- Data extraction without authorization

To integrate Bet365 data legally, you would need:
1. A licensed data feed agreement with Bet365
2. Use of an authorized third-party data provider (like Sportradar, Betgenius)
3. Official API access (not publicly available)

This is a STUB implementation that should only be replaced with a
compliant integration using licensed/authorized data feeds.

DO NOT implement web scraping or bypass their protections.
"""
from typing import List, Optional, Dict
from providers.base import BaseProvider, ProviderMatch, ProviderSnapshot
import logging

logger = logging.getLogger(__name__)


class Bet365Provider(BaseProvider):
    """
    Bet365 provider stub.

    This is a placeholder for potential future integration via:
    - Official API (if/when available)
    - Licensed data feed
    - Authorized third-party aggregator

    DO NOT implement scraping or ToS violations.
    """

    def __init__(self):
        super().__init__(name="Bet365", enabled=False)  # Always disabled (stub only)

    async def fetch_matches(
        self, sport: str, league: Optional[str] = None
    ) -> List[ProviderMatch]:
        """
        Fetch matches - NOT IMPLEMENTED (requires licensed feed).
        """
        self.logger.warning(
            "Bet365 provider is a stub - requires licensed data feed for legal integration"
        )
        return []

    async def fetch_odds(
        self, match_external_id: str, sport: str
    ) -> Optional[ProviderSnapshot]:
        """
        Fetch odds - NOT IMPLEMENTED (requires licensed feed).
        """
        self.logger.warning(
            "Bet365 provider is a stub - requires licensed data feed for legal integration"
        )
        return None

    async def health_check(self) -> Dict:
        """Check provider health."""
        return {
            "status": "stub",
            "message": "Bet365 requires licensed data feed - stub only",
            "latency_ms": 0,
        }


# Integration guidelines for licensed feeds:
"""
If you obtain authorized access to Bet365 data through a licensed provider,
implement the integration here following these principles:

1. Use the official API/feed endpoint
2. Include proper authentication (API keys, OAuth, etc.)
3. Respect rate limits specified in your agreement
4. Cache data appropriately to minimize requests
5. Include User-Agent identification
6. Log all API calls for audit purposes
7. Handle errors gracefully and backoff on failures

Example structure:

class Bet365Provider(BaseProvider):
    def __init__(self, api_key: str, feed_url: str):
        super().__init__(name="Bet365", enabled=True)
        self.api_key = api_key
        self.feed_url = feed_url

    async def fetch_odds(self, match_id: str, sport: str) -> Optional[ProviderSnapshot]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "User-Agent": "TippingAggregator/1.0",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.feed_url}/odds/{match_id}",
                headers=headers,
                timeout=30.0
            )
            # Process response...
"""
