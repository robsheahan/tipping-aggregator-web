"""Team model."""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Team(Base):
    """Team model."""

    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    short_name = Column(String(50), nullable=True)
    external_id = Column(String(100), nullable=True)  # ID from external provider

    # Relationships
    league = relationship("League", back_populates="teams")
    home_matches = relationship("Match", foreign_keys="Match.home_team_id", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="Match.away_team_id", back_populates="away_team")

    def __repr__(self):
        return f"<Team(id={self.id}, name='{self.name}', league_id={self.league_id})>"
