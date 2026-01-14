"""Provider performance calculation tasks."""
from tasks.celery_app import celery_app
from database import SessionLocal
from models import (
    Provider,
    League,
    Match,
    MarketSnapshot,
    Result,
    ProviderPerformance,
    ProviderWeight,
    MarketType,
    MatchOutcome,
)
from services.scoring import brier_score_multi, log_loss_multi
from services.weighting import calculate_provider_weights
from datetime import datetime, timedelta
from config import settings
import logging
from sqlalchemy import and_

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.performance.update_all_provider_performance")
def update_all_provider_performance():
    """Update performance metrics for all providers."""
    db = SessionLocal()

    try:
        providers = db.query(Provider).filter(Provider.enabled == True).all()
        leagues = db.query(League).all()

        for provider in providers:
            for league in leagues:
                for market_type in [MarketType.MONEYLINE_2WAY, MarketType.MONEYLINE_3WAY]:
                    try:
                        update_provider_performance(db, provider.id, league.id, market_type)
                    except Exception as e:
                        logger.error(
                            f"Error updating performance for provider {provider.id}, "
                            f"league {league.id}: {e}"
                        )
                        continue

        db.commit()
        logger.info("Finished updating provider performance")

    except Exception as e:
        logger.error(f"Error in update_all_provider_performance: {e}")
        db.rollback()
    finally:
        db.close()


def update_provider_performance(
    db, provider_id: int, league_id: int, market_type: MarketType
):
    """
    Update performance metrics for a specific provider/league/market.

    Args:
        db: Database session
        provider_id: Provider ID
        league_id: League ID
        market_type: Market type
    """
    # Define window (last N days)
    window_end = datetime.utcnow()
    window_start = window_end - timedelta(days=settings.performance_window_days)

    # Get matches with results in this window
    matches_with_results = (
        db.query(Match, Result)
        .join(Result, Match.id == Result.match_id)
        .filter(
            Match.league_id == league_id,
            Result.finalised_at >= window_start,
            Result.finalised_at <= window_end,
        )
        .all()
    )

    if not matches_with_results:
        logger.debug(
            f"No matches with results for provider {provider_id}, league {league_id}"
        )
        return

    predictions = []

    for match, result in matches_with_results:
        # Get the last snapshot before kickoff for this provider
        snapshot = (
            db.query(MarketSnapshot)
            .filter(
                and_(
                    MarketSnapshot.match_id == match.id,
                    MarketSnapshot.provider_id == provider_id,
                    MarketSnapshot.market_type == market_type,
                    MarketSnapshot.captured_at <= match.kickoff_time,
                )
            )
            .order_by(MarketSnapshot.captured_at.desc())
            .first()
        )

        if not snapshot:
            continue

        # Convert outcome to probabilities dict
        predicted_probs = {
            "home": snapshot.home_prob,
            "away": snapshot.away_prob,
        }

        if market_type == MarketType.MONEYLINE_3WAY and snapshot.draw_prob:
            predicted_probs["draw"] = snapshot.draw_prob

        # Convert result outcome to string
        if result.outcome == MatchOutcome.HOME_WIN:
            actual_outcome = "home"
        elif result.outcome == MatchOutcome.AWAY_WIN:
            actual_outcome = "away"
        else:
            actual_outcome = "draw"

        predictions.append(
            {
                "predicted_probs": predicted_probs,
                "actual_outcome": actual_outcome,
                "timestamp": result.finalised_at.timestamp(),
            }
        )

    if not predictions:
        logger.debug(
            f"No predictions found for provider {provider_id}, league {league_id}"
        )
        return

    # Calculate scores
    brier_scores = []
    log_losses = []

    for pred in predictions:
        try:
            brier = brier_score_multi(pred["predicted_probs"], pred["actual_outcome"])
            logloss = log_loss_multi(pred["predicted_probs"], pred["actual_outcome"])
            brier_scores.append(brier)
            log_losses.append(logloss)
        except Exception as e:
            logger.error(f"Error calculating score: {e}")
            continue

    if not brier_scores:
        return

    # Calculate time-weighted averages
    from services.scoring import calculate_time_weighted_score

    timestamps = [p["timestamp"] for p in predictions]

    avg_brier = calculate_time_weighted_score(
        brier_scores, timestamps, halflife_days=settings.time_decay_halflife_days
    )
    avg_logloss = calculate_time_weighted_score(
        log_losses, timestamps, halflife_days=settings.time_decay_halflife_days
    )

    # Save or update performance record
    existing_perf = (
        db.query(ProviderPerformance)
        .filter(
            and_(
                ProviderPerformance.provider_id == provider_id,
                ProviderPerformance.league_id == league_id,
                ProviderPerformance.market_type == market_type,
            )
        )
        .order_by(ProviderPerformance.window_end.desc())
        .first()
    )

    if existing_perf and existing_perf.window_end >= window_end - timedelta(hours=12):
        # Update existing record (if recent)
        existing_perf.brier_score = avg_brier
        existing_perf.log_loss = avg_logloss
        existing_perf.sample_size = len(predictions)
        existing_perf.window_start = window_start
        existing_perf.window_end = window_end
        existing_perf.computed_at = datetime.utcnow()
        logger.info(
            f"Updated performance for provider {provider_id}, league {league_id}: "
            f"Brier={avg_brier:.4f}, samples={len(predictions)}"
        )
    else:
        # Create new record
        new_perf = ProviderPerformance(
            provider_id=provider_id,
            league_id=league_id,
            market_type=market_type,
            window_start=window_start,
            window_end=window_end,
            brier_score=avg_brier,
            log_loss=avg_logloss,
            sample_size=len(predictions),
            computed_at=datetime.utcnow(),
        )
        db.add(new_perf)
        logger.info(
            f"Created performance record for provider {provider_id}, league {league_id}: "
            f"Brier={avg_brier:.4f}, samples={len(predictions)}"
        )

    db.flush()


