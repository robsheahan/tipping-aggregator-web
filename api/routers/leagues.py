"""Leagues API router."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import League
from schemas.league import LeagueResponse

router = APIRouter(prefix="/leagues", tags=["leagues"])


@router.get("/", response_model=List[LeagueResponse])
def get_leagues(db: Session = Depends(get_db)):
    """Get all leagues."""
    leagues = db.query(League).all()
    return leagues


@router.get("/{league_id}", response_model=LeagueResponse)
def get_league(league_id: int, db: Session = Depends(get_db)):
    """Get a specific league."""
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="League not found")
    return league
