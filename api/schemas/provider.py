"""Provider schemas."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProviderResponse(BaseModel):
    id: int
    name: str
    type: str
    enabled: bool
    description: Optional[str] = None

    class Config:
        from_attributes = True


class ProviderHealthResponse(BaseModel):
    provider_id: int
    provider_name: str
    status: str
    message: str
    latency_ms: float
    checked_at: datetime


class WeightResponse(BaseModel):
    provider_id: int
    provider_name: str
    league_id: int
    league_name: str
    market_type: str
    weight: float
    updated_at: datetime

    class Config:
        from_attributes = True


class PerformanceResponse(BaseModel):
    provider_id: int
    provider_name: str
    league_id: int
    league_name: str
    market_type: str
    brier_score: float
    log_loss: float
    sample_size: int
    window_start: datetime
    window_end: datetime

    class Config:
        from_attributes = True
