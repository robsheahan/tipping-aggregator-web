"""Tests for scoring rules."""
import sys
sys.path.insert(0, '../api')

import pytest
from services.scoring import (
    brier_score,
    brier_score_multi,
    log_loss,
    log_loss_multi,
    mean_brier_score,
    mean_log_loss,
    calculate_time_weighted_score,
)


def test_brier_score():
    """Test Brier score calculation."""
    # Perfect prediction
    assert brier_score(1.0, 1) == 0.0
    assert brier_score(0.0, 0) == 0.0

    # Worst prediction
    assert brier_score(1.0, 0) == 1.0
    assert brier_score(0.0, 1) == 1.0

    # Moderate prediction
    assert abs(brier_score(0.7, 1) - 0.09) < 0.01
    assert abs(brier_score(0.3, 0) - 0.09) < 0.01


def test_brier_score_multi():
    """Test multi-class Brier score."""
    # Perfect prediction
    score = brier_score_multi({"home": 1.0, "away": 0.0}, "home")
    assert score == 0.0

    # Balanced prediction
    score = brier_score_multi({"home": 0.5, "away": 0.5}, "home")
    assert abs(score - 0.5) < 0.01

    # 3-way market
    score = brier_score_multi(
        {"home": 0.5, "draw": 0.3, "away": 0.2}, "home"
    )
    assert score < 1.0


def test_log_loss():
    """Test log loss calculation."""
    # Perfect prediction (clipped to avoid log(0))
    score = log_loss(0.9999, 1)
    assert score < 0.01

    # Moderate prediction
    score = log_loss(0.7, 1)
    assert score > 0


def test_log_loss_multi():
    """Test multi-class log loss."""
    # Perfect prediction
    score = log_loss_multi({"home": 1.0, "away": 0.0}, "home")
    assert score < 0.01

    # Moderate prediction
    score = log_loss_multi({"home": 0.7, "away": 0.3}, "home")
    assert score > 0


def test_mean_brier_score():
    """Test mean Brier score calculation."""
    predictions = [
        {"predicted_probs": 0.7, "actual_outcome": 1},
        {"predicted_probs": 0.8, "actual_outcome": 1},
        {"predicted_probs": 0.6, "actual_outcome": 0},
    ]

    mean_score = mean_brier_score(predictions)
    assert 0 < mean_score < 1


def test_mean_log_loss():
    """Test mean log loss calculation."""
    predictions = [
        {"predicted_probs": 0.7, "actual_outcome": 1},
        {"predicted_probs": 0.8, "actual_outcome": 1},
        {"predicted_probs": 0.3, "actual_outcome": 0},
    ]

    mean_score = mean_log_loss(predictions)
    assert mean_score > 0


def test_time_weighted_score():
    """Test time-weighted score calculation."""
    import time

    current_time = time.time()
    scores = [0.1, 0.2, 0.3]
    timestamps = [
        current_time - 86400 * 60,  # 60 days ago
        current_time - 86400 * 30,  # 30 days ago
        current_time - 86400 * 5,   # 5 days ago
    ]

    weighted = calculate_time_weighted_score(scores, timestamps, halflife_days=30)

    # Recent scores should have more weight
    assert weighted > 0.1  # More than oldest score
    assert weighted < 0.3  # Less than newest score alone


def test_scoring_edge_cases():
    """Test edge cases for scoring."""
    # Invalid probability
    with pytest.raises(ValueError):
        brier_score(1.5, 1)

    # Invalid outcome
    with pytest.raises(ValueError):
        brier_score(0.5, 2)

    # Empty predictions
    with pytest.raises(ValueError):
        mean_brier_score([])
