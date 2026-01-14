"""Provider model."""
import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base


class ProviderType(str, enum.Enum):
    """Provider type enum."""

    BOOKMAKER = "bookmaker"
    EXCHANGE = "exchange"
    PREDICTION_MARKET = "prediction_market"
    AGGREGATOR = "aggregator"
    STUB = "stub"  # For providers not yet integrated


class Provider(Base):
    """Provider/source model."""

    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    type = Column(SQLEnum(ProviderType), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    description = Column(String(500), nullable=True)

    # Relationships
    snapshots = relationship("MarketSnapshot", back_populates="provider")
    performances = relationship("ProviderPerformance", back_populates="provider")
    weights = relationship("ProviderWeight", back_populates="provider")

    def __repr__(self):
        return f"<Provider(id={self.id}, name='{self.name}', type='{self.type}', enabled={self.enabled})>"
