"""
Abstract base class for tipping platform submitters.

Provides shared logic for:
- Playwright browser lifecycle (launch, login, close)
- Screenshot capture
- Retry with backoff
- Dry-run support
"""

import os
import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from loguru import logger
from playwright.async_api import async_playwright, Browser, Page, BrowserContext

from submitters.team_name_maps import get_platform_team_name


SCREENSHOT_DIR = Path(__file__).parent.parent / "logs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


class BaseSubmitter(ABC):
    """Base class for all tipping platform submitters."""

    PLATFORM: str = ""          # Override in subclass: 'afl_tipping', etc.
    SPORT: str = ""             # Override: 'afl' or 'nrl' (or 'both' for superbru)
    LOGIN_URL: str = ""         # Override: login page URL
    TIPPING_URL: str = ""       # Override: tipping page URL

    def __init__(self, headless: bool = True, dry_run: bool = False):
        self.headless = headless
        self.dry_run = dry_run
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._playwright = None

    # ---- Credentials (loaded from env) ----

    @abstractmethod
    def _get_credentials(self) -> Dict[str, str]:
        """Return dict with login credentials from env vars."""
        ...

    # ---- Browser lifecycle ----

    async def start_browser(self):
        """Launch Playwright browser and create a page."""
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self.page = await self.context.new_page()
        logger.info(f"[{self.PLATFORM}] Browser started (headless={self.headless})")

    async def close_browser(self):
        """Close browser and cleanup."""
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        self.browser = None
        self.context = None
        self.page = None
        logger.info(f"[{self.PLATFORM}] Browser closed")

    # ---- Login ----

    @abstractmethod
    async def login(self) -> bool:
        """
        Log into the platform. Return True on success.
        Implement in subclass with platform-specific selectors.
        """
        ...

    async def _login_with_retry(self, max_retries: int = 2) -> bool:
        """Attempt login with retries."""
        for attempt in range(max_retries + 1):
            try:
                success = await self.login()
                if success:
                    return True
                logger.warning(
                    f"[{self.PLATFORM}] Login attempt {attempt + 1} failed"
                )
            except Exception as e:
                logger.error(
                    f"[{self.PLATFORM}] Login error (attempt {attempt + 1}): {e}"
                )
            if attempt < max_retries:
                await asyncio.sleep(3)
        return False

    # ---- Tip submission ----

    @abstractmethod
    async def navigate_to_round(self) -> bool:
        """
        Navigate to the current round's tipping page.
        Return True if successfully on the round page.
        """
        ...

    @abstractmethod
    async def submit_tip(self, match: Dict, team_name: str) -> bool:
        """
        Submit a single tip for a match on this platform.
        match: dict with home_team, away_team, commence_time, etc.
        team_name: the platform-specific team name to click.
        Return True if tip was successfully submitted.
        """
        ...

    @abstractmethod
    async def save_tips(self) -> bool:
        """
        Click the save/confirm button after selecting tips.
        Return True if tips were saved successfully.
        """
        ...

    # ---- Screenshot ----

    async def take_screenshot(self, label: str = "") -> str:
        """Take a screenshot and return the file path."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        suffix = f"_{label}" if label else ""
        filename = f"{self.PLATFORM}{suffix}_{timestamp}.png"
        filepath = SCREENSHOT_DIR / filename
        if self.page:
            await self.page.screenshot(path=str(filepath), full_page=True)
            logger.info(f"[{self.PLATFORM}] Screenshot saved: {filepath}")
        return str(filepath)

    # ---- Team name resolution ----

    def resolve_team_name(self, canonical_name: str, sport: str) -> str:
        """Get platform-specific team name from canonical name."""
        return get_platform_team_name(canonical_name, self.PLATFORM, sport)

    # ---- High-level orchestration ----

    async def submit_all(self, pending_matches: list) -> list:
        """
        Submit tips for all pending matches on this platform.
        pending_matches: list of dicts with 'match' and 'consensus' keys.
        Returns list of result dicts.
        """
        results = []
        if not pending_matches:
            logger.info(f"[{self.PLATFORM}] No pending matches to submit")
            return results

        try:
            await self.start_browser()

            # Login
            if not self.dry_run:
                if not await self._login_with_retry():
                    for item in pending_matches:
                        results.append({
                            "match_id": item["match"]["id"],
                            "platform": self.PLATFORM,
                            "status": "failed",
                            "error_message": "Login failed",
                        })
                    return results

                # Navigate to tipping round
                if not await self.navigate_to_round():
                    for item in pending_matches:
                        results.append({
                            "match_id": item["match"]["id"],
                            "platform": self.PLATFORM,
                            "status": "failed",
                            "error_message": "Failed to navigate to round",
                        })
                    return results

            # Submit each tip
            for item in pending_matches:
                match = item["match"]
                consensus = item["consensus"]
                consensus_team = consensus.get("consensus_team")
                sport = match.get("sport", self.SPORT)
                platform_team = self.resolve_team_name(consensus_team, sport)

                result = {
                    "match_id": match["id"],
                    "platform": self.PLATFORM,
                    "consensus_team": consensus_team,
                    "consensus_strength": consensus.get("consensus_strength"),
                    "submitted_team": platform_team,
                }

                if self.dry_run:
                    logger.info(
                        f"[{self.PLATFORM}] DRY RUN: Would submit "
                        f"{platform_team} for {match['home_team']} vs {match['away_team']}"
                    )
                    result["status"] = "skipped"
                    result["error_message"] = "Dry run"
                else:
                    try:
                        success = await self.submit_tip(match, platform_team)
                        if success:
                            result["status"] = "submitted"
                            result["submitted_at"] = datetime.now(timezone.utc).isoformat()
                        else:
                            result["status"] = "failed"
                            result["error_message"] = "submit_tip returned False"
                    except Exception as e:
                        logger.error(
                            f"[{self.PLATFORM}] Error submitting tip for "
                            f"{match['home_team']} vs {match['away_team']}: {e}"
                        )
                        result["status"] = "failed"
                        result["error_message"] = str(e)[:500]

                results.append(result)

            # Save/confirm all tips
            if not self.dry_run and any(r["status"] == "submitted" for r in results):
                try:
                    saved = await self.save_tips()
                    if saved:
                        screenshot = await self.take_screenshot("confirmed")
                        for r in results:
                            if r["status"] == "submitted":
                                r["screenshot_path"] = screenshot
                    else:
                        logger.error(f"[{self.PLATFORM}] Failed to save tips")
                        for r in results:
                            if r["status"] == "submitted":
                                r["status"] = "failed"
                                r["error_message"] = "Save/confirm failed"
                except Exception as e:
                    logger.error(f"[{self.PLATFORM}] Error saving tips: {e}")

        finally:
            await self.close_browser()

        return results
