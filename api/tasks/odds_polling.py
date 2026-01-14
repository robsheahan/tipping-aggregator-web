"""Odds polling tasks."""
from tasks.celery_app import celery_app
from database import SessionLocal
from models import Match, MatchStatus, MarketSnapshot, Provider, MarketType
from providers.theoddsapi import TheOddsAPIProvider
from datetime import datetime, timedelta
from config import settings
import logging
import asyncio

logger = logging.getLogger(__name__)


def calculate_polling_interval(minutes_to_kickoff: float) -> float:
    """
    Calculate polling interval based on time to kickoff.

    Args:
        minutes_to_kickoff: Minutes until match starts

    Returns:
        Seconds to wait until next poll
    """
    if minutes_to_kickoff <= settings.polling_final_threshold:
        # Final period (last 30 min): poll every 1 minute
        return settings.polling_final_interval
    elif minutes_to_kickoff <= settings.polling_near_kickoff_threshold:
        # Near kickoff (last 2 hours): poll every 5 minutes
        return settings.polling_near_interval
    else:
        # Default: poll every 15 minutes
        return settings.polling_default_interval


@celery_app.task(name="tasks.odds_polling.poll_upcoming_matches")
def poll_upcoming_matches():
    """Poll odds for upcoming matches with dynamic frequency."""
    db = SessionLocal()

    try:
        # Get matches in next 48 hours that are scheduled
        now = datetime.utcnow()
        window_end = now + timedelta(hours=48)

        matches = (
            db.query(Match)
            .filter(
                Match.kickoff_time >= now,
                Match.kickoff_time <= window_end,
                Match.status == MatchStatus.SCHEDULED,
            )
            .all()
        )

        logger.info(f"Polling odds for {len(matches)} upcoming matches")

        # Get enabled providers
        providers_query = db.query(Provider).filter(Provider.enabled == True)
        enabled_providers = providers_query.all()

        provider_instances = {
            "TheOddsAPI": TheOddsAPIProvider(),
        }

        for match in matches:
            minutes_to_kickoff = (match.kickoff_time - now).total_seconds() / 60

            # Skip if kickoff has passed
            if minutes_to_kickoff < 0:
                continue

            # Determine if we should poll this match based on interval
            interval_seconds = calculate_polling_interval(minutes_to_kickoff)

            # Check if we polled recently
            if should_skip_poll(db, match.id, interval_seconds):
                continue

            logger.info(
                f"Polling odds for match {match.id} "
                f"(kickoff in {minutes_to_kickoff:.0f} minutes)"
            )

            # Poll each provider
            for provider_name, provider_instance in provider_instances.items():
                try:
                    # Get external ID for this provider
                    external_id = match.external_ids.get(provider_name.lower())
                    if not external_id:
                        continue

                    # Get provider from DB
                    provider = db.query(Provider).filter(Provider.name == provider_name).first()
                    if not provider or not provider.enabled:
                        continue

                    # Fetch odds
                    snapshot_data = asyncio.run(
                        provider_instance.fetch_odds(external_id, match.league.sport)
                    )

                    if snapshot_data:
                        # Save snapshot
                        save_snapshot(db, match.id, provider.id, snapshot_data)

                except Exception as e:
                    logger.error(
                        f"Error polling {provider_name} for match {match.id}: {e}"
                    )
                    continue

        db.commit()
        logger.info("Finished polling odds")

    except Exception as e:
        logger.error(f"Error in poll_upcoming_matches: {e}")
        db.rollback()
    finally:
        db.close()


def should_skip_poll(db, match_id: int, interval_seconds: float) -> bool:
    """
    Check if we should skip polling based on last poll time.

    Args:
        db: Database session
        match_id: Match ID
        interval_seconds: Required interval in seconds

    Returns:
        True if should skip, False otherwise
    """
    latest_snapshot = (
        db.query(MarketSnapshot)
        .filter(MarketSnapshot.match_id == match_id)
        .order_by(MarketSnapshot.captured_at.desc())
        .first()
    )

    if not latest_snapshot:
        return False  # Never polled, don't skip

    time_since_last = (datetime.utcnow() - latest_snapshot.captured_at).total_seconds()

    return time_since_last < interval_seconds


def save_snapshot(db, match_id: int, provider_id: int, snapshot_data):
    """Save market snapshot to database."""
    market_type = MarketType(snapshot_data.market_type)

    snapshot = MarketSnapshot(
        match_id=match_id,
        provider_id=provider_id,
        market_type=market_type,
        captured_at=snapshot_data.captured_at,
        home_prob=snapshot_data.home_prob,
        away_prob=snapshot_data.away_prob,
        draw_prob=snapshot_data.draw_prob,
        raw_odds=snapshot_data.raw_odds,
    )

    db.add(snapshot)
    logger.debug(f"Saved snapshot for match {match_id}, provider {provider_id}")


@celery_app.task(name="tasks.odds_polling.poll_specific_match")
def poll_specific_match(match_id: int):
    """Poll odds for a specific match (on-demand)."""
    db = SessionLocal()

    try:
        match = db.query(Match).filter(Match.id == match_id).first()

        if not match:
            logger.error(f"Match {match_id} not found")
            return

        logger.info(f"On-demand polling for match {match_id}")

        provider_instances = {
            "TheOddsAPI": TheOddsAPIProvider(),
        }

        for provider_name, provider_instance in provider_instances.items():
            try:
                external_id = match.external_ids.get(provider_name.lower())
                if not external_id:
                    continue

                provider = db.query(Provider).filter(Provider.name == provider_name).first()
                if not provider or not provider.enabled:
                    continue

                snapshot_data = asyncio.run(
                    provider_instance.fetch_odds(external_id, match.league.sport)
                )

                if snapshot_data:
                    save_snapshot(db, match.id, provider.id, snapshot_data)

            except Exception as e:
                logger.error(f"Error polling {provider_name}: {e}")
                continue

        db.commit()

    except Exception as e:
        logger.error(f"Error in poll_specific_match: {e}")
        db.rollback()
    finally:
        db.close()
