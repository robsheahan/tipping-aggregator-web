"""
Database models for Supabase/PostgreSQL
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum

class TipCategory(str, Enum):
    """Tip category from AI analysis"""
    BEST_BET = "best_bet"
    VALUE = "value"
    AVOID = "avoid"
    NEUTRAL = "neutral"

class Runner(BaseModel):
    """Runner/Horse in a race"""
    number: int
    name: str
    jockey: Optional[str] = None
    trainer: Optional[str] = None
    weight: Optional[str] = None
    barrier: Optional[int] = None

class RaceOdds(BaseModel):
    """Odds for a runner from a bookmaker"""
    id: Optional[int] = None
    race_id: str
    runner_number: int
    bookmaker: str
    odds: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ExpertTip(BaseModel):
    """Expert tip scraped from public sources"""
    id: Optional[int] = None
    race_id: str
    runner_name: str
    runner_number: int
    source: str  # e.g., "Sky Racing", "Racing.com"
    expert_name: Optional[str] = None
    confidence_score: int = Field(ge=0, le=100)  # 0-100
    category: TipCategory
    raw_text: str
    ai_summary: Optional[str] = None  # Claude-generated summary
    scraped_at: datetime = Field(default_factory=datetime.utcnow)

class ConsensusScore(BaseModel):
    """AI consensus score for a runner"""
    id: Optional[int] = None
    race_id: str
    runner_number: int
    runner_name: str
    consensus_score: int = Field(ge=0, le=100)  # Aggregated confidence 0-100
    num_tips: int = Field(default=0)  # Number of tips for this runner
    best_odds: float  # Best available odds
    best_bookmaker: str
    ai_verdict: str  # Claude-generated 1-sentence summary
    tip_breakdown: Dict[str, int] = Field(default_factory=dict)  # {source: confidence}
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Race(BaseModel):
    """Race meeting"""
    id: str  # meet_id-race_number format
    meet_id: str
    venue: str
    race_number: int
    race_name: Optional[str] = None
    start_time: datetime
    distance: Optional[str] = None
    race_class: Optional[str] = None
    track_condition: Optional[str] = None
    weather: Optional[str] = None
    status: str = "upcoming"  # upcoming, live, resulted
    runners: List[Runner] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Meet(BaseModel):
    """Race meeting (venue)"""
    id: str
    date: str  # YYYY-MM-DD
    venue: str
    country: str = "AUS"
    region: str
    num_races: int = 0

class AffiliateClick(BaseModel):
    """Track affiliate clicks for analytics"""
    id: Optional[int] = None
    bookmaker: str
    race_id: str
    runner_number: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    clicked_at: datetime = Field(default_factory=datetime.utcnow)
