"""
Pydantic models for AFL/NRL sport match data
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class SportMatch(BaseModel):
    id: str                                     # TheOddsAPI event ID
    sport: str                                  # 'afl' or 'nrl'
    league: str                                 # 'AFL' or 'NRL'
    home_team: str
    away_team: str
    commence_time: str                          # ISO datetime string

    # Aggregated probabilities
    home_prob: Optional[float] = None
    away_prob: Optional[float] = None
    draw_prob: Optional[float] = None

    # Tip
    tip: Optional[str] = None                   # 'home' or 'away'
    confidence: Optional[float] = None          # 0-1

    # Spread
    home_spread: Optional[float] = None
    away_spread: Optional[float] = None

    # Total
    total_points: Optional[float] = None

    # Predicted scores
    home_predicted_score: Optional[float] = None
    away_predicted_score: Optional[float] = None
    predicted_margin: Optional[float] = None

    # Metadata
    contributing_providers: int = 0
    last_updated: Optional[str] = None
    status: str = "scheduled"

    # Raw bookmaker data
    bookmaker_odds: List[Dict[str, Any]] = []


class SportExpertTip(BaseModel):
    match_id: str
    source: str                                 # 'squiggle', 'afl.com.au', etc.
    expert_name: Optional[str] = None
    tipped_team: str
    predicted_margin: Optional[float] = None
    sport: str                                  # 'afl' or 'nrl'


class SportTipConsensus(BaseModel):
    match_id: str
    home_tips: int = 0
    away_tips: int = 0
    total_tips: int = 0
    consensus_team: Optional[str] = None
    consensus_pct: Optional[float] = None       # 0-1
    consensus_strength: Optional[str] = None    # 'unanimous', 'strong', 'lean', 'split'
    avg_predicted_margin: Optional[float] = None
