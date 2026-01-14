"""Base provider class."""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


class ProviderMatch(BaseModel):
    """Match data from provider."""

    external_id: str
    home_team: str
    away_team: str
    kickoff_time: datetime
    league: str
    sport: str


class ProviderSnapshot(BaseModel):
    """Odds snapshot from provider."""

    match_external_id: str
    captured_at: datetime
    market_type: str  # 'moneyline_2way' or 'moneyline_3way'
    home_prob: float
    away_prob: float
    draw_prob: Optional[float] = None
    raw_odds: Optional[Dict] = None


class BaseProvider(ABC):
    """Base class for all providers."""

    def __init__(self, name: str, enabled: bool = True):
        """
        Initialize provider.

        Args:
            name: Provider name
            enabled: Whether provider is enabled
        """
        self.name = name
        self.enabled = enabled
        self.logger = logging.getLogger(f"provider.{name}")

    @abstractmethod
    async def fetch_matches(
        self, sport: str, league: Optional[str] = None
    ) -> List[ProviderMatch]:
        """
        Fetch upcoming matches from provider.

        Args:
            sport: Sport code ('soccer', 'afl', 'nrl')
            league: Optional league filter

        Returns:
            List of ProviderMatch objects
        """
        pass

    @abstractmethod
    async def fetch_odds(
        self, match_external_id: str, sport: str
    ) -> Optional[ProviderSnapshot]:
        """
        Fetch current odds for a specific match.

        Args:
            match_external_id: External match ID
            sport: Sport code

        Returns:
            ProviderSnapshot or None if not available
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict:
        """
        Check provider health/availability.

        Returns:
            Dict with 'status', 'message', 'latency_ms'
        """
        pass

    def _convert_to_market_type(self, sport: str) -> str:
        """
        Determine market type based on sport.

        Args:
            sport: Sport code

        Returns:
            Market type string
        """
        if sport == "soccer":
            return "moneyline_3way"
        else:
            return "moneyline_2way"

    async def rate_limit_wait(self, wait_seconds: float):
        """
        Wait for rate limiting.

        Args:
            wait_seconds: Seconds to wait
        """
        import asyncio
        await asyncio.sleep(wait_seconds)
