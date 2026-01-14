"""Results ingestion tasks."""
from tasks.celery_app import celery_app
from database import SessionLocal
from models import Match, MatchStatus, Result, MatchOutcome
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.results.ingest_finished_match_results")
def ingest_finished_match_results():
    """
    Ingest results for matches that should have finished.

    Note: This is a placeholder implementation. In production, you would:
    1. Use a sports data API (TheOddsAPI, SportsDataIO, etc.) to get scores
    2. Poll for matches that finished in the last 6 hours
    3. Update match status and create Result records
    """
    db = SessionLocal()

    try:
        # Find matches that should have finished (kickoff > 3 hours ago)
        cutoff_time = datetime.utcnow() - timedelta(hours=3)
        recent_cutoff = datetime.utcnow() - timedelta(hours=6)

        matches = (
            db.query(Match)
            .filter(
                Match.kickoff_time >= recent_cutoff,
                Match.kickoff_time <= cutoff_time,
                Match.status == MatchStatus.SCHEDULED,
            )
            .all()
        )

        logger.info(f"Checking {len(matches)} matches for results")

        for match in matches:
            try:
                # TODO: Fetch actual score from API
                # For now, just mark as finished without creating Result
                # In production, implement proper result fetching

                # result_data = fetch_match_result(match)
                # if result_data:
                #     save_match_result(db, match, result_data)

                logger.info(
                    f"Match {match.id} needs result ingestion (not implemented)"
                )

            except Exception as e:
                logger.error(f"Error processing match {match.id}: {e}")
                continue

        db.commit()

    except Exception as e:
        logger.error(f"Error in ingest_finished_match_results: {e}")
        db.rollback()
    finally:
        db.close()


def save_match_result(db, match: Match, home_score: int, away_score: int):
    """
    Save match result to database.

    Args:
        db: Database session
        match: Match object
        home_score: Home team score
        away_score: Away team score
    """
    # Determine outcome
    if home_score > away_score:
        outcome = MatchOutcome.HOME_WIN
    elif away_score > home_score:
        outcome = MatchOutcome.AWAY_WIN
    else:
        outcome = MatchOutcome.DRAW

    # Check if result already exists
    existing_result = db.query(Result).filter(Result.match_id == match.id).first()

    if existing_result:
        # Update existing result
        existing_result.home_score = home_score
        existing_result.away_score = away_score
        existing_result.outcome = outcome
        existing_result.finalised_at = datetime.utcnow()
        logger.info(f"Updated result for match {match.id}: {home_score}-{away_score}")
    else:
        # Create new result
        result = Result(
            match_id=match.id,
            home_score=home_score,
            away_score=away_score,
            outcome=outcome,
            finalised_at=datetime.utcnow(),
        )
        db.add(result)
        logger.info(f"Created result for match {match.id}: {home_score}-{away_score}")

    # Update match status
    match.status = MatchStatus.FINISHED


# Placeholder for future implementation
"""
async def fetch_match_result(match: Match) -> dict:
    '''
    Fetch match result from external API.

    Example using TheOddsAPI (if they provide scores):
    '''
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.the-odds-api.com/v4/sports/{sport_key}/scores",
                params={
                    "apiKey": settings.theoddsapi_key,
                    "daysFrom": 1,
                }
            )
            response.raise_for_status()
            scores = response.json()

            # Find matching event
            for event in scores:
                if event["id"] == match.external_ids.get("theoddsapi"):
                    if event.get("completed"):
                        return {
                            "home_score": event["scores"][0]["score"],
                            "away_score": event["scores"][1]["score"],
                        }

        return None

    except Exception as e:
        logger.error(f"Error fetching result: {e}")
        return None
"""
