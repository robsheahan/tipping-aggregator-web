"""
AFL/NRL Sport Aggregator Worker

Daily pipeline that:
1. Fetches odds from TheOddsAPI for AFL + NRL (h2h, spreads, totals)
2. Aggregates probabilities across bookmakers (vig-removed)
3. Calculates predicted margins & scores from spread/total lines
4. Saves everything to Supabase (sport_matches table)
5. Scrapes expert tips & calculates consensus

Usage:
    python workers/sport_aggregator.py --once    # Run once and exit
    python workers/sport_aggregator.py           # Run on schedule
"""

import asyncio
import os
import sys
import json
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from loguru import logger

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

import httpx
from utils.database import SupabaseClient
from models.sport_models import SportMatch, SportExpertTip, SportTipConsensus
from scrapers.sport_tips_scraper import SportTipsScraper

# Configure logging
logger.add("logs/sport_worker.log", rotation="50 MB", retention="30 days", level="INFO")

# TheOddsAPI config
THEODDSAPI_BASE = "https://api.the-odds-api.com/v4"
SPORT_KEYS = {
    "afl": "aussierules_afl",
    "nrl": "rugbyleague_nrl",
}
LEAGUE_MAP = {
    "afl": "AFL",
    "nrl": "NRL",
}


class SportAggregator:
    """Main orchestrator for AFL/NRL data pipeline"""

    def __init__(self):
        self.db = SupabaseClient()
        self.scraper = SportTipsScraper()
        self.api_key = os.getenv("THEODDSAPI_KEY")
        if not self.api_key:
            raise ValueError("THEODDSAPI_KEY must be set")

    async def run(self):
        """Main execution flow"""
        try:
            logger.info("=" * 60)
            logger.info("Starting Sport Aggregator Run")
            logger.info(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
            logger.info("=" * 60)

            all_matches = []

            # Step 1: Fetch odds from TheOddsAPI
            for sport, sport_key in SPORT_KEYS.items():
                logger.info(f"Step 1: Fetching odds for {sport.upper()}...")
                try:
                    matches = await self.fetch_odds(sport, sport_key)
                    logger.info(f"  Fetched {len(matches)} {sport.upper()} matches")
                    all_matches.extend(matches)
                except Exception as e:
                    logger.error(f"Failed to fetch odds for {sport.upper()}: {e}")
                    continue

            if not all_matches:
                logger.warning("No matches found. Exiting.")
                return

            # Steps 2-4: Aggregate, calculate, and save
            logger.info("Step 2-4: Aggregating odds, calculating predictions, saving to DB...")
            for match in all_matches:
                await self.db.upsert_sport_match(match)
            logger.info(f"  Saved {len(all_matches)} matches to Supabase")

            # Step 5: Scrape expert tips and calculate consensus
            logger.info("Step 5: Scraping expert tips...")
            match_dicts = [
                {
                    "id": m.id,
                    "home_team": m.home_team,
                    "away_team": m.away_team,
                    "sport": m.sport,
                    "commence_time": m.commence_time,
                }
                for m in all_matches
            ]
            tips = await self.scraper.scrape_all(match_dicts)
            logger.info(f"  Scraped {len(tips)} expert tips")

            # Save tips to database
            for tip_dict in tips:
                try:
                    tip = SportExpertTip(**tip_dict)
                    await self.db.save_sport_expert_tip(tip)
                except Exception as e:
                    logger.error(f"Error saving tip: {e}")

            # Calculate consensus for each match
            logger.info("Calculating tip consensus...")
            await self.calculate_consensus(all_matches, tips)

            logger.info("=" * 60)
            logger.info("Sport Aggregator run completed successfully!")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Error in sport aggregator run: {e}", exc_info=True)
            raise

    async def fetch_odds(self, sport: str, sport_key: str) -> List[SportMatch]:
        """
        Fetch odds from TheOddsAPI for a sport.
        Requests h2h, spreads, and totals markets in one call.
        Returns list of SportMatch models with aggregated data.
        """
        matches = []

        async with httpx.AsyncClient(timeout=30) as client:
            params = {
                "apiKey": self.api_key,
                "regions": "au",
                "markets": "h2h,spreads,totals",
                "oddsFormat": "decimal",
            }

            url = f"{THEODDSAPI_BASE}/sports/{sport_key}/odds"
            resp = await client.get(url, params=params)

            if resp.status_code != 200:
                logger.error(f"TheOddsAPI error for {sport_key}: {resp.status_code} {resp.text}")
                return []

            events = resp.json()

            # Log remaining API requests
            remaining = resp.headers.get("x-requests-remaining", "?")
            used = resp.headers.get("x-requests-used", "?")
            logger.info(f"  TheOddsAPI quota: {used} used, {remaining} remaining")

        for event in events:
            try:
                match = self._process_event(event, sport)
                if match:
                    matches.append(match)
            except Exception as e:
                logger.error(f"Error processing event {event.get('id')}: {e}")

        return matches

    def _process_event(self, event: Dict, sport: str) -> Optional[SportMatch]:
        """
        Process a single TheOddsAPI event:
        - Aggregate h2h probabilities across bookmakers
        - Extract consensus spread and total
        - Calculate predicted scores
        """
        event_id = event["id"]
        home_team = event["home_team"]
        away_team = event["away_team"]
        commence_time = event["commence_time"]

        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            return None

        # --- H2H (moneyline) aggregation ---
        h2h_probs = []
        bookmaker_odds_list = []

        for bm in bookmakers:
            h2h_market = next((m for m in bm["markets"] if m["key"] == "h2h"), None)
            if not h2h_market:
                continue

            outcomes = {o["name"]: o["price"] for o in h2h_market["outcomes"]}
            home_odds = outcomes.get(home_team)
            away_odds = outcomes.get(away_team)

            if not home_odds or not away_odds:
                continue

            # Convert to implied probability and normalize (remove vig)
            home_imp = 1.0 / home_odds
            away_imp = 1.0 / away_odds
            total_imp = home_imp + away_imp
            home_norm = home_imp / total_imp
            away_norm = away_imp / total_imp

            h2h_probs.append((home_norm, away_norm))

            # Build bookmaker odds record for raw storage
            bm_record = {
                "bookmaker": bm["title"],
                "home_odds": home_odds,
                "away_odds": away_odds,
                "home_prob": round(home_norm, 4),
                "away_prob": round(away_norm, 4),
                "last_update": bm["last_update"],
            }

            # Add spreads if available
            spreads_market = next((m for m in bm["markets"] if m["key"] == "spreads"), None)
            if spreads_market:
                for o in spreads_market["outcomes"]:
                    if o["name"] == home_team:
                        bm_record["home_spread"] = o.get("point")
                        bm_record["home_spread_odds"] = o["price"]
                    elif o["name"] == away_team:
                        bm_record["away_spread"] = o.get("point")
                        bm_record["away_spread_odds"] = o["price"]

            # Add totals if available
            totals_market = next((m for m in bm["markets"] if m["key"] == "totals"), None)
            if totals_market:
                for o in totals_market["outcomes"]:
                    if o["name"] == "Over":
                        bm_record["total_over"] = o.get("point")
                        bm_record["total_over_odds"] = o["price"]
                    elif o["name"] == "Under":
                        bm_record["total_under"] = o.get("point")
                        bm_record["total_under_odds"] = o["price"]

            bookmaker_odds_list.append(bm_record)

        if not h2h_probs:
            return None

        # Average probabilities across all bookmakers
        avg_home_prob = sum(p[0] for p in h2h_probs) / len(h2h_probs)
        avg_away_prob = sum(p[1] for p in h2h_probs) / len(h2h_probs)

        # Determine tip and confidence
        if avg_home_prob > avg_away_prob:
            tip = "home"
            confidence = avg_home_prob
        else:
            tip = "away"
            confidence = avg_away_prob

        # --- Spread aggregation ---
        home_spreads = []
        away_spreads = []
        for bm_record in bookmaker_odds_list:
            if "home_spread" in bm_record and bm_record["home_spread"] is not None:
                home_spreads.append(bm_record["home_spread"])
            if "away_spread" in bm_record and bm_record["away_spread"] is not None:
                away_spreads.append(bm_record["away_spread"])

        avg_home_spread = sum(home_spreads) / len(home_spreads) if home_spreads else None
        avg_away_spread = sum(away_spreads) / len(away_spreads) if away_spreads else None

        # --- Total aggregation ---
        totals = []
        for bm_record in bookmaker_odds_list:
            if "total_over" in bm_record and bm_record["total_over"] is not None:
                totals.append(bm_record["total_over"])

        avg_total = sum(totals) / len(totals) if totals else None

        # --- Predicted scores ---
        home_predicted = None
        away_predicted = None
        predicted_margin = None

        if avg_home_spread is not None and avg_total is not None:
            # margin from the home team's perspective: positive means away favoured
            # home_spread is negative if home is favoured (e.g. -6.5)
            margin_raw = abs(avg_home_spread)

            if avg_home_spread <= 0:
                # Home is favoured
                home_predicted = round((avg_total + margin_raw) / 2)
                away_predicted = round((avg_total - margin_raw) / 2)
            else:
                # Away is favoured
                away_predicted = round((avg_total + margin_raw) / 2)
                home_predicted = round((avg_total - margin_raw) / 2)

            # Derive margin from rounded scores so they're always consistent
            predicted_margin = abs(home_predicted - away_predicted)

        now = datetime.now(timezone.utc).isoformat()

        return SportMatch(
            id=event_id,
            sport=sport,
            league=LEAGUE_MAP[sport],
            home_team=home_team,
            away_team=away_team,
            commence_time=commence_time,
            home_prob=round(avg_home_prob, 4),
            away_prob=round(avg_away_prob, 4),
            tip=tip,
            confidence=round(confidence, 4),
            home_spread=round(avg_home_spread, 1) if avg_home_spread is not None else None,
            away_spread=round(avg_away_spread, 1) if avg_away_spread is not None else None,
            total_points=round(avg_total, 1) if avg_total is not None else None,
            home_predicted_score=home_predicted,
            away_predicted_score=away_predicted,
            predicted_margin=predicted_margin,
            contributing_providers=len(h2h_probs),
            last_updated=now,
            bookmaker_odds=bookmaker_odds_list,
        )

    async def calculate_consensus(self, matches: List[SportMatch], tips: List[Dict]):
        """Calculate and save tip consensus for each match"""
        # Group tips by match
        tips_by_match: Dict[str, List[Dict]] = {}
        for tip in tips:
            mid = tip["match_id"]
            if mid not in tips_by_match:
                tips_by_match[mid] = []
            tips_by_match[mid].append(tip)

        for match in matches:
            match_tips = tips_by_match.get(match.id, [])
            if not match_tips:
                continue

            home_tips = 0
            away_tips = 0
            margins = []

            for tip in match_tips:
                tipped = tip["tipped_team"]
                if tipped == match.home_team:
                    home_tips += 1
                elif tipped == match.away_team:
                    away_tips += 1
                else:
                    # Try fuzzy match
                    from scrapers.sport_tips_scraper import normalize_team_name
                    canonical = normalize_team_name(tipped, match.sport)
                    home_canonical = normalize_team_name(match.home_team, match.sport)
                    away_canonical = normalize_team_name(match.away_team, match.sport)
                    if canonical == home_canonical:
                        home_tips += 1
                    elif canonical == away_canonical:
                        away_tips += 1

                if tip.get("predicted_margin") is not None:
                    margins.append(tip["predicted_margin"])

            total = home_tips + away_tips
            if total == 0:
                continue

            if home_tips >= away_tips:
                consensus_team = match.home_team
                consensus_pct = home_tips / total
            else:
                consensus_team = match.away_team
                consensus_pct = away_tips / total

            # Determine strength
            if consensus_pct >= 1.0:
                strength = "unanimous"
            elif consensus_pct >= 0.7:
                strength = "strong"
            elif consensus_pct >= 0.55:
                strength = "lean"
            else:
                strength = "split"

            avg_margin = sum(margins) / len(margins) if margins else None

            consensus = SportTipConsensus(
                match_id=match.id,
                home_tips=home_tips,
                away_tips=away_tips,
                total_tips=total,
                consensus_team=consensus_team,
                consensus_pct=round(consensus_pct, 4),
                consensus_strength=strength,
                avg_predicted_margin=round(avg_margin, 1) if avg_margin is not None else None,
            )

            try:
                await self.db.upsert_sport_tip_consensus(consensus)
            except Exception as e:
                logger.error(f"Error saving consensus for {match.id}: {e}")


def run_once():
    """Run the aggregator once"""
    aggregator = SportAggregator()
    asyncio.run(aggregator.run())


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        logger.info("Running in one-time mode")
        run_once()
    else:
        # Default: run once (designed to be called by cron)
        logger.info("Running sport aggregator...")
        run_once()
