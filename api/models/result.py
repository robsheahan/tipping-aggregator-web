"""Result model."""
import enum
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base


class MatchOutcome(str, enum.Enum):
    """Match outcome enum."""

    HOME_WIN = "home_win"
    AWAY_WIN = "away_win"
    DRAW = "draw"


class Result(Base):
    """Match result model."""

    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, unique=True, index=True)
    home_score = Column(Integer, nullable=False)
    away_score = Column(Integer, nullable=False)
    outcome = Column(SQLEnum(MatchOutcome), nullable=False)
    finalised_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    match = relationship("Match", back_populates="result")

    def __repr__(self):
        return f"<Result(id={self.id}, match_id={self.match_id}, outcome='{self.outcome}', score={self.home_score}-{self.away_score})>"
