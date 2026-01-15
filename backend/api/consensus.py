"""
FastAPI Router: Consensus

Endpoints for AI consensus scores and verdicts
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

from utils.database import SupabaseClient

router = APIRouter()

@router.get("/{race_id}")
async def get_race_consensus(race_id: str):
    """
    Get consensus scores for all runners in a race
    """
    try:
        db = SupabaseClient()

        result = db.client.table("consensus_scores") \
            .select("*") \
            .eq("race_id", race_id) \
            .order("consensus_score", desc=True) \
            .execute()

        consensus_scores = result.data

        return {
            "success": True,
            "race_id": race_id,
            "count": len(consensus_scores),
            "consensus": consensus_scores
        }

    except Exception as e:
        logger.error(f"Error getting consensus for race {race_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{race_id}/runner/{runner_number}")
async def get_runner_consensus(race_id: str, runner_number: int):
    """
    Get detailed consensus for a specific runner
    """
    try:
        db = SupabaseClient()

        # Get consensus score
        consensus_result = db.client.table("consensus_scores") \
            .select("*") \
            .eq("race_id", race_id) \
            .eq("runner_number", runner_number) \
            .single() \
            .execute()

        if not consensus_result.data:
            raise HTTPException(status_code=404, detail="Consensus not found")

        consensus = consensus_result.data

        # Get all tips for this runner
        tips_result = db.client.table("expert_tips") \
            .select("*") \
            .eq("race_id", race_id) \
            .eq("runner_number", runner_number) \
            .execute()

        consensus["expert_tips"] = tips_result.data

        return {
            "success": True,
            "consensus": consensus
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting runner consensus: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top/{limit}")
async def get_top_consensus(limit: int = 10):
    """
    Get top consensus picks across all today's races
    """
    try:
        db = SupabaseClient()

        # Get today's races
        races_result = db.client.table("races") \
            .select("id") \
            .eq("status", "upcoming") \
            .gte("start_time", "today") \
            .execute()

        race_ids = [r["id"] for r in races_result.data]

        if not race_ids:
            return {
                "success": True,
                "count": 0,
                "top_picks": []
            }

        # Get consensus scores for these races
        consensus_result = db.client.table("consensus_scores") \
            .select("*") \
            .in_("race_id", race_ids) \
            .order("consensus_score", desc=True) \
            .limit(limit) \
            .execute()

        return {
            "success": True,
            "count": len(consensus_result.data),
            "top_picks": consensus_result.data
        }

    except Exception as e:
        logger.error(f"Error getting top consensus: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
