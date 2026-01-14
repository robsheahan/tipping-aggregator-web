"""League schemas."""
from pydantic import BaseModel


class LeagueBase(BaseModel):
    name: str
    sport: str
    code: str
    country: str | None = None


class LeagueCreate(LeagueBase):
    pass


class LeagueResponse(LeagueBase):
    id: int

    class Config:
        from_attributes = True
