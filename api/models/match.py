"""Match model."""
import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from database import Base


class MatchStatus(str, enum.Enum):
    """Match status enum."""

    SCHEDULED = "scheduled"
    IN_PLAY = "in_play"
    FINISHED = "finished"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"


class Match(Base):
    """Match/fixture model."""

    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    kickoff_time = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(SQLEnum(MatchStatus), nullable=False, default=MatchStatus.SCHEDULED)
    external_ids = Column(JSON, nullable=True)  # {"theoddsapi": "...", "polymarket": "..."}
    round = Column(String(50), nullable=True)  # Round/week number
    season = Column(String(20), nullable=True)  # e.g., "2024-25"

    # Relationships
    league = relationship("League", back_populates="matches")
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
    snapshots = relationship("MarketSnapshot", back_populates="match", cascade="all, delete-orphan")
    result = relationship("Result", back_populates="match", uselist=False)

    def __repr__(self):
        return f"<Match(id={self.id}, home_team_id={self.home_team_id}, away_team_id={self.away_team_id}, kickoff={self.kickoff_time})>"
