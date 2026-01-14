"""Market snapshot model."""
import enum
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Enum as SQLEnum, JSON, Index
from sqlalchemy.orm import relationship
from database import Base


class MarketType(str, enum.Enum):
    """Market type enum."""

    MONEYLINE_2WAY = "moneyline_2way"  # AFL, NRL (home/away)
    MONEYLINE_3WAY = "moneyline_3way"  # Soccer (home/draw/away)


class MarketSnapshot(Base):
    """Market snapshot/odds model."""

    __tablename__ = "market_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False, index=True)
    market_type = Column(SQLEnum(MarketType), nullable=False)
    captured_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Implied probabilities (normalized)
    home_prob = Column(Float, nullable=False)
    away_prob = Column(Float, nullable=False)
    draw_prob = Column(Float, nullable=True)  # Only for 3-way markets

    # Raw data for audit
    raw_odds = Column(JSON, nullable=True)  # {"home": 2.5, "away": 1.8, "draw": 3.2}

    # Relationships
    match = relationship("Match", back_populates="snapshots")
    provider = relationship("Provider", back_populates="snapshots")

    # Composite index for efficient queries
    __table_args__ = (
        Index("ix_snapshots_match_provider_time", "match_id", "provider_id", "captured_at"),
    )

    def __repr__(self):
        return f"<MarketSnapshot(id={self.id}, match_id={self.match_id}, provider_id={self.provider_id}, captured_at={self.captured_at})>"
