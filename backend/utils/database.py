"""
Supabase Database Client

Handles all database operations for the racing aggregator
"""

import os
from typing import List, Dict, Optional
from supabase import create_client, Client
from loguru import logger

from models.database import Meet, Race, RaceOdds, ExpertTip, ConsensusScore

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
