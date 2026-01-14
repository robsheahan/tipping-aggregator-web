"""League model."""
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class League(Base):
    """League/competition model."""

    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    sport = Column(String(50), nullable=False)  # 'soccer', 'afl', 'nrl'
    code = Column(String(20), nullable=False, unique=True)  # 'EPL', 'AFL', 'NRL'
    country = Column(String(100), nullable=True)

    # Relationships
    teams = relationship("Team", back_populates="league")
    matches = relationship("Match", back_populates="league")

    def __repr__(self):
        return f"<League(id={self.id}, name='{self.name}', sport='{self.sport}')>"
