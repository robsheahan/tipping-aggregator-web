"""Test what racing regions are available"""
import asyncio
import os
import httpx
import base64
from dotenv import load_dotenv
from datetime import date

load_dotenv()

async def test_regions():
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
    print("Testing Available Racing Regions")
    print("=" * 60)

    # Try different region codes
    regions = ["uk", "gb", "ireland", "usa", "australia", "nz", "france", "japan", "hongkong"]

    async with httpx.AsyncClient() as client:
        for region in regions:
            try:
                print(f"\nTrying: {region}...")
                response = await client.get(
                    f"https://api.theracingapi.com/v1/{region}/meets",
                    headers=headers,
                    params={"date": today},
                    timeout=10.0
                )

                if response.status_code == 200:
                    data = response.json()
                    num_meets = len(data.get('meets', []))
                    print(f"  ✅ {region.upper()}: {num_meets} meets available")
                elif response.status_code == 401:
                    print(f"  🔒 {region.upper()}: Exists but requires subscription")
                elif response.status_code == 404:
                    print(f"  ❌ {region.upper()}: Not found")
                else:
                    print(f"  ⚠️  {region.upper()}: Status {response.status_code}")

            except Exception as e:
                print(f"  ❌ {region.upper()}: Error - {str(e)[:50]}")

        # Also try the base endpoint to see what's available
        print("\n" + "=" * 60)
        print("Trying base API endpoint...")
        try:
            response = await client.get(
                "https://api.theracingapi.com/v1",
                headers=headers,
                timeout=10.0
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_regions())
