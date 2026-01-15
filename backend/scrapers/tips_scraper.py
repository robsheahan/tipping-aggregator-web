"""
Expert Tips Scraper using Playwright

Scrapes expert tips from public Australian racing websites:
- Racing.com
- Sky Racing
- Other configured sources

Uses Playwright for JavaScript-rendered content
"""

import os
import asyncio
from typing import List, Dict
from playwright.async_api import async_playwright, Page, Browser
from loguru import logger
from datetime import datetime
from bs4 import BeautifulSoup

from models.database import ExpertTip

class TipsScraper:
    """
    Web scraper for expert racing tips
    """

    def __init__(self):
        self.sources = self._load_sources()
        self.max_concurrent = int(os.getenv("MAX_CONCURRENT_SCRAPES", 3))
        self.delay = float(os.getenv("SCRAPE_DELAY_SECONDS", 2))

    def _load_sources(self) -> List[Dict]:
        """
        Load scraping targets from environment
        """
        targets_str = os.getenv(
            "SCRAPING_TARGETS",
            "https://www.racing.com/tips,https://www.skyracing.com.au/tips"
        )

        sources = []
        for url in targets_str.split(","):
            url = url.strip()
            if "racing.com" in url:
                sources.append({
                    "name": "Racing.com",
                    "url": url,
                    "parser": self._parse_racing_com
                })
            elif "skyracing" in url:
                sources.append({
                    "name": "Sky Racing",
                    "url": url,
                    "parser": self._parse_sky_racing
                })

        return sources

    async def scrape_all_sources(self, races: List) -> List[ExpertTip]:
        """
        Scrape tips from all configured sources

        Args:
            races: List of Race objects to match tips against

        Returns:
            List of ExpertTip objects
        """
        all_tips = []

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )

            try:
                for source in self.sources:
                    logger.info(f"Scraping {source['name']}...")

                    try:
                        tips = await self._scrape_source(browser, source, races)
                        all_tips.extend(tips)
                        logger.info(f"✓ Scraped {len(tips)} tips from {source['name']}")

                    except Exception as e:
                        logger.error(f"Error scraping {source['name']}: {e}", exc_info=True)
                        continue

                    # Rate limiting
                    await asyncio.sleep(self.delay)

            finally:
                await browser.close()

        return all_tips

    async def _scrape_source(
        self,
        browser: Browser,
        source: Dict,
        races: List
    ) -> List[ExpertTip]:
        """
        Scrape tips from a single source
        """
        page = await browser.new_page()

        try:
            # Navigate to page
            await page.goto(source['url'], wait_until='networkidle', timeout=30000)

            # Wait for content to load
            await page.wait_for_timeout(2000)

            # Get page HTML
            html = await page.content()

            # Parse with source-specific parser
            tips = await source['parser'](html, races, source['name'])

            return tips

        finally:
            await page.close()

    async def _parse_racing_com(
        self,
        html: str,
        races: List,
        source_name: str
    ) -> List[ExpertTip]:
        """
        Parse tips from Racing.com

        Note: This is a template. Actual selectors need to be verified
        against the live site structure.
        """
        tips = []
        soup = BeautifulSoup(html, 'lxml')

        try:
            # Find tip sections
            # NOTE: These selectors are EXAMPLES - adjust based on actual site structure
            tip_sections = soup.select('.tip-section, .expert-tip, .race-tip')

            for section in tip_sections:
                # Extract venue and race number
                venue_elem = section.select_one('.venue, .track-name')
                race_elem = section.select_one('.race-number')

                if not venue_elem or not race_elem:
                    continue

                venue = venue_elem.text.strip()
                race_num_text = race_elem.text.strip()
                race_number = int(''.join(filter(str.isdigit, race_num_text)))

                # Find matching race
                race = self._find_race(races, venue, race_number)
                if not race:
                    continue

                # Extract tips
                runner_tips = section.select('.runner-tip, .selection')

                for runner_tip in runner_tips:
                    runner_name_elem = runner_tip.select_one('.runner-name, .horse-name')
                    comment_elem = runner_tip.select_one('.comment, .tip-text')

                    if not runner_name_elem:
                        continue

                    runner_name = runner_name_elem.text.strip()
                    comment = comment_elem.text.strip() if comment_elem else "No comment provided"

                    # Find runner number
                    runner_number = self._find_runner_number(race, runner_name)
                    if not runner_number:
                        continue

                    tip = ExpertTip(
                        race_id=race.id,
                        runner_name=runner_name,
                        runner_number=runner_number,
                        source=source_name,
                        expert_name="Racing.com Tips",
                        confidence_score=0,  # Will be set by AI analyzer
                        category="neutral",  # Will be set by AI analyzer
                        raw_text=comment
                    )

                    tips.append(tip)

        except Exception as e:
            logger.error(f"Error parsing Racing.com: {e}", exc_info=True)

        return tips

    async def _parse_sky_racing(
        self,
        html: str,
        races: List,
        source_name: str
    ) -> List[ExpertTip]:
        """
        Parse tips from Sky Racing

        Note: This is a template. Actual selectors need to be verified.
        """
        tips = []
        soup = BeautifulSoup(html, 'lxml')

        try:
            # Similar structure to Racing.com but with different selectors
            # NOTE: These selectors are EXAMPLES
            tip_cards = soup.select('.tip-card, .expert-selection')

            for card in tip_cards:
                # Extract race info
                venue_elem = card.select_one('.venue-name')
                race_elem = card.select_one('.race-num')

                if not venue_elem or not race_elem:
                    continue

                venue = venue_elem.text.strip()
                race_number = int(''.join(filter(str.isdigit, race_elem.text)))

                # Find matching race
                race = self._find_race(races, venue, race_number)
                if not race:
                    continue

                # Extract tips
                selections = card.select('.selection-item')

                for selection in selections:
                    runner_name = selection.select_one('.horse').text.strip()
                    tip_text = selection.select_one('.analysis').text.strip()

                    runner_number = self._find_runner_number(race, runner_name)
                    if not runner_number:
                        continue

                    tip = ExpertTip(
                        race_id=race.id,
                        runner_name=runner_name,
                        runner_number=runner_number,
                        source=source_name,
                        expert_name="Sky Racing Tips",
                        confidence_score=0,
                        category="neutral",
                        raw_text=tip_text
                    )

                    tips.append(tip)

        except Exception as e:
            logger.error(f"Error parsing Sky Racing: {e}", exc_info=True)

        return tips

    def _find_race(self, races: List, venue: str, race_number: int):
        """
        Find a race by venue and race number
        """
        venue_normalized = venue.lower().strip()

        for race in races:
            if race.race_number == race_number:
                if venue_normalized in race.venue.lower():
                    return race

        return None

    def _find_runner_number(self, race, runner_name: str) -> int:
        """
        Find runner number by name
        """
        name_normalized = runner_name.lower().strip()

        for runner in race.runners:
            if name_normalized in runner.name.lower():
                return runner.number

        return None

    async def scrape_with_retry(
        self,
        browser: Browser,
        url: str,
        max_retries: int = 3
    ) -> str:
        """
        Scrape a page with retry logic
        """
        for attempt in range(max_retries):
            try:
                page = await browser.new_page()
                await page.goto(url, wait_until='networkidle', timeout=30000)
                await page.wait_for_timeout(2000)
                html = await page.content()
                await page.close()
                return html

            except Exception as e:
                logger.warning(f"Scrape attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise

        return ""
