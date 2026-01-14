"""Utilities for odds conversion and normalization."""
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


def decimal_odds_to_implied_probability(odds: float) -> float:
    """
    Convert decimal odds to implied probability.

    Args:
        odds: Decimal odds (e.g., 2.5)

    Returns:
        Implied probability (0.0 to 1.0)
    """
    if odds <= 1.0:
        raise ValueError(f"Decimal odds must be > 1.0, got {odds}")
    return 1.0 / odds


def american_odds_to_implied_probability(odds: int) -> float:
    """
    Convert American odds to implied probability.

    Args:
        odds: American odds (e.g., +150 or -200)

    Returns:
        Implied probability (0.0 to 1.0)
    """
    if odds > 0:
        return 100.0 / (odds + 100.0)
    elif odds < 0:
        return (-odds) / (-odds + 100.0)
    else:
        raise ValueError("American odds cannot be 0")


def normalize_probabilities_2way(home: float, away: float) -> Tuple[float, float]:
    """
    Normalize 2-way market probabilities to remove overround/vig.

    Args:
        home: Home team implied probability
        away: Away team implied probability

    Returns:
        Tuple of (normalized_home, normalized_away)
    """
    total = home + away
    if total <= 0:
        raise ValueError(f"Total probability must be > 0, got {total}")

    return home / total, away / total


def normalize_probabilities_3way(
    home: float, draw: float, away: float
) -> Tuple[float, float, float]:
    """
    Normalize 3-way market probabilities to remove overround/vig.

    Args:
        home: Home team implied probability
        draw: Draw implied probability
        away: Away team implied probability

    Returns:
        Tuple of (normalized_home, normalized_draw, normalized_away)
    """
    total = home + draw + away
    if total <= 0:
        raise ValueError(f"Total probability must be > 0, got {total}")

    return home / total, draw / total, away / total


def convert_odds_to_probabilities(
    odds_data: Dict[str, float], market_type: str = "decimal"
) -> Dict[str, float]:
    """
    Convert odds to implied probabilities.

    Args:
        odds_data: Dictionary with keys like 'home', 'away', 'draw' and odds values
        market_type: Type of odds - 'decimal' or 'american'

    Returns:
        Dictionary with same keys but probability values
    """
    converter = (
        decimal_odds_to_implied_probability
        if market_type == "decimal"
        else american_odds_to_implied_probability
    )

    probabilities = {}
    for key, odds_value in odds_data.items():
        try:
            probabilities[key] = converter(odds_value)
        except Exception as e:
            logger.error(f"Error converting odds {odds_value} for {key}: {e}")
            raise

    return probabilities


def normalize_market_probabilities(
    probabilities: Dict[str, float]
) -> Dict[str, float]:
    """
    Normalize market probabilities based on number of outcomes.

    Args:
        probabilities: Dictionary with 'home', 'away', and optionally 'draw'

    Returns:
        Normalized probabilities dictionary
    """
    has_draw = "draw" in probabilities

    if has_draw:
        home, draw, away = normalize_probabilities_3way(
            probabilities["home"], probabilities["draw"], probabilities["away"]
        )
        return {"home": home, "draw": draw, "away": away}
    else:
        home, away = normalize_probabilities_2way(
            probabilities["home"], probabilities["away"]
        )
        return {"home": home, "away": away}


def calculate_overround(probabilities: Dict[str, float]) -> float:
    """
    Calculate the overround (bookmaker margin) from probabilities.

    Args:
        probabilities: Dictionary of probabilities

    Returns:
        Overround as percentage (e.g., 5.0 for 5%)
    """
    total = sum(probabilities.values())
    return (total - 1.0) * 100.0
