"""Tests for weighting algorithms."""
import sys
sys.path.insert(0, '../api')

import pytest
from services.weighting import (
    softmax_weights,
    inverse_score_weights,
    apply_weight_constraints,
    calculate_provider_weights,
    equal_weights,
)


def test_softmax_weights():
    """Test softmax weighting."""
    brier_scores = {1: 0.1, 2: 0.2, 3: 0.15}
    weights = softmax_weights(brier_scores, temperature=1.0)

    # Check weights sum to 1
    assert abs(sum(weights.values()) - 1.0) < 0.001

    # Check best performer has highest weight
    assert weights[1] > weights[2]
    assert weights[1] > weights[3]


def test_inverse_score_weights():
    """Test inverse score weighting."""
    brier_scores = {1: 0.1, 2: 0.2, 3: 0.15}
    weights = inverse_score_weights(brier_scores)

    # Check weights sum to 1
    assert abs(sum(weights.values()) - 1.0) < 0.001

    # Check best performer has highest weight
    assert weights[1] > weights[2]
    assert weights[1] > weights[3]


def test_apply_weight_constraints():
    """Test weight constraints."""
    weights = {1: 0.8, 2: 0.1, 3: 0.1}
    sample_sizes = {1: 100, 2: 50, 3: 5}

    constrained = apply_weight_constraints(
        weights,
        sample_sizes,
        min_samples=10,
        weight_floor=0.05,
        weight_ceiling=0.50,
    )

    # Check ceiling applied
    assert constrained[1] <= 0.50

    # Check floor applied
    assert all(w >= 0.05 for w in constrained.values())

    # Check sample size constraint
    # Provider 3 has only 5 samples, should be reduced
    assert constrained[3] < weights[3]

    # Check weights still sum to 1
    assert abs(sum(constrained.values()) - 1.0) < 0.001


def test_calculate_provider_weights():
    """Test full weight calculation."""
    performances = [
        {"provider_id": 1, "brier_score": 0.15, "sample_size": 100},
        {"provider_id": 2, "brier_score": 0.20, "sample_size": 80},
        {"provider_id": 3, "brier_score": 0.18, "sample_size": 50},
    ]

    weights = calculate_provider_weights(performances, method="softmax")

    # Check weights sum to ~1
    assert abs(sum(weights.values()) - 1.0) < 0.01

    # Check best performer has highest weight
    assert weights[1] > weights[2]


def test_equal_weights():
    """Test equal weights."""
    provider_ids = [1, 2, 3, 4]
    weights = equal_weights(provider_ids)

    # Check all weights equal
    assert all(abs(w - 0.25) < 0.001 for w in weights.values())

    # Check sum to 1
    assert abs(sum(weights.values()) - 1.0) < 0.001


def test_weighting_edge_cases():
    """Test edge cases."""
    # Empty input
    weights = softmax_weights({})
    assert weights == {}

    # Single provider
    weights = softmax_weights({1: 0.1})
    assert abs(weights[1] - 1.0) < 0.001

    # Very different scores
    weights = softmax_weights({1: 0.01, 2: 0.99})
    assert weights[1] > 0.5  # Better performer gets more weight
