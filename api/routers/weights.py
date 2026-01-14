"""Weights API router."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import ProviderWeight, Provider, League
from schemas.provider import WeightResponse

router = APIRouter(prefix="/weights", tags=["weights"])


@router.get("/", response_model=List[WeightResponse])
def get_weights(
    league: Optional[str] = Query(None, description="League code (e.g., EPL)"),
    market_type: Optional[str] = Query(None, description="Market type"),
    db: Session = Depends(get_db),
):
    """Get provider weights."""
    query = (
        db.query(ProviderWeight, Provider, League)
        .join(Provider, ProviderWeight.provider_id == Provider.id)
        .join(League, ProviderWeight.league_id == League.id)
    )

    if league:
        query = query.filter(League.code == league)

    if market_type:
        query = query.filter(ProviderWeight.market_type == market_type)

    results = query.order_by(ProviderWeight.weight.desc()).all()

    return [
        WeightResponse(
            provider_id=weight.provider_id,
            provider_name=provider.name,
            league_id=weight.league_id,
            league_name=league_obj.name,
            market_type=weight.market_type.value,
            weight=weight.weight,
            updated_at=weight.updated_at,
        )
        for weight, provider, league_obj in results
    ]
