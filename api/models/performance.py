"""Provider performance and weight models."""
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, String, Index
from sqlalchemy.orm import relationship
from database import Base
from models.snapshot import MarketType
from sqlalchemy import Enum as SQLEnum


class ProviderPerformance(Base):
    """Provider performance tracking."""

    __tablename__ = "provider_performances"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False, index=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False, index=True)
    market_type = Column(SQLEnum(MarketType), nullable=False)

    # Time window
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)

    # Performance metrics
    brier_score = Column(Float, nullable=False)
    log_loss = Column(Float, nullable=False)
    sample_size = Column(Integer, nullable=False)

    # Metadata
    computed_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    provider = relationship("Provider", back_populates="performances")

    # Composite index for efficient queries
    __table_args__ = (
        Index("ix_performance_provider_league_market", "provider_id", "league_id", "market_type"),
    )

    def __repr__(self):
        return f"<ProviderPerformance(id={self.id}, provider_id={self.provider_id}, brier={self.brier_score:.4f}, samples={self.sample_size})>"


class ProviderWeight(Base):
    """Provider weight for aggregation."""

    __tablename__ = "provider_weights"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False, index=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False, index=True)
    market_type = Column(SQLEnum(MarketType), nullable=False)

    # Weight value (0.0 to 1.0)
    weight = Column(Float, nullable=False)

    # Metadata
    updated_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    provider = relationship("Provider", back_populates="weights")

    # Composite index for efficient queries
    __table_args__ = (
        Index("ix_weight_provider_league_market", "provider_id", "league_id", "market_type", unique=True),
    )

    def __repr__(self):
        return f"<ProviderWeight(id={self.id}, provider_id={self.provider_id}, league_id={self.league_id}, weight={self.weight:.4f})>"
