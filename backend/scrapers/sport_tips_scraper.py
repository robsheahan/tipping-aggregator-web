"""
Expert Tips Scraper for AFL/NRL

Sources:
- Squiggle API (AFL) — stable public JSON API
- FootyForecaster (AFL + NRL) — Playwright + BeautifulSoup

Each source is wrapped in try/except so failures don't break the pipeline.
"""

import asyncio
import re
import httpx
from typing import List, Dict, Optional
from loguru import logger
from datetime import datetime

try:
    from playwright.async_api import async_playwright
    from bs4 import BeautifulSoup
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright/BS4 not available — web scraping sources disabled")


# Team name aliases for fuzzy matching across sources
AFL_TEAM_ALIASES: Dict[str, List[str]] = {
    "Adelaide Crows": ["Adelaide", "Crows", "Adelaide Crows"],
    "Brisbane Lions": ["Brisbane", "Lions", "Brisbane Lions"],
    "Carlton": ["Carlton", "Blues", "Carlton Blues"],
    "Collingwood": ["Collingwood", "Magpies", "Collingwood Magpies"],
    "Essendon": ["Essendon", "Bombers", "Essendon Bombers"],
    "Fremantle": ["Fremantle", "Dockers", "Fremantle Dockers"],
    "Geelong Cats": ["Geelong", "Cats", "Geelong Cats"],
    "Gold Coast Suns": ["Gold Coast", "Suns", "Gold Coast Suns"],
    "GWS Giants": ["GWS", "Giants", "GWS Giants", "Greater Western Sydney", "GW Sydney"],
    "Hawthorn": ["Hawthorn", "Hawks", "Hawthorn Hawks"],
    "Melbourne": ["Melbourne", "Demons", "Melbourne Demons"],
    "North Melbourne": ["North Melbourne", "Kangaroos", "Roos", "North Melbourne Kangaroos", "Nth Melbourne"],
    "Port Adelaide": ["Port Adelaide", "Power", "Port Adelaide Power"],
    "Richmond": ["Richmond", "Tigers", "Richmond Tigers"],
    "St Kilda": ["St Kilda", "Saints", "St Kilda Saints"],
    "Sydney Swans": ["Sydney", "Swans", "Sydney Swans"],
    "West Coast Eagles": ["West Coast", "Eagles", "West Coast Eagles"],
    "Western Bulldogs": ["Western Bulldogs", "Bulldogs", "Footscray", "Wstn Bulldogs"],
}

NRL_TEAM_ALIASES: Dict[str, List[str]] = {
    "Brisbane Broncos": ["Brisbane", "Broncos", "Brisbane Broncos"],
    "Canberra Raiders": ["Canberra", "Raiders", "Canberra Raiders"],
    "Canterbury Bulldogs": ["Canterbury", "Bulldogs", "Canterbury Bulldogs", "Canterbury-Bankstown"],
    "Cronulla Sharks": ["Cronulla", "Sharks", "Cronulla Sharks", "Cronulla-Sutherland"],
    "Dolphins": ["Dolphins", "Redcliffe Dolphins"],
    "Gold Coast Titans": ["Gold Coast", "Titans", "Gold Coast Titans"],
    "Manly Sea Eagles": ["Manly", "Sea Eagles", "Manly Sea Eagles", "Manly-Warringah"],
    "Melbourne Storm": ["Melbourne", "Storm", "Melbourne Storm"],
    "Newcastle Knights": ["Newcastle", "Knights", "Newcastle Knights"],
    "New Zealand Warriors": ["Warriors", "New Zealand Warriors", "NZ Warriors"],
    "North Queensland Cowboys": ["North Queensland", "Cowboys", "North Queensland Cowboys"],
    "Parramatta Eels": ["Parramatta", "Eels", "Parramatta Eels"],
    "Penrith Panthers": ["Penrith", "Panthers", "Penrith Panthers"],
    "South Sydney Rabbitohs": ["South Sydney", "Rabbitohs", "Souths", "South Sydney Rabbitohs"],
    "St George Illawarra Dragons": ["St George Illawarra", "Dragons", "St George Illawarra Dragons"],
    "Sydney Roosters": ["Sydney Roosters", "Roosters"],
    "Wests Tigers": ["Wests Tigers", "Tigers", "Wests"],
}


