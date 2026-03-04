"""
Expert Tips Scraper for AFL/NRL

Sources:
- Squiggle API (AFL) — stable public JSON API
- AFL.com.au (AFL) — Playwright + BeautifulSoup
- NRL.com (NRL) — Playwright + BeautifulSoup
- Punters.com.au (AFL + NRL) — Playwright + BeautifulSoup

Each source is wrapped in try/except so failures don't break the pipeline.
"""

import asyncio
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
    "GWS Giants": ["GWS", "Giants", "GWS Giants", "Greater Western Sydney"],
    "Hawthorn": ["Hawthorn", "Hawks", "Hawthorn Hawks"],
    "Melbourne": ["Melbourne", "Demons", "Melbourne Demons"],
    "North Melbourne": ["North Melbourne", "Kangaroos", "Roos", "North Melbourne Kangaroos"],
    "Port Adelaide": ["Port Adelaide", "Power", "Port Adelaide Power"],
    "Richmond": ["Richmond", "Tigers", "Richmond Tigers"],
    "St Kilda": ["St Kilda", "Saints", "St Kilda Saints"],
    "Sydney Swans": ["Sydney", "Swans", "Sydney Swans"],
    "West Coast Eagles": ["West Coast", "Eagles", "West Coast Eagles"],
    "Western Bulldogs": ["Western Bulldogs", "Bulldogs", "Footscray"],
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

        # 2. AFL.com.au expert tips
        if afl_matches and PLAYWRIGHT_AVAILABLE:
            try:
                tips = await self.scrape_afl_com(afl_matches)
                all_tips.extend(tips)
                logger.info(f"AFL.com.au: {len(tips)} tips")
            except Exception as e:
                logger.error(f"AFL.com.au scraper failed: {e}")

        # 3. NRL.com expert tips
        if nrl_matches and PLAYWRIGHT_AVAILABLE:
            try:
                tips = await self.scrape_nrl_com(nrl_matches)
                all_tips.extend(tips)
                logger.info(f"NRL.com: {len(tips)} tips")
            except Exception as e:
                logger.error(f"NRL.com scraper failed: {e}")

        # 4. Punters.com.au (both sports)
        if matches and PLAYWRIGHT_AVAILABLE:
            try:
                tips = await self.scrape_punters(matches)
                all_tips.extend(tips)
                logger.info(f"Punters.com.au: {len(tips)} tips")
            except Exception as e:
                logger.error(f"Punters.com.au scraper failed: {e}")

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
            # Fetch tips for the current round
            # Squiggle returns tips grouped by match with tipster predictions
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
            # Squiggle uses 'hteam' and 'ateam' fields
            sq_home = tip.get("hteam", "")
            sq_away = tip.get("ateam", "")

            sq_home_canonical = normalize_team_name(sq_home, "afl")
            sq_away_canonical = normalize_team_name(sq_away, "afl")

            # Check if this tip is for our match
            if sq_home_canonical == home_canonical and sq_away_canonical == away_canonical:
                tipped = tip.get("tip", "")
                margin = tip.get("margin")
                source_name = tip.get("sourcename", "Unknown")

                # Determine which team was tipped
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

    # ----- AFL.com.au -----

    async def scrape_afl_com(self, afl_matches: List[Dict]) -> List[Dict]:
        """Scrape expert tips from AFL.com.au"""
        tips = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                await page.goto("https://www.afl.com.au/tipping", wait_until="networkidle", timeout=30000)
                await asyncio.sleep(2)

                content = await page.content()
                soup = BeautifulSoup(content, "lxml")

                # Look for expert tip panels — the actual selectors may change
                tip_panels = soup.select("[class*='tip'], [class*='expert'], [class*='prediction']")

                for panel in tip_panels:
                    try:
                        expert = panel.select_one("[class*='name'], [class*='author']")
                        team_el = panel.select_one("[class*='team'], [class*='pick']")

                        if expert and team_el:
                            expert_name = expert.get_text(strip=True)
                            tipped_raw = team_el.get_text(strip=True)

                            # Try to match to a specific match
                            for match in afl_matches:
                                tipped_team = match_team_to_match(
                                    tipped_raw, match["home_team"], match["away_team"], "afl"
                                )
                                if tipped_team:
                                    tips.append({
                                        "match_id": match["id"],
                                        "source": "afl.com.au",
                                        "expert_name": expert_name,
                                        "tipped_team": tipped_team,
                                        "predicted_margin": None,
                                        "sport": "afl",
                                    })
                                    break
                    except Exception as e:
                        logger.debug(f"Error parsing AFL.com.au tip panel: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error loading AFL.com.au: {e}")
            finally:
                await browser.close()

        return tips

    # ----- NRL.com -----

    async def scrape_nrl_com(self, nrl_matches: List[Dict]) -> List[Dict]:
        """Scrape expert tips from NRL.com"""
        tips = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                await page.goto("https://www.nrl.com/tipping", wait_until="networkidle", timeout=30000)
                await asyncio.sleep(2)

                content = await page.content()
                soup = BeautifulSoup(content, "lxml")

                # Look for expert tip sections
                tip_sections = soup.select("[class*='tip'], [class*='expert'], [class*='prediction']")

                for section in tip_sections:
                    try:
                        expert = section.select_one("[class*='name'], [class*='author']")
                        team_el = section.select_one("[class*='team'], [class*='pick']")

                        if expert and team_el:
                            expert_name = expert.get_text(strip=True)
                            tipped_raw = team_el.get_text(strip=True)

                            for match in nrl_matches:
                                tipped_team = match_team_to_match(
                                    tipped_raw, match["home_team"], match["away_team"], "nrl"
                                )
                                if tipped_team:
                                    tips.append({
                                        "match_id": match["id"],
                                        "source": "nrl.com",
                                        "expert_name": expert_name,
                                        "tipped_team": tipped_team,
                                        "predicted_margin": None,
                                        "sport": "nrl",
                                    })
                                    break
                    except Exception as e:
                        logger.debug(f"Error parsing NRL.com tip section: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error loading NRL.com: {e}")
            finally:
                await browser.close()

        return tips

    # ----- Punters.com.au -----

    async def scrape_punters(self, matches: List[Dict]) -> List[Dict]:
        """Scrape tips from Punters.com.au for both AFL and NRL"""
        tips = []

        sport_urls = {
            "afl": "https://www.punters.com.au/afl/tips/",
            "nrl": "https://www.punters.com.au/nrl/tips/",
        }

        # Which sports do we have matches for?
        sports_needed = set(m["sport"] for m in matches)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)

            for sport in sports_needed:
                url = sport_urls.get(sport)
                if not url:
                    continue

                sport_matches = [m for m in matches if m["sport"] == sport]
                page = await browser.new_page()

                try:
                    await page.goto(url, wait_until="networkidle", timeout=30000)
                    await asyncio.sleep(2)

                    content = await page.content()
                    soup = BeautifulSoup(content, "lxml")

                    # Look for tip entries
                    tip_entries = soup.select("[class*='tip'], [class*='prediction'], [class*='pick']")

                    for entry in tip_entries:
                        try:
                            expert = entry.select_one("[class*='name'], [class*='tipster']")
                            team_el = entry.select_one("[class*='team'], [class*='selection']")
                            margin_el = entry.select_one("[class*='margin'], [class*='points']")

                            if expert and team_el:
                                expert_name = expert.get_text(strip=True)
                                tipped_raw = team_el.get_text(strip=True)
                                margin = None
                                if margin_el:
                                    try:
                                        margin_text = margin_el.get_text(strip=True).replace("+", "").replace("pts", "").strip()
                                        margin = float(margin_text)
                                    except ValueError:
                                        pass

                                for match in sport_matches:
                                    tipped_team = match_team_to_match(
                                        tipped_raw, match["home_team"], match["away_team"], sport
                                    )
                                    if tipped_team:
                                        tips.append({
                                            "match_id": match["id"],
                                            "source": "punters.com.au",
                                            "expert_name": expert_name,
                                            "tipped_team": tipped_team,
                                            "predicted_margin": margin,
                                            "sport": sport,
                                        })
                                        break
                        except Exception as e:
                            logger.debug(f"Error parsing Punters.com.au entry: {e}")
                            continue

                except Exception as e:
                    logger.error(f"Error loading Punters.com.au for {sport}: {e}")
                finally:
                    await page.close()

                # Rate limit between sport pages
                await asyncio.sleep(2)

            await browser.close()

        return tips
