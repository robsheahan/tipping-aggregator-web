"""
FastAPI Router: Affiliates

Handles affiliate link generation and click tracking
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from typing import Optional
from loguru import logger
import os

from utils.database import SupabaseClient

router = APIRouter()

# Affiliate configuration
AFFILIATE_CONFIG = {
    "sportsbet": {
        "name": "Sportsbet",
        "base_url": "https://www.sportsbet.com.au",
        "deep_link_pattern": "/racing/{venue}/{race_id}?runner={runner}&aff={affiliate_id}",
        "affiliate_id": os.getenv("SPORTSBET_AFFILIATE_ID", ""),
    },
    "ladbrokes": {
        "name": "Ladbrokes",
        "base_url": "https://www.ladbrokes.com.au",
        "deep_link_pattern": "/racing/{venue}/{race_id}/runner/{runner}?affiliate={affiliate_id}",
        "affiliate_id": os.getenv("LADBROKES_AFFILIATE_ID", ""),
    },
    "neds": {
        "name": "Neds",
        "base_url": "https://www.neds.com.au",
        "deep_link_pattern": "/racing/{venue}/{race_id}?runner={runner}&aff={affiliate_id}",
        "affiliate_id": os.getenv("NEDS_AFFILIATE_ID", ""),
    },
    "tab": {
        "name": "TAB",
        "base_url": "https://www.tab.com.au",
        "deep_link_pattern": "/racing/{venue}/{race_id}?runner={runner}",
        "affiliate_id": os.getenv("TAB_AFFILIATE_ID", ""),
    }
}

async def generate_affiliate_redirect(
    bookmaker: str,
    race_id: str,
    runner_number: int
) -> str:
    """
    Generate affiliate deep link for a bookmaker

    Args:
        bookmaker: Bookmaker key (e.g., "sportsbet")
        race_id: Race ID (meet_id-race_number format)
        runner_number: Runner number

    Returns:
        Full affiliate URL
    """
    bookmaker = bookmaker.lower()

    if bookmaker not in AFFILIATE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unknown bookmaker: {bookmaker}")

    config = AFFILIATE_CONFIG[bookmaker]

    # Parse race ID to get venue and race number
    try:
        meet_id, race_num = race_id.split("-")
    except:
        raise HTTPException(status_code=400, detail="Invalid race_id format")

    # Get race details to find venue
    db = SupabaseClient()
    result = db.client.table("races") \
        .select("venue") \
        .eq("id", race_id) \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Race not found")

    venue = result.data["venue"].lower().replace(" ", "-")

    # Build deep link
    deep_link = config["deep_link_pattern"].format(
        venue=venue,
        race_id=race_num,
        runner=runner_number,
        affiliate_id=config["affiliate_id"]
    )

    full_url = config["base_url"] + deep_link

    return full_url

@router.get("/link/{bookmaker}")
async def get_affiliate_link(
    bookmaker: str,
    race_id: str,
    runner: int,
    request: Request
):
    """
    Get affiliate link (without redirect)

    Example: /api/affiliates/link/sportsbet?race_id=123&runner=5
    """
    try:
        url = await generate_affiliate_redirect(bookmaker, race_id, runner)

        # Track click (optional - don't fail if tracking fails)
        try:
            db = SupabaseClient()
            await db.track_affiliate_click(
                bookmaker=bookmaker,
                race_id=race_id,
                runner_number=runner,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
        except Exception as e:
            logger.warning(f"Failed to track click: {e}")

        return {
            "success": True,
            "bookmaker": bookmaker,
            "race_id": race_id,
            "runner": runner,
            "url": url
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating affiliate link: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_affiliate_stats():
    """
    Get affiliate click statistics
    """
    try:
        db = SupabaseClient()

        # Total clicks
        total_result = db.client.table("affiliate_clicks") \
            .select("id", count="exact") \
            .execute()

        total_clicks = total_result.count or 0

        # Clicks by bookmaker
        bookmaker_result = db.client.table("affiliate_clicks") \
            .select("bookmaker") \
            .execute()

        clicks_by_bookmaker = {}
        for row in bookmaker_result.data:
            bm = row["bookmaker"]
            clicks_by_bookmaker[bm] = clicks_by_bookmaker.get(bm, 0) + 1

        # Recent clicks
        recent_result = db.client.table("affiliate_clicks") \
            .select("*") \
            .order("clicked_at", desc=True) \
            .limit(100) \
            .execute()

        return {
            "success": True,
            "total_clicks": total_clicks,
            "clicks_by_bookmaker": clicks_by_bookmaker,
            "recent_clicks": recent_result.data
        }

    except Exception as e:
        logger.error(f"Error getting affiliate stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
