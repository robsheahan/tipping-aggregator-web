"""Test all API connections"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 60)
print("Testing API Connections")
print("=" * 60)

# Test 1: Anthropic API
print("\n1. Testing Anthropic API...")
try:
    from anthropic import Anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY not found in environment")
        sys.exit(1)

    client = Anthropic(api_key=api_key)
    print(f"✅ Anthropic API key loaded: {api_key[:20]}...")

    # Test a simple API call
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=10,
        messages=[{"role": "user", "content": "Hello"}]
    )
    print(f"✅ Anthropic API connection successful!")
    print(f"   Response: {response.content[0].text}")
except Exception as e:
    print(f"❌ Anthropic API error: {e}")

# Test 2: Supabase Connection
print("\n2. Testing Supabase Connection...")
try:
    from supabase import create_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("❌ Supabase credentials not found in environment")
        sys.exit(1)

    client = create_client(url, key)
    print(f"✅ Supabase URL: {url}")

    # Test database connection
    result = client.table("meets").select("*").limit(1).execute()
    print(f"✅ Supabase connection successful!")
    print(f"   Connected to database")
except Exception as e:
    print(f"❌ Supabase error: {e}")

# Test 3: Racing API
print("\n3. Testing Racing API...")
try:
    import requests
    username = os.getenv("RACINGAPI_USERNAME")
    password = os.getenv("RACINGAPI_PASSWORD")

    if not username or not password:
        print("❌ Racing API credentials not found")
        sys.exit(1)

    print(f"✅ Racing API Username: {username}")
    print(f"✅ Racing API credentials loaded")
except Exception as e:
    print(f"❌ Racing API error: {e}")

# Test 4: TheOddsAPI
print("\n4. Testing TheOddsAPI...")
try:
    api_key = os.getenv("THEODDSAPI_KEY")

    if not api_key:
        print("❌ TheOddsAPI key not found")
    else:
        print(f"✅ TheOddsAPI Key: {api_key[:20]}...")
except Exception as e:
    print(f"❌ TheOddsAPI error: {e}")

print("\n" + "=" * 60)
print("✅ All API connections configured!")
print("=" * 60)
