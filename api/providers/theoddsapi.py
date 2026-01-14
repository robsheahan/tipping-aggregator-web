"""TheOddsAPI provider implementation."""
from typing import List, Optional, Dict
from datetime import datetime
import httpx
from providers.base import BaseProvider, ProviderMatch, ProviderSnapshot
from services.odds_utils import (
    decimal_odds_to_implied_probability,
    normalize_probabilities_2way,
    normalize_probabilities_3way,
)
from config import settings
import logging

logger = logging.getLogger(__name__)


class TheOddsAPIProvider(BaseProvider):
    """
    TheOddsAPI provider.

    Docs: https://the-odds-api.com/liveapi/guides/v4/
    """

    BASE_URL = "https://api.the-odds-api.com/v4"

    # Sport keys mapping
    SPORT_KEYS = {
        "soccer": {
            "EPL": "soccer_epl",
        },
        "afl": {
            "AFL": "aussierules_afl",
        },
        "nrl": {
            "NRL": "rugbyleague_nrl",
        },
    }

    def __init__(self):
        super().__init__(name="TheOddsAPI", enabled=bool(settings.theoddsapi_key))
        self.api_key = settings.theoddsapi_key

    def _get_sport_key(self, sport: str, league: Optional[str] = None) -> Optional[str]:
        """Get TheOddsAPI sport key."""
        if sport not in self.SPORT_KEYS:
            return None

        if league:
            return self.SPORT_KEYS[sport].get(league)

        # Return first league for sport if no specific league requested
        return list(self.SPORT_KEYS[sport].values())[0] if self.SPORT_KEYS[sport] else None

    async def fetch_matches(
        self, sport: str, league: Optional[str] = None
    ) -> List[ProviderMatch]:
        """Fetch upcoming matches."""
        if not self.enabled or not self.api_key:
            self.logger.warning("Provider not enabled or API key missing")
            return []

        sport_key = self._get_sport_key(sport, league)
        if not sport_key:
            self.logger.warning(f"No sport key found for {sport}/{league}")
            return []

        url = f"{self.BASE_URL}/sports/{sport_key}/odds"
        params = {
            "apiKey": self.api_key,
            "regions": "au",  # Australian bookmakers
            "markets": "h2h",
            "oddsFormat": "decimal",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()

                data = response.json()
                matches = []

                for event in data:
                    match = ProviderMatch(
                        external_id=event["id"],
                        home_team=event["home_team"],
                        away_team=event["away_team"],
                        kickoff_time=datetime.fromisoformat(
                            event["commence_time"].replace("Z", "+00:00")
                        ),
                        league=league or sport,
                        sport=sport,
                    )
                    matches.append(match)

                self.logger.info(f"Fetched {len(matches)} matches for {sport_key}")
                return matches

        except Exception as e:
            self.logger.error(f"Error fetching matches: {e}")
            return []

    async def fetch_odds(
        self, match_external_id: str, sport: str
    ) -> Optional[ProviderSnapshot]:
        """Fetch current odds for a match."""
        if not self.enabled or not self.api_key:
            return None

        # Get sport key (need to know league, but we can try all)
        sport_keys = list(self.SPORT_KEYS.get(sport, {}).values())
        if not sport_keys:
            return None

        # Try each sport key
        for sport_key in sport_keys:
            url = f"{self.BASE_URL}/sports/{sport_key}/events/{match_external_id}/odds"
            params = {
                "apiKey": self.api_key,
                "regions": "au",
                "markets": "h2h",
                "oddsFormat": "decimal",
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url, params=params)

                    if response.status_code == 404:
                        continue  # Try next sport key

                    response.raise_for_status()
                    data = response.json()

                    # Get first bookmaker with odds
                    if not data.get("bookmakers"):
                        continue

                    bookmaker = data["bookmakers"][0]
                    h2h_market = next(
                        (m for m in bookmaker["markets"] if m["key"] == "h2h"), None
                    )

                    if not h2h_market:
                        continue

                    # Extract odds
                    outcomes = {o["name"]: o["price"] for o in h2h_market["outcomes"]}

                    # Determine market type
                    market_type = self._convert_to_market_type(sport)

                    # Convert to probabilities
                    home_odds = outcomes.get(data["home_team"])
                    away_odds = outcomes.get(data["away_team"])

                    if not home_odds or not away_odds:
                        continue

                    home_prob = decimal_odds_to_implied_probability(home_odds)
                    away_prob = decimal_odds_to_implied_probability(away_odds)

                    # Check for draw
                    draw_odds = outcomes.get("Draw")
                    draw_prob = None

                    if draw_odds and market_type == "moneyline_3way":
                        draw_prob = decimal_odds_to_implied_probability(draw_odds)
                        home_prob, draw_prob, away_prob = normalize_probabilities_3way(
                            home_prob, draw_prob, away_prob
                        )
                    else:
                        home_prob, away_prob = normalize_probabilities_2way(
                            home_prob, away_prob
                        )

                    return ProviderSnapshot(
                        match_external_id=match_external_id,
                        captured_at=datetime.utcnow(),
                        market_type=market_type,
                        home_prob=home_prob,
                        away_prob=away_prob,
                        draw_prob=draw_prob,
                        raw_odds=outcomes,
                    )

            except Exception as e:
                self.logger.error(f"Error fetching odds for {match_external_id}: {e}")
                continue

        return None

    async def health_check(self) -> Dict:
        """Check provider health."""
        if not self.enabled or not self.api_key:
            return {
                "status": "disabled",
                "message": "Provider not enabled or API key missing",
                "latency_ms": 0,
            }

        url = f"{self.BASE_URL}/sports"
        params = {"apiKey": self.api_key}

        try:
            import time

            start = time.time()

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()

            latency_ms = (time.time() - start) * 1000

            return {
                "status": "healthy",
                "message": "API accessible",
                "latency_ms": round(latency_ms, 2),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "message": str(e),
                "latency_ms": 0,
            }
