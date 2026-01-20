"""Test TheOddsAPI for horse racing"""
import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_theodds_racing():
    api_key = os.getenv("THEODDSAPI_KEY")

    print("=" * 60)
    print("Testing TheOddsAPI for Horse Racing")
    print("=" * 60)

    try:
        async with httpx.AsyncClient() as client:
            # Get available sports
            print("\n1. Checking available sports...")
            response = await client.get(
                "https://api.the-odds-api.com/v4/sports",
                params={"apiKey": api_key},
                timeout=10.0
            )

            response.raise_for_status()
            sports = response.json()

            # Look for horse racing
            racing_sports = [s for s in sports if 'hors' in s['key'].lower() or 'racing' in s['key'].lower()]

            if racing_sports:
                print(f"✅ Found {len(racing_sports)} horse racing sport(s):")
                for sport in racing_sports:
                    print(f"   - {sport['key']}: {sport['title']}")
                    print(f"     Active: {sport.get('active', False)}")
                    print(f"     Has outrights: {sport.get('has_outrights', False)}")

                # Try to get odds for first racing sport
                first_sport = racing_sports[0]['key']
                print(f"\n2. Fetching odds for {first_sport}...")

                odds_response = await client.get(
                    f"https://api.the-odds-api.com/v4/sports/{first_sport}/odds",
                    params={
                        "apiKey": api_key,
                        "regions": "uk",
                        "markets": "h2h"
                    },
                    timeout=10.0
                )

                odds_response.raise_for_status()
                events = odds_response.json()

                print(f"✅ Found {len(events)} racing events")

                if events:
                    event = events[0]
                    print(f"\n   Sample event:")
                    print(f"   - ID: {event.get('id')}")
                    print(f"   - Sport: {event.get('sport_title')}")
                    print(f"   - Commence time: {event.get('commence_time')}")
                    print(f"   - Home: {event.get('home_team')}")
                    print(f"   - Away: {event.get('away_team')}")

                    if event.get('bookmakers'):
                        print(f"   - Bookmakers: {len(event['bookmakers'])}")

                return True
            else:
                print("❌ No horse racing sports found")
                print("\n   All available sports:")
                for sport in sports[:10]:  # Show first 10
                    print(f"   - {sport['key']}: {sport['title']}")
                return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_theodds_racing())
