#!/usr/bin/env python3
"""
Check TheOddsAPI for Horse Racing availability and fetch live odds

Usage:
1. Replace YOUR_API_KEY_HERE with your actual API key
2. Run: python3 scripts/check_racing_api.py
"""

import requests
import json
from typing import List, Dict, Optional

# =====================================
# CONFIGURATION
# =====================================
API_KEY = "YOUR_API_KEY_HERE"  # <-- PASTE YOUR API KEY HERE
BASE_URL = "https://api.the-odds-api.com/v4"

# =====================================
# STEP 1: Find Racing Sports
# =====================================
def find_racing_sports() -> List[Dict]:
    """Fetch all sports and filter for racing-related ones"""

    print("=" * 60)
    print("STEP 1: Finding Racing Sports")
    print("=" * 60)

    url = f"{BASE_URL}/sports/"
    params = {"apiKey": API_KEY}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()

        all_sports = response.json()
        print(f"\n✓ Successfully fetched {len(all_sports)} total sports\n")

        # Filter for racing-related sports
        racing_keywords = ['racing', 'horse', 'horseracing', 'horses', 'thoroughbred', 'harness', 'greyhound']
        racing_sports = []

        for sport in all_sports:
            sport_key = sport.get('key', '').lower()
            sport_title = sport.get('title', '').lower()

            # Check if any racing keyword is in the key or title
            if any(keyword in sport_key or keyword in sport_title for keyword in racing_keywords):
                racing_sports.append(sport)

        if racing_sports:
            print(f"Found {len(racing_sports)} racing-related sport(s):\n")
            for sport in racing_sports:
                print(f"  ✓ {sport['title']}")
                print(f"    Key: {sport['key']}")
                print(f"    Group: {sport.get('group', 'N/A')}")
                print(f"    Active: {'Yes' if sport.get('active') else 'No'}")
                print(f"    Has Outrights: {'Yes' if sport.get('has_outrights') else 'No'}")
                print()
        else:
            print("❌ No racing sports found in your API account.")
            print("\nThis could mean:")
            print("  1. Horse racing is not included in your API plan")
            print("  2. You may need to upgrade to access racing data")
            print("  3. TheOddsAPI may not offer Australian racing")
            print("\nShowing all available sports for reference:")
            print("-" * 60)
            for sport in all_sports[:20]:  # Show first 20
                print(f"  - {sport['key']} ({sport['title']})")
            if len(all_sports) > 20:
                print(f"  ... and {len(all_sports) - 20} more")

        return racing_sports

    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching sports: {e}")
        return []

# =====================================
# STEP 2: Fetch Live Racing Odds
# =====================================
def fetch_racing_odds(sport_key: str) -> Optional[Dict]:
    """Fetch live odds for a racing sport"""

    print("\n" + "=" * 60)
    print(f"STEP 2: Fetching Live Odds for '{sport_key}'")
    print("=" * 60)

    url = f"{BASE_URL}/sports/{sport_key}/odds/"
    params = {
        "apiKey": API_KEY,
        "regions": "au",  # Australian bookmakers
        "markets": "h2h",  # Head-to-head (win) market
        "oddsFormat": "decimal",
        "dateFormat": "iso"
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()

        events = response.json()

        if not events:
            print(f"\n⚠️  No live events found for '{sport_key}'")
            print("This could mean:")
            print("  - No races are currently scheduled")
            print("  - Races are not yet available for betting")
            print("  - The sport key is correct but no Australian races today")
            return None

        print(f"\n✓ Found {len(events)} event(s) with odds\n")

        # Show the first event in detail
        first_event = events[0]
        print("-" * 60)
        print("FIRST EVENT DETAILS:")
        print("-" * 60)
        print(f"Event ID: {first_event.get('id')}")
        print(f"Sport: {first_event.get('sport_title')}")
        print(f"Home Team: {first_event.get('home_team')}")
        print(f"Away Team: {first_event.get('away_team', 'N/A')}")
        print(f"Start Time: {first_event.get('commence_time')}")
        print(f"Bookmakers: {len(first_event.get('bookmakers', []))}")
        print()

        # Show bookmaker odds structure
        if first_event.get('bookmakers'):
            bookmaker = first_event['bookmakers'][0]
            print("BOOKMAKER STRUCTURE (First bookmaker):")
            print("-" * 60)
            print(f"Bookmaker: {bookmaker.get('key')}")
            print(f"Title: {bookmaker.get('title')}")
            print(f"Last Update: {bookmaker.get('last_update')}")

            if bookmaker.get('markets'):
                market = bookmaker['markets'][0]
                print(f"\nMarket: {market.get('key')}")
                print(f"Outcomes: {len(market.get('outcomes', []))}")
                print("\nFirst 3 runners/outcomes:")
                for outcome in market.get('outcomes', [])[:3]:
                    print(f"  - {outcome.get('name')}: ${outcome.get('price')}")

        print("\n" + "=" * 60)
        print("FULL JSON RESPONSE (First Event):")
        print("=" * 60)
        print(json.dumps(first_event, indent=2))

        # Show quota usage
        remaining = response.headers.get('x-requests-remaining')
        used = response.headers.get('x-requests-used')
        if remaining:
            print(f"\n📊 API Quota: {used} used, {remaining} remaining")

        return {
            'sport_key': sport_key,
            'events': events,
            'event_count': len(events)
        }

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"\n❌ Error 404: Sport key '{sport_key}' not found")
            print("The sport key exists in /sports but has no odds endpoint.")
        else:
            print(f"\n❌ HTTP Error: {e}")
            print(f"Response: {e.response.text}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error fetching odds: {e}")
        return None

