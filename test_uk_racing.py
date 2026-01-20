"""Test UK Racing API access"""
import asyncio
import os
import httpx
import base64
from dotenv import load_dotenv
from datetime import date

load_dotenv()

async def test_uk_racing():
    username = os.getenv("RACINGAPI_USERNAME")
    password = os.getenv("RACINGAPI_PASSWORD")

    credentials = f"{username}:{password}"
    encoded = base64.b64encode(credentials.encode()).decode()
    auth_header = f"Basic {encoded}"

    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json"
    }

    today = date.today().isoformat()

    print("=" * 60)
    print("Testing UK Racing API Access")
    print("=" * 60)

    # Test UK endpoint
    print(f"\n1. Testing UK meets for {today}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.theracingapi.com/v1/uk/meets",
                headers=headers,
                params={"date": today},
                timeout=30.0
            )

            response.raise_for_status()
            data = response.json()

            print(f"✅ UK Racing API access successful!")
            print(f"   Found {len(data.get('meets', []))} UK meets today")

            if data.get('meets'):
                print("\n   Sample meet:")
                meet = data['meets'][0]
                print(f"   - ID: {meet.get('id')}")
                print(f"   - Course: {meet.get('course')}")
                print(f"   - Date: {meet.get('date')}")

                # Try to fetch races for first meet
                meet_id = meet.get('id')
                print(f"\n2. Testing races for meet {meet_id}...")

                race_response = await client.get(
                    f"https://api.theracingapi.com/v1/uk/meets/{meet_id}/races",
                    headers=headers,
                    timeout=30.0
                )

                race_response.raise_for_status()
                race_data = race_response.json()

                print(f"✅ Found {len(race_data.get('races', []))} races")

                if race_data.get('races'):
                    race = race_data['races'][0]
                    print(f"\n   Sample race:")
                    print(f"   - Race #{race.get('race_number')}: {race.get('race_name')}")
                    print(f"   - Start time: {race.get('race_time')}")
                    print(f"   - Distance: {race.get('distance')}")
                    print(f"   - Runners: {len(race.get('runners', []))}")

                    if race.get('runners'):
                        runner = race['runners'][0]
                        print(f"\n   Sample runner:")
                        print(f"   - #{runner.get('number')}: {runner.get('name')}")
                        print(f"   - Jockey: {runner.get('jockey')}")

                return True
            else:
                print("   No UK races today, but API access is working!")
                return True

    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP Error: {e.response.status_code}")
        print(f"   Response: {e.response.text}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_uk_racing())
