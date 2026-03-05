"""
Tip Submitter Worker

Reads consensus tips from Supabase and submits them to tipping platforms
via Playwright browser automation.

Usage:
    python workers/tip_submitter.py --once                    # Submit to all platforms
    python workers/tip_submitter.py --once --dry-run          # Show what would be submitted
    python workers/tip_submitter.py --once --platform afl_tipping  # Single platform
    python workers/tip_submitter.py --once --headed           # Show browser (for debugging)
"""

import asyncio
import argparse
import os
import sys
from datetime import datetime, timezone

from loguru import logger

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from utils.database import SupabaseClient
from models.sport_models import SportTipSubmission
from submitters.afl_tipping_submitter import AFLTippingSubmitter
from submitters.nrl_tipping_submitter import NRLTippingSubmitter
from submitters.superbru_submitter import SuperbruSubmitter
from submitters.espn_footytips_submitter import ESPNFootyTipsSubmitter

# Configure logging
logger.add("logs/tip_submitter.log", rotation="50 MB", retention="30 days", level="INFO")

# Platform registry
PLATFORM_SUBMITTERS = {
    "afl_tipping": AFLTippingSubmitter,
    "nrl_tipping": NRLTippingSubmitter,
    "superbru": SuperbruSubmitter,
    "espn_footytips": ESPNFootyTipsSubmitter,
}

# Which sports each platform handles
PLATFORM_SPORTS = {
    "afl_tipping": ["afl"],
    "nrl_tipping": ["nrl"],
    "superbru": ["afl", "nrl"],
    "espn_footytips": ["afl"],
}


class TipSubmitter:
    """Orchestrates tip submission across all platforms."""

    def __init__(self, dry_run: bool = False, headless: bool = True, platform: str = None):
        self.dry_run = dry_run
        self.headless = headless
        self.platform_filter = platform
        self.db = SupabaseClient()

    async def run(self):
        """Main entry point — fetch pending tips and submit to each platform."""
        logger.info("=" * 60)
        logger.info(f"Tip Submitter starting (dry_run={self.dry_run}, headless={self.headless})")
        logger.info("=" * 60)

        # Determine which platforms to run
        if self.platform_filter:
            if self.platform_filter not in PLATFORM_SUBMITTERS:
                logger.error(f"Unknown platform: {self.platform_filter}")
                logger.info(f"Available: {', '.join(PLATFORM_SUBMITTERS.keys())}")
                return
            platforms = [self.platform_filter]
        else:
            platforms = list(PLATFORM_SUBMITTERS.keys())

        total_submitted = 0
        total_failed = 0

        for platform in platforms:
            logger.info(f"\n--- Processing platform: {platform} ---")
            try:
                submitted, failed = await self._process_platform(platform)
                total_submitted += submitted
                total_failed += failed
            except Exception as e:
                logger.error(f"Platform {platform} failed entirely: {e}")
                total_failed += 1

        logger.info(f"\nTip Submitter complete: {total_submitted} submitted, {total_failed} failed")

    async def _process_platform(self, platform: str) -> tuple:
        """Process all pending tips for a single platform. Returns (submitted, failed) counts."""
        sports = PLATFORM_SPORTS.get(platform, [])

        # Get pending submissions for this platform
        pending = await self.db.get_pending_submissions(platform=platform)

        # Filter by sport
        pending = [
            p for p in pending
            if p["match"]["sport"] in sports
        ]

        if not pending:
            logger.info(f"[{platform}] No pending tips to submit")
            return 0, 0

        logger.info(f"[{platform}] {len(pending)} tips to submit")

        # Log what we'll submit
        for item in pending:
            match = item["match"]
            consensus = item["consensus"]
            logger.info(
                f"  {match['home_team']} vs {match['away_team']} -> "
                f"{consensus.get('consensus_team')} "
                f"({consensus.get('consensus_strength')})"
            )

        # Create submitter and run
        submitter_class = PLATFORM_SUBMITTERS[platform]
        submitter = submitter_class(headless=self.headless, dry_run=self.dry_run)
        results = await submitter.submit_all(pending)

        # Save results to DB
        submitted = 0
        failed = 0
        for result in results:
            submission = SportTipSubmission(
                match_id=result["match_id"],
                platform=result["platform"],
                submitted_team=result.get("submitted_team"),
                consensus_team=result.get("consensus_team"),
                consensus_strength=result.get("consensus_strength"),
                status=result["status"],
                error_message=result.get("error_message"),
                screenshot_path=result.get("screenshot_path"),
                submitted_at=result.get("submitted_at"),
            )
            await self.db.save_tip_submission(submission)

            if result["status"] == "submitted":
                submitted += 1
            elif result["status"] == "failed":
                failed += 1

        logger.info(f"[{platform}] Results: {submitted} submitted, {failed} failed")
        return submitted, failed


def parse_args():
    parser = argparse.ArgumentParser(description="Submit consensus tips to tipping platforms")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be submitted without actually submitting")
    parser.add_argument("--platform", type=str, help="Only submit to this platform")
    parser.add_argument("--headed", action="store_true", help="Show browser window (for debugging selectors)")
    return parser.parse_args()


def run_once(dry_run: bool = False, headless: bool = True, platform: str = None):
    submitter = TipSubmitter(dry_run=dry_run, headless=headless, platform=platform)
    asyncio.run(submitter.run())


if __name__ == "__main__":
    args = parse_args()
    headless = not args.headed

    if args.once or True:  # Default to --once for cron
        logger.info("Running tip submitter...")
        run_once(
            dry_run=args.dry_run,
            headless=headless,
            platform=args.platform,
        )
