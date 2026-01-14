"""Tests for probability aggregation."""
import sys
sys.path.insert(0, '../api')

import pytest
from datetime import datetime, timedelta
from services.aggregation import (
    aggregate_probabilities_2way,
    aggregate_probabilities_3way,
    filter_fresh_snapshots,
    get_latest_snapshot_per_provider,
    calculate_tip,
)


def test_aggregate_probabilities_2way():
    """Test 2-way aggregation."""
    snapshots = [
        {"provider_id": 1, "home_prob": 0.6, "away_prob": 0.4},
        {"provider_id": 2, "home_prob": 0.7, "away_prob": 0.3},
    ]
    weights = {1: 0.5, 2: 0.5}

    home, away = aggregate_probabilities_2way(snapshots, weights)

    # Check result is weighted average
    expected_home = (0.6 * 0.5 + 0.7 * 0.5)
    assert abs(home - expected_home) < 0.01

    # Check probabilities sum to 1
    assert abs(home + away - 1.0) < 0.001


def test_aggregate_probabilities_3way():
    """Test 3-way aggregation."""
    snapshots = [
        {"provider_id": 1, "home_prob": 0.5, "draw_prob": 0.3, "away_prob": 0.2},
        {"provider_id": 2, "home_prob": 0.6, "draw_prob": 0.2, "away_prob": 0.2},
    ]
    weights = {1: 0.5, 2: 0.5}

    home, draw, away = aggregate_probabilities_3way(snapshots, weights)

    # Check probabilities sum to 1
    assert abs(home + draw + away - 1.0) < 0.001

    # Check home is highest
    assert home > draw and home > away


def test_filter_fresh_snapshots():
    """Test freshness filtering."""
    now = datetime.utcnow()
    snapshots = [
        {"captured_at": now - timedelta(minutes=5)},
        {"captured_at": now - timedelta(minutes=45)},
        {"captured_at": now - timedelta(hours=2)},
    ]

    fresh = filter_fresh_snapshots(snapshots, now, freshness_minutes=30)

    # Should only include first snapshot
    assert len(fresh) == 1
    assert fresh[0]["captured_at"] == snapshots[0]["captured_at"]


def test_get_latest_snapshot_per_provider():
    """Test getting latest snapshot per provider."""
    now = datetime.utcnow()
    snapshots = [
        {"provider_id": 1, "captured_at": now - timedelta(minutes=10)},
        {"provider_id": 1, "captured_at": now - timedelta(minutes=5)},
        {"provider_id": 2, "captured_at": now - timedelta(minutes=15)},
    ]

    latest = get_latest_snapshot_per_provider(snapshots)

    # Should have 2 snapshots (one per provider)
    assert len(latest) == 2

    # Provider 1 should have the more recent snapshot
    provider_1_snapshot = next(s for s in latest if s["provider_id"] == 1)
    assert provider_1_snapshot["captured_at"] == snapshots[1]["captured_at"]


def test_calculate_tip():
    """Test tip calculation."""
    # 2-way market - home favored
    tip, confidence = calculate_tip(0.65, 0.35)
    assert tip == "home"
    assert confidence == 0.65

    # 2-way market - away favored
    tip, confidence = calculate_tip(0.40, 0.60)
    assert tip == "away"
    assert confidence == 0.60

    # 3-way market - draw favored
    tip, confidence = calculate_tip(0.30, 0.35, 0.35)
    assert tip in ["draw", "away"]  # Either could be picked due to tie


def test_aggregation_edge_cases():
    """Test edge cases."""
    # Empty snapshots
    with pytest.raises(ValueError):
        aggregate_probabilities_2way([], {1: 0.5})

    # Mismatched weights (provider not in weights dict)
    snapshots = [{"provider_id": 1, "home_prob": 0.6, "away_prob": 0.4}]
    weights = {2: 1.0}  # Different provider

    # Should fallback to equal weights
    home, away = aggregate_probabilities_2way(snapshots, weights)
    assert abs(home - 0.6) < 0.01


def test_weighted_aggregation():
    """Test that weights properly affect aggregation."""
    snapshots = [
        {"provider_id": 1, "home_prob": 0.8, "away_prob": 0.2},
        {"provider_id": 2, "home_prob": 0.4, "away_prob": 0.6},
    ]

    # Equal weights - should average
    weights_equal = {1: 0.5, 2: 0.5}
    home_equal, _ = aggregate_probabilities_2way(snapshots, weights_equal)
    assert abs(home_equal - 0.6) < 0.01  # (0.8 + 0.4) / 2

    # Provider 1 has higher weight
    weights_skewed = {1: 0.8, 2: 0.2}
    home_skewed, _ = aggregate_probabilities_2way(snapshots, weights_skewed)
    assert home_skewed > home_equal  # Should be closer to provider 1's prediction
