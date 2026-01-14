"""Tests for odds utilities."""
import sys
sys.path.insert(0, '../api')

import pytest
from services.odds_utils import (
    decimal_odds_to_implied_probability,
    american_odds_to_implied_probability,
    normalize_probabilities_2way,
    normalize_probabilities_3way,
    calculate_overround,
)


def test_decimal_odds_to_probability():
    """Test decimal odds conversion."""
    assert abs(decimal_odds_to_implied_probability(2.0) - 0.5) < 0.001
    assert abs(decimal_odds_to_implied_probability(3.0) - 0.333) < 0.001
    assert abs(decimal_odds_to_implied_probability(1.5) - 0.667) < 0.001

    with pytest.raises(ValueError):
        decimal_odds_to_implied_probability(0.5)


def test_american_odds_to_probability():
    """Test American odds conversion."""
    # Positive odds (underdog)
    assert abs(american_odds_to_implied_probability(100) - 0.5) < 0.001
    assert abs(american_odds_to_implied_probability(200) - 0.333) < 0.001

    # Negative odds (favorite)
    assert abs(american_odds_to_implied_probability(-100) - 0.5) < 0.001
    assert abs(american_odds_to_implied_probability(-200) - 0.667) < 0.001

    with pytest.raises(ValueError):
        american_odds_to_implied_probability(0)


def test_normalize_probabilities_2way():
    """Test 2-way probability normalization."""
    home, away = normalize_probabilities_2way(0.55, 0.50)
    assert abs(home - 0.524) < 0.001
    assert abs(away - 0.476) < 0.001
    assert abs(home + away - 1.0) < 0.001


def test_normalize_probabilities_3way():
    """Test 3-way probability normalization."""
    home, draw, away = normalize_probabilities_3way(0.40, 0.35, 0.30)
    assert abs(home + draw + away - 1.0) < 0.001
    assert home > draw > away  # Relative order preserved


def test_calculate_overround():
    """Test overround calculation."""
    # Perfect book (no margin)
    overround = calculate_overround({"home": 0.5, "away": 0.5})
    assert abs(overround) < 0.001

    # With margin
    overround = calculate_overround({"home": 0.52, "away": 0.52})
    assert abs(overround - 4.0) < 0.1


def test_normalization_edge_cases():
    """Test edge cases for normalization."""
    # Very unbalanced probabilities
    home, away = normalize_probabilities_2way(0.9, 0.2)
    assert abs(home + away - 1.0) < 0.001
    assert home > away

    # With negative values should raise error
    with pytest.raises(ValueError):
        normalize_probabilities_2way(-0.1, 0.5)
