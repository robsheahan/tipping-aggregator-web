"""Probability aggregation logic."""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from config import settings

logger = logging.getLogger(__name__)


def aggregate_probabilities_2way(
    snapshots: List[Dict], weights: Dict[int, float]
) -> Tuple[float, float]:
    """
    Aggregate 2-way market probabilities using weighted average.

    Args:
        snapshots: List of snapshot dicts with 'provider_id', 'home_prob', 'away_prob'
        weights: Dictionary mapping provider_id to weight

    Returns:
        Tuple of (aggregated_home_prob, aggregated_away_prob)
    """
    if not snapshots:
        raise ValueError("No snapshots provided for aggregation")

    weighted_home = 0.0
    weighted_away = 0.0
    total_weight = 0.0

    for snapshot in snapshots:
        provider_id = snapshot["provider_id"]
        weight = weights.get(provider_id, 0.0)

        if weight > 0:
            weighted_home += snapshot["home_prob"] * weight
            weighted_away += snapshot["away_prob"] * weight
            total_weight += weight

    if total_weight == 0:
        logger.warning("Total weight is zero, using equal weights")
        # Fallback to equal weights
        home_sum = sum(s["home_prob"] for s in snapshots)
        away_sum = sum(s["away_prob"] for s in snapshots)
        n = len(snapshots)
        return home_sum / n, away_sum / n

    # Normalize (should already sum to 1.0, but ensure it)
    home_prob = weighted_home / total_weight
    away_prob = weighted_away / total_weight

    # Renormalize to handle floating point errors
    total = home_prob + away_prob
    return home_prob / total, away_prob / total


def aggregate_probabilities_3way(
    snapshots: List[Dict], weights: Dict[int, float]
) -> Tuple[float, float, float]:
    """
    Aggregate 3-way market probabilities using weighted average.

    Args:
        snapshots: List of snapshot dicts with 'provider_id', 'home_prob', 'draw_prob', 'away_prob'
        weights: Dictionary mapping provider_id to weight

    Returns:
        Tuple of (aggregated_home_prob, aggregated_draw_prob, aggregated_away_prob)
    """
    if not snapshots:
        raise ValueError("No snapshots provided for aggregation")

    weighted_home = 0.0
    weighted_draw = 0.0
    weighted_away = 0.0
    total_weight = 0.0

    for snapshot in snapshots:
        provider_id = snapshot["provider_id"]
        weight = weights.get(provider_id, 0.0)

        if weight > 0:
            weighted_home += snapshot["home_prob"] * weight
            weighted_draw += snapshot.get("draw_prob", 0.0) * weight
            weighted_away += snapshot["away_prob"] * weight
            total_weight += weight

    if total_weight == 0:
        logger.warning("Total weight is zero, using equal weights")
        # Fallback to equal weights
        home_sum = sum(s["home_prob"] for s in snapshots)
        draw_sum = sum(s.get("draw_prob", 0.0) for s in snapshots)
        away_sum = sum(s["away_prob"] for s in snapshots)
        n = len(snapshots)
        return home_sum / n, draw_sum / n, away_sum / n

    # Normalize
    home_prob = weighted_home / total_weight
    draw_prob = weighted_draw / total_weight
    away_prob = weighted_away / total_weight

    # Renormalize to handle floating point errors
    total = home_prob + draw_prob + away_prob
    return home_prob / total, draw_prob / total, away_prob / total


