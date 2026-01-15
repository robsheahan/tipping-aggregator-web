"""
The Racing API Client

Wrapper for The Racing API with proper authentication and rate limiting
"""

import os
import httpx
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, date
from loguru import logger
import base64

from models.database import Meet, Race, Runner

BASE_URL = "https://api.theracingapi.com/v1"
RATE_LIMIT_DELAY = 0.5  # 2 requests per second = 500ms delay

class RacingAPIClient:
    """
    Client for The Racing API
    """

    def __init__(self):
        self.username = os.getenv("RACINGAPI_USERNAME")
        self.password = os.getenv("RACINGAPI_PASSWORD")

        if not self.username or not self.password:
            raise ValueError("RACINGAPI_USERNAME and RACINGAPI_PASSWORD must be set")

        # Create auth header
        credentials = f"{self.username}:{self.password}"
        encoded = base64.b64encode(credentials.encode()).decode()
        self.auth_header = f"Basic {encoded}"

        self.headers = {
            "Authorization": self.auth_header,
            "Content-Type": "application/json"
        }

        logger.info("Racing API client initialized")

    async def _request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Make authenticated request to Racing API with rate limiting
        """
        url = f"{BASE_URL}{endpoint}"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    params=params or {},
                    timeout=30.0
                )

                response.raise_for_status()

                # Rate limiting
                await asyncio.sleep(RATE_LIMIT_DELAY)

                return response.json()

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Racing API: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error calling Racing API: {e}")
            raise

    async def get_todays_meets(self) -> List[Meet]:
        """
        Get today's Australian race meetings
        """
        today = date.today().isoformat()  # YYYY-MM-DD

        try:
            data = await self._request(f"/australia/meets", params={"date": today})

            meets = []
            for meet_data in data.get("meets", []):
                meet = Meet(
                    id=meet_data["id"],
                    date=meet_data["date"],
                    venue=meet_data["course"],
                    country="AUS",
                    region=meet_data.get("region", ""),
                    num_races=0  # Will be updated when we fetch races
                )
                meets.append(meet)

            logger.info(f"Fetched {len(meets)} meets for {today}")
            return meets

        except Exception as e:
            logger.error(f"Error fetching meets: {e}")
            return []

    async def get_races_for_meet(self, meet_id: str) -> List[Race]:
        """
        Get all races for a specific meet
        """
        try:
            data = await self._request(f"/australia/meets/{meet_id}/races")

            races = []
            for race_data in data.get("races", []):
                race = self._parse_race(meet_id, race_data)
                races.append(race)

            logger.info(f"Fetched {len(races)} races for meet {meet_id}")
            return races

        except Exception as e:
            logger.error(f"Error fetching races for meet {meet_id}: {e}")
            return []

    async def get_race_details(self, meet_id: str, race_number: int) -> Race:
        """
        Get detailed race information including odds
        """
        try:
            data = await self._request(
                f"/australia/meets/{meet_id}/races/{race_number}"
            )

            race = self._parse_race_with_odds(meet_id, data)
            logger.info(f"Fetched details for race {meet_id}-{race_number}")
            return race

        except Exception as e:
            logger.error(f"Error fetching race details: {e}")
            raise

    def _parse_race(self, meet_id: str, race_data: Dict) -> Race:
        """
        Parse race data from API response (without detailed odds)
        """
        race_number = race_data.get("race_number", 0)
        race_id = f"{meet_id}-{race_number}"

        # Parse runners
        runners = []
        for runner_data in race_data.get("runners", []):
            runner = Runner(
                number=runner_data.get("number", 0),
                name=runner_data.get("name", ""),
                jockey=runner_data.get("jockey"),
                trainer=runner_data.get("trainer"),
                weight=runner_data.get("weight"),
                barrier=runner_data.get("barrier")
            )
            runners.append(runner)

        # Parse start time
        start_time_str = race_data.get("race_time")
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))

        race = Race(
            id=race_id,
            meet_id=meet_id,
            venue=race_data.get("venue", ""),
            race_number=race_number,
            race_name=race_data.get("race_name"),
            start_time=start_time,
            distance=race_data.get("distance"),
            race_class=race_data.get("race_class"),
            track_condition=race_data.get("track_condition"),
            weather=race_data.get("weather"),
            status="upcoming",
            runners=runners
        )

        return race

    def _parse_race_with_odds(self, meet_id: str, race_data: Dict) -> Race:
        """
        Parse race data including odds
        """
        race = self._parse_race(meet_id, race_data)

        # Add odds to runners
        for i, runner in enumerate(race.runners):
            runner_data = race_data.get("runners", [])[i]

            # The Racing API returns odds as a dict: {bookmaker: odds}
            if "odds" in runner_data:
                runner.odds = runner_data["odds"]

        return race

    async def test_connection(self) -> bool:
        """
        Test API connection and credentials
        """
        try:
            await self._request("/australia/meets", params={"date": date.today().isoformat()})
            logger.info("✓ Racing API connection successful")
            return True

        except Exception as e:
            logger.error(f"✗ Racing API connection failed: {e}")
            return False
