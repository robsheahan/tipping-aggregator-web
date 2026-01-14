"""Snapshot schemas."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SnapshotResponse(BaseModel):
    id: int
    match_id: int
    provider_id: int
    market_type: str
    captured_at: datetime
    home_prob: float
    away_prob: float
    draw_prob: Optional[float] = None
    raw_odds: Optional[dict] = None

    class Config:
        from_attributes = True