def normalize_team_name(name: str, sport: str) -> Optional[str]:
    """Match a team name string to canonical team name using aliases"""
    aliases = AFL_TEAM_ALIASES if sport == "afl" else NRL_TEAM_ALIASES
    name_lower = name.strip().lower()

    for canonical, alias_list in aliases.items():
        for alias in alias_list:
            if alias.lower() == name_lower:
                return canonical

    # Partial match fallback
    for canonical, alias_list in aliases.items():
        for alias in alias_list:
            if alias.lower() in name_lower or name_lower in alias.lower():
                return canonical

    logger.warning(f"Could not match team name: '{name}' for sport: {sport}")
    return None


def match_team_to_match(tipped_team: str, home_team: str, away_team: str, sport: str) -> Optional[str]:
    """Determine which team in a match the tipped team refers to"""
    canonical = normalize_team_name(tipped_team, sport)
    if not canonical:
        return None

    home_canonical = normalize_team_name(home_team, sport)
    away_canonical = normalize_team_name(away_team, sport)

    if canonical == home_canonical:
        return home_team
    elif canonical == away_canonical:
        return away_team

    return None


class SportTipsScraper:
    """Orchestrates scraping from all expert tip sources"""

    async def scrape_all(self, matches: List[Dict]) -> List[Dict]:
        """
        Scrape tips from all sources for the given matches.
        matches: list of dicts with id, home_team, away_team, sport, commence_time
        Returns: list of tip dicts ready for SportExpertTip model
        """
        all_tips = []

        # Separate by sport
        afl_matches = [m for m in matches if m["sport"] == "afl"]
        nrl_matches = [m for m in matches if m["sport"] == "nrl"]

        # 1. Squiggle API (AFL only) — most reliable
        if afl_matches:
            try:
                tips = await self.scrape_squiggle(afl_matches)
                all_tips.extend(tips)
                logger.info(f"Squiggle: {len(tips)} tips")
            except Exception as e:
                logger.error(f"Squiggle scraper failed: {e}")

        # 2. FootyForecaster (AFL + NRL) — probability-based predictions
        if matches and PLAYWRIGHT_AVAILABLE:
            try:
                tips = await self.scrape_footyforecaster(matches)
                all_tips.extend(tips)
                logger.info(f"FootyForecaster: {len(tips)} tips")
            except Exception as e:
                logger.error(f"FootyForecaster scraper failed: {e}")

        logger.info(f"Total expert tips scraped: {len(all_tips)}")
        return all_tips

    # ----- Squiggle API (AFL) -----

    async def scrape_squiggle(self, afl_matches: List[Dict]) -> List[Dict]:
        """
        Fetch AFL tips from Squiggle API (https://api.squiggle.com.au)
        This is a stable public JSON API — no scraping needed.
        """
        tips = []
        year = datetime.now().year

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://api.squiggle.com.au/",
                params={"q": "tips", "year": year},
                headers={"User-Agent": "TippingAggregator/1.0 (contact@tippingaggregator.com)"}
            )
            resp.raise_for_status()
            data = resp.json()

        squiggle_tips = data.get("tips", [])
        logger.info(f"Squiggle returned {len(squiggle_tips)} tip records")

        for match in afl_matches:
            match_tips = self._match_squiggle_tips(squiggle_tips, match)
            tips.extend(match_tips)

        return tips

    def _match_squiggle_tips(self, squiggle_tips: List[Dict], match: Dict) -> List[Dict]:
        """Match Squiggle tips to a specific AFL match"""
        tips = []
        home_canonical = normalize_team_name(match["home_team"], "afl")
        away_canonical = normalize_team_name(match["away_team"], "afl")

        if not home_canonical or not away_canonical:
            return tips

        for tip in squiggle_tips:
            sq_home = tip.get("hteam", "")
            sq_away = tip.get("ateam", "")

            sq_home_canonical = normalize_team_name(sq_home, "afl")
            sq_away_canonical = normalize_team_name(sq_away, "afl")

            if sq_home_canonical == home_canonical and sq_away_canonical == away_canonical:
                tipped = tip.get("tip", "")
                margin = tip.get("margin")
                source_name = tip.get("sourcename", "Unknown")

                tipped_team = match_team_to_match(tipped, match["home_team"], match["away_team"], "afl")
                if tipped_team:
                    tips.append({
                        "match_id": match["id"],
                        "source": "squiggle",
                        "expert_name": source_name,
                        "tipped_team": tipped_team,
                        "predicted_margin": float(margin) if margin else None,
                        "sport": "afl",
                    })

        return tips

    # ----- FootyForecaster (AFL + NRL) -----

    async def scrape_footyforecaster(self, matches: List[Dict]) -> List[Dict]:
        """
        Scrape predictions from FootyForecaster.com for both AFL and NRL.
        Returns one tip per match with probability and predicted margin.
        """
        tips = []
        sports_needed = set(m["sport"] for m in matches)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)

            for sport in sports_needed:
                sport_matches = [m for m in matches if m["sport"] == sport]
                league = "AFL" if sport == "afl" else "NRL"
                url = f"https://footyforecaster.com/{league}/RoundForecast"

                page = await browser.new_page()
                try:
                    await page.goto(url, wait_until="networkidle", timeout=20000)
                    await asyncio.sleep(1)

                    # Find and click the current/upcoming round link
                    round_link = await self._find_current_round(page, league)
                    if round_link:
                        await round_link.click()
                        await asyncio.sleep(2)

                    content = await page.content()
                    forecasts = self._parse_footyforecaster(content, sport)
                    logger.info(f"FootyForecaster {league}: parsed {len(forecasts)} forecasts")

                    # Match forecasts to our matches
                    for forecast in forecasts:
                        for match in sport_matches:
                            home_canonical = normalize_team_name(match["home_team"], sport)
                            ff_home_canonical = normalize_team_name(forecast["home_team"], sport)
                            ff_away_canonical = normalize_team_name(forecast["away_team"], sport)
                            away_canonical = normalize_team_name(match["away_team"], sport)

                            if ff_home_canonical == home_canonical and ff_away_canonical == away_canonical:
                                tips.append({
                                    "match_id": match["id"],
                                    "source": "footyforecaster",
                                    "expert_name": "FootyForecaster Model",
                                    "tipped_team": match_team_to_match(
                                        forecast["tipped_team"], match["home_team"], match["away_team"], sport
                                    ) or forecast["tipped_team"],
                                    "predicted_margin": forecast.get("margin"),
                                    "sport": sport,
                                })
                                break

                except Exception as e:
                    logger.error(f"Error scraping FootyForecaster {league}: {e}")
                finally:
                    await page.close()

            await browser.close()

        return tips

    async def _find_current_round(self, page, league: str):
        """Find and return the link element for the current/nearest round."""
        year = datetime.now().year

        # Try common round name patterns
        round_names = [
            f"{year} Opening Round",
            f"{year} Round 0",
            f"{year} Round 1",
        ]

        # Also try to find the round that's closest to now
        for i in range(24, 0, -1):
            round_names.append(f"{year} Round {i}")

        for name in round_names:
            try:
                link = page.locator(f"text={name}").first
                if await link.is_visible(timeout=500):
                    return link
            except Exception:
                continue

        return None

    def _parse_footyforecaster(self, html: str, sport: str) -> List[Dict]:
        """
        Parse FootyForecaster round forecast page.
        Expected format per match:
          "Team A v Team B (Venue)"
          "Probability" "Team A XX.X% Team B YY.Y%"
          "Forecast" "Team by N points"
        """
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(separator='\n')
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        forecasts = []
        i = 0
        while i < len(lines):
            line = lines[i]

            # Match pattern: "Team A v Team B (Venue)"
            match_pattern = re.match(r'^(.+?)\s+v\s+(.+?)\s*\(', line)
            if match_pattern:
                home_team = match_pattern.group(1).strip()
                away_team = match_pattern.group(2).strip()

                # Look ahead for Forecast line with "by X points"
                tipped_team = None
                margin = None
                for j in range(i + 1, min(i + 8, len(lines))):
                    forecast_match = re.match(r'^(.+?)\s+by\s+(\d+)\s+points?', lines[j])
                    if forecast_match:
                        tipped_team = forecast_match.group(1).strip()
                        margin = float(forecast_match.group(2))
                        break

                if tipped_team:
                    forecasts.append({
                        "home_team": home_team,
                        "away_team": away_team,
                        "tipped_team": tipped_team,
                        "margin": margin,
                    })

            i += 1

        return forecasts
