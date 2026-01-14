"""Matches API router."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models import Match, League, MarketSnapshot, ProviderWeight, Provider, Team
from schemas.match import MatchResponse, MatchDetailResponse, SnapshotResponse, TeamInfo
from services.aggregation import aggregate_match_probabilities

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/", response_model=List[MatchDetailResponse])
def get_matches(
    league: Optional[str] = Query(None, description="League code (e.g., EPL)"),
    from_date: Optional[datetime] = Query(None, description="Start date"),
    to_date: Optional[datetime] = Query(None, description="End date"),
    upcoming_only: bool = Query(True, description="Only show upcoming matches"),
    db: Session = Depends(get_db),
):
    """Get matches with aggregated probabilities."""
    query = db.query(Match).options(
        joinedload(Match.home_team), joinedload(Match.away_team), joinedload(Match.league)
    )

    # Filter by league
    if league:
        query = query.join(League).filter(League.code == league)

    # Filter by date range
    if from_date:
        query = query.filter(Match.kickoff_time >= from_date)

    if to_date:
        query = query.filter(Match.kickoff_time <= to_date)
    elif upcoming_only:
        # Default to next 7 days
        query = query.filter(Match.kickoff_time <= datetime.utcnow() + timedelta(days=7))

    if upcoming_only:
        query = query.filter(Match.kickoff_time >= datetime.utcnow())

    # Order by kickoff time
    query = query.order_by(Match.kickoff_time)

    matches = query.all()

    # Enrich with aggregated probabilities
    enriched_matches = []
    for match in matches:
        # Get latest snapshots
        snapshots = (
            db.query(MarketSnapshot)
            .filter(MarketSnapshot.match_id == match.id)
            .order_by(MarketSnapshot.captured_at.desc())
            .limit(100)  # Last 100 snapshots
            .all()
        )

        # Get weights for this league
        weights_query = db.query(ProviderWeight).filter(
            ProviderWeight.league_id == match.league_id
        )
        weights_records = weights_query.all()
        weights = {w.provider_id: w.weight for w in weights_records}

        # Aggregate probabilities
        snapshot_dicts = [
            {
                "provider_id": s.provider_id,
                "home_prob": s.home_prob,
                "away_prob": s.away_prob,
                "draw_prob": s.draw_prob,
                "captured_at": s.captured_at,
            }
            for s in snapshots
        ]

        aggregated = aggregate_match_probabilities(
            snapshot_dicts, weights, market_type=snapshots[0].market_type if snapshots else "moneyline_2way"
        )

        enriched_matches.append(
            MatchDetailResponse(
                id=match.id,
                home_team=TeamInfo(
                    id=match.home_team.id,
                    name=match.home_team.name,
                    short_name=match.home_team.short_name,
                ),
                away_team=TeamInfo(
                    id=match.away_team.id,
                    name=match.away_team.name,
                    short_name=match.away_team.short_name,
                ),
                league=match.league.code,
                kickoff_time=match.kickoff_time,
                status=match.status.value,
                round=match.round,
                home_prob=aggregated["home_prob"],
                away_prob=aggregated["away_prob"],
                draw_prob=aggregated["draw_prob"],
                tip=aggregated["tip"],
                confidence=aggregated["confidence"],
                contributing_providers=aggregated["contributing_providers"],
                last_updated=aggregated["last_updated"],
            )
        )

    return enriched_matches


@router.get("/{match_id}", response_model=MatchDetailResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    """Get a specific match with aggregated probabilities."""
    match = (
        db.query(Match)
        .options(
            joinedload(Match.home_team), joinedload(Match.away_team), joinedload(Match.league)
        )
        .filter(Match.id == match_id)
        .first()
    )

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Get latest snapshots
    snapshots = (
        db.query(MarketSnapshot)
        .filter(MarketSnapshot.match_id == match.id)
        .order_by(MarketSnapshot.captured_at.desc())
        .limit(100)
        .all()
    )

    # Get weights
    weights_records = db.query(ProviderWeight).filter(
        ProviderWeight.league_id == match.league_id
    ).all()
    weights = {w.provider_id: w.weight for w in weights_records}

    # Aggregate
    snapshot_dicts = [
        {
            "provider_id": s.provider_id,
            "home_prob": s.home_prob,
            "away_prob": s.away_prob,
            "draw_prob": s.draw_prob,
            "captured_at": s.captured_at,
        }
        for s in snapshots
    ]

    aggregated = aggregate_match_probabilities(
        snapshot_dicts, weights, market_type=snapshots[0].market_type if snapshots else "moneyline_2way"
    )

    return MatchDetailResponse(
        id=match.id,
        home_team=TeamInfo(
            id=match.home_team.id,
            name=match.home_team.name,
            short_name=match.home_team.short_name,
        ),
        away_team=TeamInfo(
            id=match.away_team.id,
            name=match.away_team.name,
            short_name=match.away_team.short_name,
        ),
        league=match.league.code,
        kickoff_time=match.kickoff_time,
        status=match.status.value,
        round=match.round,
        home_prob=aggregated["home_prob"],
        away_prob=aggregated["away_prob"],
        draw_prob=aggregated["draw_prob"],
        tip=aggregated["tip"],
        confidence=aggregated["confidence"],
        contributing_providers=aggregated["contributing_providers"],
        last_updated=aggregated["last_updated"],
    )


@router.get("/{match_id}/snapshots", response_model=List[SnapshotResponse])
def get_match_snapshots(
    match_id: int,
    provider_id: Optional[int] = Query(None, description="Filter by provider"),
    limit: int = Query(100, le=1000, description="Number of snapshots to return"),
    db: Session = Depends(get_db),
):
    """Get historical snapshots for a match."""
    query = db.query(MarketSnapshot).filter(MarketSnapshot.match_id == match_id)

    if provider_id:
        query = query.filter(MarketSnapshot.provider_id == provider_id)

    query = query.order_by(MarketSnapshot.captured_at.desc()).limit(limit)

    snapshots = query.all()

    return [
        SnapshotResponse(
            id=s.id,
            match_id=s.match_id,
            provider_id=s.provider_id,
            market_type=s.market_type.value,
            captured_at=s.captured_at,
            home_prob=s.home_prob,
            away_prob=s.away_prob,
            draw_prob=s.draw_prob,
            raw_odds=s.raw_odds,
        )
        for s in snapshots
    ]
