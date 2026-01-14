"""Match schemas."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TeamInfo(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None

    class Config:
        from_attributes = True


class MatchBase(BaseModel):
    kickoff_time: datetime
    status: str


class MatchResponse(MatchBase):
    id: int
    home_team: TeamInfo
    away_team: TeamInfo
    league: str
    round: Optional[str] = None

    class Config:
        from_attributes = True


class MatchDetailResponse(MatchResponse):
    """Match with aggregated probabilities."""

    home_prob: Optional[float] = None
    away_prob: Optional[float] = None
    draw_prob: Optional[float] = None
    tip: Optional[str] = None
    confidence: Optional[float] = None
    contributing_providers: int = 0
    last_updated: Optional[datetime] = None


class SnapshotResponse(BaseModel):
    """Market snapshot response."""

    id: int
    provider_name: str
    captured_at: datetime
    home_prob: float
    away_prob: float
    draw_prob: Optional[float] = None
    raw_odds: Optional[dict] = None

    class Config:
        from_attributes = True