@celery_app.task(name="tasks.performance.update_all_provider_weights")
def update_all_provider_weights():
    """Update weights for all providers based on performance."""
    db = SessionLocal()

    try:
        leagues = db.query(League).all()

        for league in leagues:
            for market_type in [MarketType.MONEYLINE_2WAY, MarketType.MONEYLINE_3WAY]:
                try:
                    update_league_weights(db, league.id, market_type)
                except Exception as e:
                    logger.error(f"Error updating weights for league {league.id}: {e}")
                    continue

        db.commit()
        logger.info("Finished updating provider weights")

    except Exception as e:
        logger.error(f"Error in update_all_provider_weights: {e}")
        db.rollback()
    finally:
        db.close()


def update_league_weights(db, league_id: int, market_type: MarketType):
    """
    Update provider weights for a specific league/market.

    Args:
        db: Database session
        league_id: League ID
        market_type: Market type
    """
    # Get recent performance for all providers
    performances = (
        db.query(ProviderPerformance)
        .filter(
            and_(
                ProviderPerformance.league_id == league_id,
                ProviderPerformance.market_type == market_type,
            )
        )
        .all()
    )

    if not performances:
        logger.debug(f"No performance data for league {league_id}, market {market_type}")
        return

    # Calculate weights
    perf_data = [
        {
            "provider_id": p.provider_id,
            "brier_score": p.brier_score,
            "sample_size": p.sample_size,
        }
        for p in performances
    ]

    weights = calculate_provider_weights(perf_data, method="softmax", temperature=1.0)

    # Save weights
    for provider_id, weight in weights.items():
        existing_weight = (
            db.query(ProviderWeight)
            .filter(
                and_(
                    ProviderWeight.provider_id == provider_id,
                    ProviderWeight.league_id == league_id,
                    ProviderWeight.market_type == market_type,
                )
            )
            .first()
        )

        if existing_weight:
            existing_weight.weight = weight
            existing_weight.updated_at = datetime.utcnow()
        else:
            new_weight = ProviderWeight(
                provider_id=provider_id,
                league_id=league_id,
                market_type=market_type,
                weight=weight,
                updated_at=datetime.utcnow(),
            )
            db.add(new_weight)

        logger.info(
            f"Updated weight for provider {provider_id}, league {league_id}: {weight:.4f}"
        )

    db.flush()
