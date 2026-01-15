"""
Automated Racing Data Aggregator Worker

This script runs on a schedule to:
1. Fetch today's Australian race meetings from The Racing API
2. Scrape expert tips from public sources using Playwright
3. Use Claude AI to analyze tips and extract confidence scores
4. Calculate consensus scores and generate AI verdicts
5. Save everything to Supabase

Usage:
    python workers/aggregator.py
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict
from loguru import logger
import schedule
import time

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.racing_api import RacingAPIClient
from scrapers.tips_scraper import TipsScraper
from utils.claude_analyzer import ClaudeAnalyzer
from utils.database import SupabaseClient
from models.database import Race, ExpertTip, ConsensusScore, RaceOdds

# Configure logging
logger.add("logs/worker.log", rotation="500 MB", retention="10 days", level="INFO")

class RacingAggregator:
    """
    Main aggregator class that orchestrates the data pipeline
    """

    def __init__(self):
        self.racing_api = RacingAPIClient()
        self.tips_scraper = TipsScraper()
        self.claude = ClaudeAnalyzer()
        self.db = SupabaseClient()

    async def run(self):
        """
        Main execution flow
        """
        try:
            logger.info("=" * 60)
            logger.info("Starting Racing Aggregator Run")
            logger.info(f"Timestamp: {datetime.now().isoformat()}")
            logger.info("=" * 60)

            # Step 1: Fetch race meetings and races
            logger.info("Step 1: Fetching today's race meetings...")
            races = await self.fetch_races()
            logger.info(f"✓ Fetched {len(races)} races")

            if not races:
                logger.warning("No races found for today. Exiting.")
                return

            # Step 2: Fetch odds for all races
            logger.info("Step 2: Fetching odds for all races...")
            await self.fetch_and_save_odds(races)
            logger.info("✓ Odds fetched and saved")

            # Step 3: Scrape expert tips
            logger.info("Step 3: Scraping expert tips...")
            tips = await self.scrape_tips(races)
            logger.info(f"✓ Scraped {len(tips)} expert tips")

            if not tips:
                logger.warning("No tips found. Skipping consensus calculation.")
                return

            # Step 4: Analyze tips with Claude AI
            logger.info("Step 4: Analyzing tips with Claude AI...")
            analyzed_tips = await self.analyze_tips(tips)
            logger.info(f"✓ Analyzed {len(analyzed_tips)} tips")

            # Step 5: Calculate consensus scores
            logger.info("Step 5: Calculating consensus scores...")
            consensus_scores = await self.calculate_consensus(analyzed_tips, races)
            logger.info(f"✓ Generated {len(consensus_scores)} consensus scores")

            # Step 6: Generate AI verdicts
            logger.info("Step 6: Generating AI verdicts...")
            await self.generate_verdicts(consensus_scores)
            logger.info("✓ AI verdicts generated")

            logger.info("=" * 60)
            logger.info("Aggregator run completed successfully!")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Error in aggregator run: {e}", exc_info=True)
            raise

    async def fetch_races(self) -> List[Race]:
        """
        Fetch today's Australian race meetings and races
        """
        try:
            # Get today's meets
            meets = await self.racing_api.get_todays_meets()
            logger.info(f"Found {len(meets)} meets today")

            all_races = []

            for meet in meets:
                logger.info(f"Fetching races for {meet.venue}...")

                # Get races for this meet
                races = await self.racing_api.get_races_for_meet(meet.id)

                # Save meet to database
                await self.db.upsert_meet(meet)

                for race in races:
                    # Save race to database
                    await self.db.upsert_race(race)
                    all_races.append(race)

                # Rate limiting
                await asyncio.sleep(0.5)

            return all_races

        except Exception as e:
            logger.error(f"Error fetching races: {e}", exc_info=True)
            return []

    async def fetch_and_save_odds(self, races: List[Race]):
        """
        Fetch odds for all races and save to database
        """
        for race in races:
            try:
                # Get detailed race with odds
                detailed_race = await self.racing_api.get_race_details(
                    race.meet_id,
                    race.race_number
                )

                # Extract odds for each runner and bookmaker
                for runner in detailed_race.runners:
                    for bookmaker, odds_value in runner.get('odds', {}).items():
                        odds = RaceOdds(
                            race_id=race.id,
                            runner_number=runner.get('number'),
                            bookmaker=bookmaker,
                            odds=odds_value
                        )
                        await self.db.save_odds(odds)

                # Rate limiting
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Error fetching odds for race {race.id}: {e}")
                continue

    async def scrape_tips(self, races: List[Race]) -> List[ExpertTip]:
        """
        Scrape expert tips from configured sources
        """
        try:
            tips = await self.tips_scraper.scrape_all_sources(races)
            return tips
        except Exception as e:
            logger.error(f"Error scraping tips: {e}", exc_info=True)
            return []

    async def analyze_tips(self, tips: List[ExpertTip]) -> List[ExpertTip]:
        """
        Analyze tips with Claude AI to extract confidence scores and categories
        """
        analyzed_tips = []

        for tip in tips:
            try:
                # Send to Claude for analysis
                analysis = await self.claude.analyze_tip(tip.raw_text)

                # Update tip with AI analysis
                tip.confidence_score = analysis['confidence_score']
                tip.category = analysis['category']
                tip.ai_summary = analysis['summary']

                # Save to database
                await self.db.save_expert_tip(tip)

                analyzed_tips.append(tip)

                # Rate limiting for API
                await asyncio.sleep(0.2)

            except Exception as e:
                logger.error(f"Error analyzing tip: {e}")
                continue

        return analyzed_tips

    async def calculate_consensus(
        self,
        tips: List[ExpertTip],
        races: List[Race]
    ) -> List[ConsensusScore]:
        """
        Calculate consensus scores for each runner based on expert tips
        """
        consensus_scores = []

        # Group tips by race
        tips_by_race = {}
        for tip in tips:
            if tip.race_id not in tips_by_race:
                tips_by_race[tip.race_id] = []
            tips_by_race[tip.race_id].append(tip)

        # Calculate consensus for each race
        for race in races:
            race_tips = tips_by_race.get(race.id, [])

            if not race_tips:
                continue

            # Group tips by runner
            tips_by_runner = {}
            for tip in race_tips:
                runner_num = tip.runner_number
                if runner_num not in tips_by_runner:
                    tips_by_runner[runner_num] = []
                tips_by_runner[runner_num].append(tip)

            # Calculate consensus for each runner
            for runner_num, runner_tips in tips_by_runner.items():
                # Get runner info
                runner_info = next(
                    (r for r in race.runners if r.number == runner_num),
                    None
                )

                if not runner_info:
                    continue

                # Calculate average confidence score
                avg_confidence = sum(t.confidence_score for t in runner_tips) / len(runner_tips)

                # Get best odds from database
                best_odds_data = await self.db.get_best_odds(race.id, runner_num)

                # Build tip breakdown
                tip_breakdown = {
                    tip.source: tip.confidence_score
                    for tip in runner_tips
                }

                consensus = ConsensusScore(
                    race_id=race.id,
                    runner_number=runner_num,
                    runner_name=runner_info.name,
                    consensus_score=int(avg_confidence),
                    num_tips=len(runner_tips),
                    best_odds=best_odds_data['odds'] if best_odds_data else 0.0,
                    best_bookmaker=best_odds_data['bookmaker'] if best_odds_data else '',
                    tip_breakdown=tip_breakdown,
                    ai_verdict=""  # Will be generated in next step
                )

                consensus_scores.append(consensus)

                # Save to database
                await self.db.save_consensus_score(consensus)

        return consensus_scores

    async def generate_verdicts(self, consensus_scores: List[ConsensusScore]):
        """
        Generate AI verdicts (1-sentence summaries) for each runner
        """
        for consensus in consensus_scores:
            try:
                # Get all tips for this runner
                tips = await self.db.get_tips_for_runner(
                    consensus.race_id,
                    consensus.runner_number
                )

                # Generate verdict with Claude
                verdict = await self.claude.generate_verdict(
                    runner_name=consensus.runner_name,
                    tips=tips,
                    consensus_score=consensus.consensus_score
                )

                # Update consensus with verdict
                consensus.ai_verdict = verdict
                await self.db.update_consensus_verdict(
                    consensus.race_id,
                    consensus.runner_number,
                    verdict
                )

                # Rate limiting
                await asyncio.sleep(0.2)

            except Exception as e:
                logger.error(f"Error generating verdict for {consensus.runner_name}: {e}")
                continue

def run_scheduled():
    """
    Run the aggregator (called by scheduler)
    """
    aggregator = RacingAggregator()
    asyncio.run(aggregator.run())

if __name__ == "__main__":
    # Check if running in schedule mode or one-time mode
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        # Run once and exit
        logger.info("Running in one-time mode")
        run_scheduled()
    else:
        # Run on schedule
        logger.info("Running in scheduled mode")

        # Get schedule from environment or use default
        schedule_time = os.getenv("WORKER_SCHEDULE", "0 */2 * * *")  # Every 2 hours

        # For simplicity, run every 2 hours at the top of the hour
        schedule.every(2).hours.at(":00").do(run_scheduled)

        # Also run once at startup
        logger.info("Running initial aggregation...")
        run_scheduled()

        logger.info(f"Worker scheduled to run every 2 hours")

        # Keep the script running
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