def filter_fresh_snapshots(
    snapshots: List[Dict],
    reference_time: Optional[datetime] = None,
    freshness_minutes: Optional[int] = None,
) -> List[Dict]:
    """
    Filter snapshots to only include fresh ones.

    Args:
        snapshots: List of snapshot dicts with 'captured_at'
        reference_time: Reference time (default: now)
        freshness_minutes: Max age in minutes (default: from settings)

    Returns:
        Filtered list of snapshots
    """
    if reference_time is None:
        reference_time = datetime.utcnow()

    if freshness_minutes is None:
        freshness_minutes = settings.snapshot_freshness_minutes

    cutoff_time = reference_time - timedelta(minutes=freshness_minutes)

    fresh_snapshots = [
        s for s in snapshots if s["captured_at"] >= cutoff_time
    ]

    if len(fresh_snapshots) < len(snapshots):
        logger.info(
            f"Filtered {len(snapshots) - len(fresh_snapshots)} stale snapshots "
            f"(older than {freshness_minutes} minutes)"
        )

    return fresh_snapshots


def get_latest_snapshot_per_provider(snapshots: List[Dict]) -> List[Dict]:
    """
    Get the most recent snapshot for each provider.

    Args:
        snapshots: List of snapshot dicts with 'provider_id' and 'captured_at'

    Returns:
        List of latest snapshots per provider
    """
    provider_snapshots = {}

    for snapshot in snapshots:
        provider_id = snapshot["provider_id"]
        captured_at = snapshot["captured_at"]

        if provider_id not in provider_snapshots or captured_at > provider_snapshots[provider_id]["captured_at"]:
            provider_snapshots[provider_id] = snapshot

    return list(provider_snapshots.values())


def calculate_tip(
    home_prob: float, away_prob: float, draw_prob: Optional[float] = None
) -> Tuple[str, float]:
    """
    Calculate the tip (predicted winner) and confidence.

    Args:
        home_prob: Home win probability
        away_prob: Away win probability
        draw_prob: Draw probability (optional, for 3-way markets)

    Returns:
        Tuple of (tip, confidence) where tip is 'home', 'away', or 'draw'
    """
    if draw_prob is not None:
        # 3-way market
        max_prob = max(home_prob, draw_prob, away_prob)
        if home_prob == max_prob:
            return "home", home_prob
        elif draw_prob == max_prob:
            return "draw", draw_prob
        else:
            return "away", away_prob
    else:
        # 2-way market
        if home_prob > away_prob:
            return "home", home_prob
        else:
            return "away", away_prob


def aggregate_match_probabilities(
    snapshots: List[Dict],
    weights: Dict[int, float],
    market_type: str,
    reference_time: Optional[datetime] = None,
) -> Dict:
    """
    Aggregate probabilities for a match.

    Args:
        snapshots: List of snapshot dicts
        weights: Provider weights
        market_type: 'moneyline_2way' or 'moneyline_3way'
        reference_time: Reference time for freshness filtering

    Returns:
        Dictionary with aggregated probabilities and tip
    """
    # Filter to fresh snapshots
    fresh_snapshots = filter_fresh_snapshots(snapshots, reference_time)

    if not fresh_snapshots:
        logger.warning("No fresh snapshots available for aggregation")
        return {
            "home_prob": None,
            "away_prob": None,
            "draw_prob": None,
            "tip": None,
            "confidence": None,
            "contributing_providers": 0,
            "last_updated": None,
        }

    # Get latest snapshot per provider
    latest_snapshots = get_latest_snapshot_per_provider(fresh_snapshots)

    # Aggregate
    if market_type == "moneyline_3way":
        home_prob, draw_prob, away_prob = aggregate_probabilities_3way(latest_snapshots, weights)
        tip, confidence = calculate_tip(home_prob, away_prob, draw_prob)
    else:
        home_prob, away_prob = aggregate_probabilities_2way(latest_snapshots, weights)
        draw_prob = None
        tip, confidence = calculate_tip(home_prob, away_prob)

    # Get last updated time
    last_updated = max(s["captured_at"] for s in latest_snapshots)

    return {
        "home_prob": home_prob,
        "away_prob": away_prob,
        "draw_prob": draw_prob,
        "tip": tip,
        "confidence": confidence,
        "contributing_providers": len(latest_snapshots),
        "last_updated": last_updated,
    }
