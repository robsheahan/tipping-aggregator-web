"""Providers API router."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import Provider, ProviderPerformance, League
from schemas.provider import ProviderResponse, ProviderHealthResponse, PerformanceResponse
from providers.theoddsapi import TheOddsAPIProvider
from providers.polymarket import PolymarketProvider
from providers.stub_bet365 import Bet365Provider
from config import settings

router = APIRouter(prefix="/providers", tags=["providers"])


def verify_admin(authorization: Optional[str] = Header(None)):
    """Verify admin authorization."""
    if not authorization or authorization != f"Bearer {settings.admin_password}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/", response_model=List[ProviderResponse])
def get_providers(db: Session = Depends(get_db)):
    """Get all providers."""
    providers = db.query(Provider).all()
    return providers


@router.get("/health", response_model=List[ProviderHealthResponse])
async def check_providers_health(
    _: None = Depends(verify_admin), db: Session = Depends(get_db)
):
    """Check health of all providers (admin only)."""
    providers_map = {
        "TheOddsAPI": TheOddsAPIProvider(),
        "Polymarket": PolymarketProvider(),
        "Bet365": Bet365Provider(),
    }

    health_results = []
    for name, provider_instance in providers_map.items():
        # Get provider from DB
        provider = db.query(Provider).filter(Provider.name == name).first()

        if not provider:
            continue

        # Check health
        health = await provider_instance.health_check()
        health_results.append(
            ProviderHealthResponse(
                provider_id=provider.id,
                provider_name=provider.name,
                status=health["status"],
                message=health["message"],
                latency_ms=health["latency_ms"],
                checked_at=datetime.utcnow(),
            )
        )

    return health_results


@router.get("/{provider_id}/performance", response_model=List[PerformanceResponse])
def get_provider_performance(
    provider_id: int,
    league_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Get provider performance metrics."""
    query = db.query(ProviderPerformance, Provider, League).join(
        Provider, ProviderPerformance.provider_id == Provider.id
    ).join(League, ProviderPerformance.league_id == League.id).filter(
        ProviderPerformance.provider_id == provider_id
    )

    if league_id:
        query = query.filter(ProviderPerformance.league_id == league_id)

    results = query.order_by(ProviderPerformance.window_end.desc()).all()

    return [
        PerformanceResponse(
            provider_id=perf.provider_id,
            provider_name=provider.name,
            league_id=perf.league_id,
            league_name=league.name,
            market_type=perf.market_type.value,
            brier_score=perf.brier_score,
            log_loss=perf.log_loss,
            sample_size=perf.sample_size,
            window_start=perf.window_start,
            window_end=perf.window_end,
        )
        for perf, provider, league in results
    ]
