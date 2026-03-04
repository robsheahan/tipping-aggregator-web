"""
Supabase Database Client

Handles all database operations for the racing aggregator
"""

import os
from typing import List, Dict, Optional
from supabase import create_client, Client
from loguru import logger

from models.database import Meet, Race, RaceOdds, ExpertTip, ConsensusScore
from models.sport_models import SportMatch, SportExpertTip, SportTipConsensus

class SupabaseClient:
    """
    Wrapper for Supabase database operations
    """

    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key for backend

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.client: Client = create_client(url, key)
        logger.info("Supabase client initialized")

    async def upsert_meet(self, meet: Meet):
        """
        Insert or update a race meet
        """
        try:
            data = meet.dict()
            # Convert date to string for JSON serialization
            if 'date' in data and hasattr(data['date'], 'isoformat'):
                data['date'] = data['date'].isoformat()
            result = self.client.table("meets").upsert(data).execute()
            logger.debug(f"Upserted meet: {meet.id}")
            return result

        except Exception as e:
            logger.error(f"Error upserting meet {meet.id}: {e}")
            raise

    async def upsert_race(self, race: Race):
        """
        Insert or update a race
        """
        try:
            data = race.dict()
            # Convert runners list to JSONB
            data['runners'] = [r.dict() if hasattr(r, 'dict') else r for r in data.get('runners', [])]

            # Convert all datetime fields to ISO string for JSON serialization
            datetime_fields = ['start_time', 'created_at', 'updated_at']
            for field in datetime_fields:
                if field in data and hasattr(data[field], 'isoformat'):
                    data[field] = data[field].isoformat()

            # Convert any datetime objects in runners
            for runner in data['runners']:
                for key, value in runner.items():
                    if hasattr(value, 'isoformat'):
                        runner[key] = value.isoformat()

            result = self.client.table("races").upsert(data).execute()
            logger.debug(f"Upserted race: {race.id}")
            return result

        except Exception as e:
            logger.error(f"Error upserting race {race.id}: {e}")
            raise

    async def save_odds(self, odds: RaceOdds):
        """
        Save odds for a runner
        """
        try:
            data = odds.dict(exclude={'id'})
            result = self.client.table("race_odds").insert(data).execute()
            return result

        except Exception as e:
            logger.error(f"Error saving odds: {e}")
            # Continue on duplicate key error
            pass

    async def get_best_odds(self, race_id: str, runner_number: int) -> Optional[Dict]:
        """
        Get the best odds for a runner
        """
        try:
            result = self.client.table("race_odds") \
                .select("bookmaker, odds") \
                .eq("race_id", race_id) \
                .eq("runner_number", runner_number) \
                .order("odds", desc=True) \
                .limit(1) \
                .execute()

            if result.data:
                return {
                    "bookmaker": result.data[0]["bookmaker"],
                    "odds": result.data[0]["odds"]
                }

            return None

        except Exception as e:
            logger.error(f"Error getting best odds: {e}")
            return None

    async def save_expert_tip(self, tip: ExpertTip):
        """
        Save an expert tip
        """
        try:
            data = tip.dict(exclude={'id'})
            # Convert datetime to ISO string
            if 'scraped_at' in data and hasattr(data['scraped_at'], 'isoformat'):
                data['scraped_at'] = data['scraped_at'].isoformat()
            result = self.client.table("expert_tips").upsert(data).execute()
            logger.debug(f"Saved tip: {tip.source} - {tip.runner_name}")
            return result

        except Exception as e:
            logger.error(f"Error saving tip: {e}")
            raise

    async def get_tips_for_runner(self, race_id: str, runner_number: int) -> List[Dict]:
        """
        Get all tips for a specific runner
        """
        try:
            result = self.client.table("expert_tips") \
                .select("*") \
                .eq("race_id", race_id) \
                .eq("runner_number", runner_number) \
                .execute()

            return result.data

        except Exception as e:
            logger.error(f"Error getting tips for runner: {e}")
            return []

    async def save_consensus_score(self, consensus: ConsensusScore):
        """
        Save consensus score for a runner
        """
        try:
            data = consensus.dict(exclude={'id'})
            # Convert datetime to ISO string
            if 'updated_at' in data and hasattr(data['updated_at'], 'isoformat'):
                data['updated_at'] = data['updated_at'].isoformat()
            result = self.client.table("consensus_scores").upsert(data).execute()
            logger.debug(f"Saved consensus: {consensus.runner_name} - Score: {consensus.consensus_score}")
            return result

        except Exception as e:
            logger.error(f"Error saving consensus: {e}")
            raise

    async def update_consensus_verdict(
        self,
        race_id: str,
        runner_number: int,
        verdict: str
    ):
        """
        Update the AI verdict for a consensus score
        """
        try:
            result = self.client.table("consensus_scores") \
                .update({"ai_verdict": verdict}) \
                .eq("race_id", race_id) \
                .eq("runner_number", runner_number) \
                .execute()

            return result

        except Exception as e:
            logger.error(f"Error updating verdict: {e}")
            raise

    async def get_todays_races_with_consensus(self) -> List[Dict]:
        """
        Get today's races with consensus scores

        Uses the database function created in schema.sql
        """
        try:
            result = self.client.rpc("get_todays_races_with_consensus").execute()
            return result.data

        except Exception as e:
            logger.error(f"Error getting races with consensus: {e}")
            return []

    async def track_affiliate_click(
        self,
        bookmaker: str,
        race_id: str,
        runner_number: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """
        Track an affiliate click for analytics
        """
        try:
            data = {
                "bookmaker": bookmaker,
                "race_id": race_id,
                "runner_number": runner_number,
                "ip_address": ip_address,
                "user_agent": user_agent
            }

            result = self.client.table("affiliate_clicks").insert(data).execute()
            return result

        except Exception as e:
            logger.error(f"Error tracking click: {e}")
            # Don't raise - analytics failure shouldn't break the app
            pass

    # ========================================
    # Sport Match Methods (AFL/NRL)
    # ========================================

    async def upsert_sport_match(self, match: SportMatch):
        """Upsert a sport match with aggregated odds and predictions"""
        try:
            data = match.dict()
            result = self.client.table("sport_matches").upsert(data).execute()
            logger.debug(f"Upserted sport match: {match.home_team} vs {match.away_team}")
            return result
        except Exception as e:
            logger.error(f"Error upserting sport match {match.id}: {e}")
            raise

    async def save_sport_expert_tip(self, tip: SportExpertTip):
        """Save an expert tip for a sport match"""
        try:
            data = tip.dict()
            result = self.client.table("sport_expert_tips").upsert(
                data, on_conflict="match_id,source,expert_name"
            ).execute()
            logger.debug(f"Saved sport tip: {tip.source} - {tip.tipped_team}")
            return result
        except Exception as e:
            logger.error(f"Error saving sport tip: {e}")
            raise

    async def upsert_sport_tip_consensus(self, consensus: SportTipConsensus):
        """Upsert tip consensus for a sport match"""
        try:
            data = consensus.dict()
            result = self.client.table("sport_tip_consensus").upsert(
                data, on_conflict="match_id"
            ).execute()
            logger.debug(f"Upserted consensus for match: {consensus.match_id}")
            return result
        except Exception as e:
            logger.error(f"Error upserting sport consensus: {e}")
            raise

    async def get_sport_matches(self, league: Optional[str] = None, upcoming_only: bool = True) -> List[Dict]:
        """Get sport matches, optionally filtered by league"""
        try:
            query = self.client.table("sport_matches").select("*")
            if league:
                query = query.eq("league", league)
            if upcoming_only:
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc).isoformat()
                query = query.gte("commence_time", now)
            query = query.order("commence_time")
            result = query.execute()
            return result.data
        except Exception as e:
            logger.error(f"Error getting sport matches: {e}")
            return []

    async def get_sport_match_with_tips(self, match_id: str) -> Optional[Dict]:
        """Get a sport match with its expert tips and consensus"""
        try:
            # Get the match
            match_result = self.client.table("sport_matches") \
                .select("*") \
                .eq("id", match_id) \
                .single() \
                .execute()

            if not match_result.data:
                return None

            match_data = match_result.data

            # Get expert tips
            tips_result = self.client.table("sport_expert_tips") \
                .select("*") \
                .eq("match_id", match_id) \
                .execute()
            match_data["expert_tips"] = tips_result.data or []

            # Get consensus
            consensus_result = self.client.table("sport_tip_consensus") \
                .select("*") \
                .eq("match_id", match_id) \
                .single() \
                .execute()
            match_data["tip_consensus"] = consensus_result.data

            return match_data
        except Exception as e:
            logger.error(f"Error getting sport match with tips: {e}")
            return None


async def init_database():
    """
    Initialize database connection and verify schema
    """
    try:
        client = SupabaseClient()
        logger.info("✓ Database connection verified")
        return client

    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
