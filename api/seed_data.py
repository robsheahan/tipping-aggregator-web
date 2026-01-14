"""Seed initial data into database."""
from database import SessionLocal
from models import League, Provider, ProviderType
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_leagues(db):
    """Seed initial leagues."""
    leagues = [
        {
            "name": "English Premier League",
            "sport": "soccer",
            "code": "EPL",
            "country": "England",
        },
        {
            "name": "Australian Football League",
            "sport": "afl",
            "code": "AFL",
            "country": "Australia",
        },
        {
            "name": "National Rugby League",
            "sport": "nrl",
            "code": "NRL",
            "country": "Australia",
        },
    ]

    for league_data in leagues:
        existing = db.query(League).filter(League.code == league_data["code"]).first()
        if not existing:
            league = League(**league_data)
            db.add(league)
            logger.info(f"Created league: {league_data['name']}")
        else:
            logger.info(f"League already exists: {league_data['name']}")


def seed_providers(db):
    """Seed initial providers."""
    providers = [
        {
            "name": "TheOddsAPI",
            "type": ProviderType.AGGREGATOR,
            "enabled": True,
            "description": "The Odds API - aggregated odds from multiple bookmakers",
        },
        {
            "name": "Polymarket",
            "type": ProviderType.PREDICTION_MARKET,
            "enabled": False,
            "description": "Polymarket prediction markets (stub - not yet implemented)",
        },
        {
            "name": "Bet365",
            "type": ProviderType.BOOKMAKER,
            "enabled": False,
            "description": "Bet365 bookmaker (stub - requires licensed feed)",
        },
    ]

    for provider_data in providers:
        existing = db.query(Provider).filter(Provider.name == provider_data["name"]).first()
        if not existing:
            provider = Provider(**provider_data)
            db.add(provider)
            logger.info(f"Created provider: {provider_data['name']}")
        else:
            logger.info(f"Provider already exists: {provider_data['name']}")


def main():
    """Run seed script."""
    db = SessionLocal()

    try:
        logger.info("Seeding leagues...")
        seed_leagues(db)

        logger.info("Seeding providers...")
        seed_providers(db)

        db.commit()
        logger.info("Seed data completed successfully!")

    except Exception as e:
        logger.error(f"Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
