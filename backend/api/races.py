"""
FastAPI Router: Races

Endpoints for fetching race data
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import date
from loguru import logger

from utils.database import SupabaseClient

router = APIRouter()

@router.get("/today")
async def get_todays_races():
    """
    Get today's races with consensus scores
    """
    try:
        db = SupabaseClient()
        races = await db.get_todays_races_with_consensus()

        return {
            "success": True,
            "count": len(races),
            "races": races
        }

    except Exception as e:
        logger.error(f"Error getting today's races: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{race_id}")
async def get_race_details(race_id: str):
    """
    Get detailed information for a specific race
    """
    try:
        db = SupabaseClient()

        # Get race
        result = db.client.table("races") \
            .select("*") \
            .eq("id", race_id) \
            .single() \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Race not found")

        race = result.data

        # Get consensus scores
        consensus_result = db.client.table("consensus_scores") \
            .select("*") \
            .eq("race_id", race_id) \
            .order("consensus_score", desc=True) \
            .execute()

        race["consensus_scores"] = consensus_result.data

        # Get odds
        odds_result = db.client.table("race_odds") \
            .select("*") \
            .eq("race_id", race_id) \
            .execute()

        race["odds"] = odds_result.data

        return {
            "success": True,
            "race": race
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting race {race_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{race_id}/tips")
async def get_race_tips(race_id: str):
    """
    Get expert tips for a specific race
    """
    try:
        db = SupabaseClient()

        result = db.client.table("expert_tips") \
            .select("*") \
            .eq("race_id", race_id) \
            .execute()

        tips = result.data

        # Group by runner
        tips_by_runner = {}
        for tip in tips:
            runner_num = tip["runner_number"]
            if runner_num not in tips_by_runner:
                tips_by_runner[runner_num] = []
            tips_by_runner[runner_num].append(tip)

        return {
            "success": True,
            "count": len(tips),
            "tips": tips,
            "tips_by_runner": tips_by_runner
        }

    except Exception as e:
        logger.error(f"Error getting tips for race {race_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
