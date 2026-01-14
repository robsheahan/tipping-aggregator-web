"""Fixture fetching tasks."""
from tasks.celery_app import celery_app
from database import SessionLocal
from models import League, Team, Match, MatchStatus
from providers.theoddsapi import TheOddsAPIProvider
import logging
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.fixtures.fetch_all_fixtures")
def fetch_all_fixtures():
    """Fetch fixtures for all configured leagues."""
    db = SessionLocal()

    try:
        # Get all enabled leagues
        leagues = db.query(League).all()

        provider = TheOddsAPIProvider()

        for league in leagues:
            logger.info(f"Fetching fixtures for {league.name}")
            try:
                fetch_league_fixtures_sync(league.sport, league.code, db, provider)
            except Exception as e:
                logger.error(f"Error fetching fixtures for {league.name}: {e}")
                continue

        db.commit()
        logger.info("Finished fetching all fixtures")

    except Exception as e:
        logger.error(f"Error in fetch_all_fixtures: {e}")
        db.rollback()
    finally:
        db.close()


def fetch_league_fixtures_sync(sport: str, league_code: str, db, provider):
    """Fetch fixtures for a specific league (synchronous)."""
    import asyncio

    # Create event loop for async provider
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        matches = loop.run_until_complete(provider.fetch_matches(sport, league_code))

        logger.info(f"Fetched {len(matches)} matches for {league_code}")

        # Get league from DB
        league = db.query(League).filter(League.code == league_code).first()
        if not league:
            logger.error(f"League {league_code} not found in database")
            return

        # Process each match
        for match_data in matches:
            # Get or create teams
            home_team = get_or_create_team(db, match_data.home_team, league.id)
            away_team = get_or_create_team(db, match_data.away_team, league.id)

            # Check if match already exists
            existing_match = (
                db.query(Match)
                .filter(
                    Match.league_id == league.id,
                    Match.home_team_id == home_team.id,
                    Match.away_team_id == away_team.id,
                    Match.kickoff_time == match_data.kickoff_time,
                )
                .first()
            )

            if existing_match:
                # Update external IDs
                if existing_match.external_ids is None:
                    existing_match.external_ids = {}
                existing_match.external_ids["theoddsapi"] = match_data.external_id
                logger.debug(f"Updated existing match {existing_match.id}")
            else:
                # Create new match
                new_match = Match(
                    league_id=league.id,
                    home_team_id=home_team.id,
                    away_team_id=away_team.id,
                    kickoff_time=match_data.kickoff_time,
                    status=MatchStatus.SCHEDULED,
                    external_ids={"theoddsapi": match_data.external_id},
                )
                db.add(new_match)
                logger.info(f"Created new match: {home_team.name} vs {away_team.name}")

        db.commit()

    finally:
        loop.close()


def get_or_create_team(db, team_name: str, league_id: int) -> Team:
    """Get or create a team."""
    team = db.query(Team).filter(Team.name == team_name, Team.league_id == league_id).first()

    if not team:
        team = Team(name=team_name, league_id=league_id)
        db.add(team)
        db.flush()  # Get ID without committing
        logger.info(f"Created new team: {team_name}")

    return team
