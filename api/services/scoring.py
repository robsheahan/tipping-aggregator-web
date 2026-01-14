"""Proper scoring rules for provider performance evaluation."""
import numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


def brier_score(predicted_prob: float, actual_outcome: int) -> float:
    """
    Calculate Brier score for a single prediction.

    Args:
        predicted_prob: Predicted probability (0.0 to 1.0)
        actual_outcome: Actual outcome (0 or 1)

    Returns:
        Brier score (lower is better, range 0.0 to 1.0)
    """
    if not 0.0 <= predicted_prob <= 1.0:
        raise ValueError(f"Predicted probability must be in [0, 1], got {predicted_prob}")
    if actual_outcome not in [0, 1]:
        raise ValueError(f"Actual outcome must be 0 or 1, got {actual_outcome}")

    return (predicted_prob - actual_outcome) ** 2


def brier_score_multi(
    predicted_probs: Dict[str, float], actual_outcome: str
) -> float:
    """
    Calculate Brier score for multi-class prediction.

    Args:
        predicted_probs: Dictionary of predicted probabilities (e.g., {'home': 0.5, 'draw': 0.3, 'away': 0.2})
        actual_outcome: Actual outcome key (e.g., 'home')

    Returns:
        Brier score (lower is better)
    """
    # Validate probabilities sum to ~1.0
    total = sum(predicted_probs.values())
    if not 0.99 <= total <= 1.01:
        logger.warning(f"Probabilities sum to {total}, expected ~1.0")

    # Calculate Brier score
    score = 0.0
    for key, prob in predicted_probs.items():
        actual = 1.0 if key == actual_outcome else 0.0
        score += (prob - actual) ** 2

    return score


def log_loss(predicted_prob: float, actual_outcome: int) -> float:
    """
    Calculate logarithmic loss for a single prediction.

    Args:
        predicted_prob: Predicted probability (0.0 to 1.0)
        actual_outcome: Actual outcome (0 or 1)

    Returns:
        Log loss (lower is better, range 0.0 to infinity)
    """
    if not 0.0 <= predicted_prob <= 1.0:
        raise ValueError(f"Predicted probability must be in [0, 1], got {predicted_prob}")
    if actual_outcome not in [0, 1]:
        raise ValueError(f"Actual outcome must be 0 or 1, got {actual_outcome}")

    # Clip to avoid log(0)
    epsilon = 1e-15
    predicted_prob = np.clip(predicted_prob, epsilon, 1 - epsilon)

    if actual_outcome == 1:
        return -np.log(predicted_prob)
    else:
        return -np.log(1 - predicted_prob)


def log_loss_multi(
    predicted_probs: Dict[str, float], actual_outcome: str
) -> float:
    """
    Calculate logarithmic loss for multi-class prediction.

    Args:
        predicted_probs: Dictionary of predicted probabilities
        actual_outcome: Actual outcome key

    Returns:
        Log loss (lower is better)
    """
    if actual_outcome not in predicted_probs:
        raise ValueError(f"Actual outcome '{actual_outcome}' not in predicted probabilities")

    # Clip to avoid log(0)
    epsilon = 1e-15
    prob = np.clip(predicted_probs[actual_outcome], epsilon, 1.0)

    return -np.log(prob)


def mean_brier_score(predictions: List[Dict]) -> float:
    """
    Calculate mean Brier score across multiple predictions.

    Args:
        predictions: List of dicts with 'predicted_probs' and 'actual_outcome'

    Returns:
        Mean Brier score
    """
    if not predictions:
        raise ValueError("Predictions list is empty")

    scores = []
    for pred in predictions:
        if isinstance(pred["predicted_probs"], dict):
            score = brier_score_multi(pred["predicted_probs"], pred["actual_outcome"])
        else:
            score = brier_score(pred["predicted_probs"], pred["actual_outcome"])
        scores.append(score)

    return float(np.mean(scores))


def mean_log_loss(predictions: List[Dict]) -> float:
    """
    Calculate mean log loss across multiple predictions.

    Args:
        predictions: List of dicts with 'predicted_probs' and 'actual_outcome'

    Returns:
        Mean log loss
    """
    if not predictions:
        raise ValueError("Predictions list is empty")

    scores = []
    for pred in predictions:
        if isinstance(pred["predicted_probs"], dict):
            score = log_loss_multi(pred["predicted_probs"], pred["actual_outcome"])
        else:
            score = log_loss(pred["predicted_probs"], pred["actual_outcome"])
        scores.append(score)

    return float(np.mean(scores))


def calculate_time_weighted_score(
    scores: List[float], timestamps: List[float], halflife_days: float = 30.0
) -> float:
    """
    Calculate time-weighted average score with exponential decay.

    Args:
        scores: List of scores
        timestamps: List of Unix timestamps (seconds)
        halflife_days: Half-life for exponential decay in days

    Returns:
        Time-weighted average score
    """
    if len(scores) != len(timestamps):
        raise ValueError("Scores and timestamps must have same length")

    if not scores:
        raise ValueError("Scores list is empty")

    # Most recent timestamp
    most_recent = max(timestamps)

    # Calculate decay weights
    halflife_seconds = halflife_days * 86400.0
    decay_constant = np.log(2) / halflife_seconds

    weights = []
    for ts in timestamps:
        age_seconds = most_recent - ts
        weight = np.exp(-decay_constant * age_seconds)
        weights.append(weight)

    # Normalize weights
    weights = np.array(weights)
    weights = weights / weights.sum()

    # Calculate weighted average
    weighted_score = np.sum(np.array(scores) * weights)

    return float(weighted_score)