# =====================================
# STEP 3: Extract Race Structure
# =====================================
def analyze_race_structure(odds_data: Dict):
    """Analyze the structure of racing data"""

    if not odds_data or not odds_data.get('events'):
        return

    print("\n" + "=" * 60)
    print("STEP 3: Analyzing Race Data Structure")
    print("=" * 60)

    event = odds_data['events'][0]

    # Determine if this is racing or team sports
    has_away_team = event.get('away_team') is not None

    if not has_away_team:
        print("\n✓ This appears to be RACING data (no away_team)")
        print("\nData Structure:")
        print("  - Each 'outcome' represents a runner/horse")
        print("  - The 'home_team' field contains the race identifier")
        print("  - Multiple bookmakers provide odds for each runner")
    else:
        print("\n⚠️  This appears to be TEAM SPORTS data (has away_team)")
        print("This may not be racing, or racing data is structured differently.")

    # Count unique runners
    if event.get('bookmakers'):
        all_runners = set()
        for bookmaker in event['bookmakers']:
            for market in bookmaker.get('markets', []):
                for outcome in market.get('outcomes', []):
                    all_runners.add(outcome.get('name'))

        print(f"\nUnique Runners in Race: {len(all_runners)}")
        print("Runners:")
        for i, runner in enumerate(sorted(all_runners), 1):
            print(f"  {i}. {runner}")

    # Show which bookmakers have odds
    bookmaker_names = [bm.get('title') for bm in event.get('bookmakers', [])]
    print(f"\nBookmakers with odds: {', '.join(bookmaker_names)}")

# =====================================
# MAIN
# =====================================
def main():
    print("\n🏇 THEODDSAPI HORSE RACING CHECKER")
    print("=" * 60)

    if API_KEY == "YOUR_API_KEY_HERE":
        print("\n❌ ERROR: Please set your API key in the script!")
        print("Edit the API_KEY variable at the top of this file.\n")
        return

    # Step 1: Find racing sports
    racing_sports = find_racing_sports()

    if not racing_sports:
        print("\n" + "=" * 60)
        print("RECOMMENDATION")
        print("=" * 60)
        print("Since TheOddsAPI doesn't have racing in your plan,")
        print("consider these alternatives:")
        print("\n1. Racing APIs (Australia):")
        print("   - Punters.com.au API")
        print("   - RacingAPI.com")
        print("   - BetFair API (requires account)")
        print("\n2. Remove the Racing card from your homepage")
        print("   Edit: /web/src/lib/config/sports.ts")
        print("   Delete the RACING entry\n")
        return

    # Step 2: Fetch odds for the first racing sport found
    active_racing = [s for s in racing_sports if s.get('active')]

    if not active_racing:
        print("\n⚠️  Racing sports found but none are currently active")
        return

    sport_key = active_racing[0]['key']
    odds_data = fetch_racing_odds(sport_key)

    # Step 3: Analyze structure
    if odds_data:
        analyze_race_structure(odds_data)

        print("\n" + "=" * 60)
        print("NEXT STEPS")
        print("=" * 60)
        print(f"✓ Your racing sport key is: {sport_key}")
        print("\nUpdate your Tip Master config:")
        print("  File: /web/src/lib/odds/providers/theoddsapi.ts")
        print(f"  Change: 'horse_racing_australia' → '{sport_key}'")
        print("\nThen commit and push:")
        print("  git add web/src/lib/odds/providers/theoddsapi.ts")
        print('  git commit -m "Fix horse racing sport key"')
        print("  git push\n")

if __name__ == "__main__":
    main()
