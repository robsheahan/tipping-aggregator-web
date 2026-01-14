"""Provider weighting algorithms."""
import numpy as np
from typing import Dict, List
import logging
from config import settings

logger = logging.getLogger(__name__)


def softmax_weights(brier_scores: Dict[int, float], temperature: float = 1.0) -> Dict[int, float]:
    """
    Calculate provider weights using softmax on negative Brier scores.

    Args:
        brier_scores: Dictionary mapping provider_id to Brier score
        temperature: Temperature parameter for softmax (higher = more uniform)

    Returns:
        Dictionary mapping provider_id to weight
    """
    if not brier_scores:
        return {}

    provider_ids = list(brier_scores.keys())
    scores = np.array([brier_scores[pid] for pid in provider_ids])

    # Use negative scores (lower Brier is better)
    neg_scores = -scores / temperature

    # Softmax
    exp_scores = np.exp(neg_scores - np.max(neg_scores))  # Subtract max for numerical stability
    weights = exp_scores / exp_scores.sum()

    return {pid: float(w) for pid, w in zip(provider_ids, weights)}


def inverse_score_weights(brier_scores: Dict[int, float]) -> Dict[int, float]:
    """
    Calculate provider weights using inverse Brier scores.

    Args:
        brier_scores: Dictionary mapping provider_id to Brier score

    Returns:
        Dictionary mapping provider_id to weight
    """
    if not brier_scores:
        return {}

    provider_ids = list(brier_scores.keys())
    scores = np.array([brier_scores[pid] for pid in provider_ids])

    # Inverse weights (lower score = higher weight)
    epsilon = 1e-8
    inverse_scores = 1.0 / (scores + epsilon)

    # Normalize
    weights = inverse_scores / inverse_scores.sum()

    return {pid: float(w) for pid, w in zip(provider_ids, weights)}


def apply_weight_constraints(
    weights: Dict[int, float],
    sample_sizes: Dict[int, int],
    min_samples: int = None,
    weight_floor: float = None,
    weight_ceiling: float = None,
) -> Dict[int, float]:
    """
    Apply constraints to provider weights.

    Args:
        weights: Dictionary mapping provider_id to weight
        sample_sizes: Dictionary mapping provider_id to sample size
        min_samples: Minimum samples required for full weight (from settings if None)
        weight_floor: Minimum weight per provider (from settings if None)
        weight_ceiling: Maximum weight per provider (from settings if None)

    Returns:
        Constrained weights dictionary
    """
    if not weights:
        return {}

    if min_samples is None:
        min_samples = settings.min_samples_for_weight
    if weight_floor is None:
        weight_floor = settings.weight_floor
    if weight_ceiling is None:
        weight_ceiling = settings.weight_ceiling

    constrained = {}

    for provider_id, weight in weights.items():
        # Apply sample size constraint (linear ramp from 0 to min_samples)
        sample_size = sample_sizes.get(provider_id, 0)
        if sample_size < min_samples:
            sample_factor = sample_size / min_samples
            weight = weight * sample_factor

        # Apply floor and ceiling
        weight = max(weight_floor, min(weight_ceiling, weight))

        constrained[provider_id] = weight

    # Re-normalize to sum to 1.0
    total = sum(constrained.values())
    if total > 0:
        constrained = {pid: w / total for pid, w in constrained.items()}

    return constrained


def calculate_provider_weights(
    performances: List[Dict],
    method: str = "softmax",
    temperature: float = 1.0,
) -> Dict[int, float]:
    """
    Calculate provider weights from performance data.

    Args:
        performances: List of dicts with 'provider_id', 'brier_score', 'sample_size'
        method: Weighting method ('softmax' or 'inverse')
        temperature: Temperature for softmax method

    Returns:
        Dictionary mapping provider_id to weight
    """
    if not performances:
        logger.warning("No performance data provided for weighting")
        return {}

    # Extract data
    brier_scores = {p["provider_id"]: p["brier_score"] for p in performances}
    sample_sizes = {p["provider_id"]: p["sample_size"] for p in performances}

    # Calculate base weights
    if method == "softmax":
        weights = softmax_weights(brier_scores, temperature=temperature)
    elif method == "inverse":
        weights = inverse_score_weights(brier_scores)
    else:
        raise ValueError(f"Unknown weighting method: {method}")

    # Apply constraints
    weights = apply_weight_constraints(weights, sample_sizes)

    return weights


def equal_weights(provider_ids: List[int]) -> Dict[int, float]:
    """
    Calculate equal weights for all providers.

    Args:
        provider_ids: List of provider IDs

    Returns:
        Dictionary mapping provider_id to equal weight
    """
    if not provider_ids:
        return {}

    weight = 1.0 / len(provider_ids)
    return {pid: weight for pid in provider_ids}
