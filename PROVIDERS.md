# Provider Integration Guidelines

This document outlines the legal, compliance, and technical requirements for integrating odds providers into the Tipping Aggregator.

## Legal & Compliance Requirements

### Core Principles

1. **NO Unauthorized Access**: Never scrape, bypass authentication, or violate Terms of Service
2. **Official APIs Only**: Use publicly documented APIs or licensed data feeds
3. **Respect Rate Limits**: Implement exponential backoff and caching
4. **User Agent Identification**: Clearly identify your application
5. **Data Licensing**: Ensure you have rights to use and redistribute data

### Prohibited Actions

- Web scraping of protected sites
- Bypassing paywalls or login protections
- Defeating bot detection mechanisms
- Reverse engineering proprietary APIs
- Violating copyright or data licensing terms
- Accessing data without authorization

## Provider Status

### ✅ Implemented & Compliant

#### TheOddsAPI
- **Status**: Fully implemented
- **Type**: Aggregator
- **Compliance**: Official public API with free tier
- **Documentation**: https://the-odds-api.com/liveapi/guides/v4/
- **Authentication**: API key (required)
- **Rate Limits**: 500 requests/month (free tier)
- **Coverage**: EPL, AFL, NRL + many more sports

**Integration Details:**
- Official API endpoints
- Proper authentication headers
- Rate limiting respected
- Caching implemented
- Clear attribution in app

**Setup:**
1. Register at https://the-odds-api.com/
2. Get free API key
3. Add `THEODDSAPI_KEY` to `.env`
4. Enable provider in database

### 🚧 Stub Implementations

#### Polymarket
- **Status**: Stub only
- **Type**: Prediction market (blockchain-based)
- **Compliance**: Public on-chain data permitted
- **Integration Path**: Use official API or subgraph

**Compliant Integration Options:**
1. **Polymarket CLOB API**: https://docs.polymarket.com/
   - Public API for market data
   - No authentication required for read operations
   - Rate limiting: reasonable, unspecified

2. **Subgraph Queries**: Query Polygon blockchain
   - Public data, no restrictions
   - GraphQL endpoint available
   - Historical market data accessible

**Implementation Notes:**
- Sports markets may be limited
- Need to map market questions to fixtures
- Resolution mechanics differ from bookmakers
- Check data availability before full implementation

**TO DO:**
```python
# File: api/providers/polymarket.py

async def fetch_odds(self, match_external_id: str, sport: str):
    """Fetch from Polymarket CLOB API."""
    url = f"https://clob.polymarket.com/markets/{match_external_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers={
            "User-Agent": "TippingAggregator/1.0"
        })
        data = response.json()

        # Extract probabilities from order book
        # Convert to ProviderSnapshot
        # Return normalized probabilities
```

#### Bet365
- **Status**: Stub only (DO NOT IMPLEMENT without license)
- **Type**: Bookmaker
- **Compliance**: ❌ NO PUBLIC API - Licensed feeds only

**Why Bet365 is Stubbed:**

Bet365 explicitly prohibits in their Terms of Service:
- Automated data extraction
- Use of bots or scrapers
- Systematic downloading of site content
- Any unauthorized data collection

**Legal Integration Paths:**

1. **Official Data Feed Agreement**
   - Contact Bet365 directly for API access
   - Typically enterprise/commercial only
   - Expensive licensing fees

2. **Licensed Third-Party Aggregators**
   - Sportradar: https://sportradar.com/
   - Betgenius (Genius Sports): https://geniussports.com/
   - These companies have agreements with bookmakers
   - Require commercial licenses

3. **Regulated Betting Feeds**
   - Some jurisdictions require bookmakers to provide feeds
   - Check your local regulations
   - May require regulatory approval

**DO NOT:**
- Scrape Bet365 website
- Use browser automation (Selenium, Puppeteer)
- Bypass their bot detection
- Reverse engineer their mobile apps
- Use unofficial "APIs" or data sources

## Adding New Providers

### Step 1: Verify Compliance

Before implementing, confirm:

- [ ] Is there an official public API?
- [ ] Does the API allow commercial use?
- [ ] Are there rate limits? Can you comply?
- [ ] Do Terms of Service permit your use case?
- [ ] Is data licensing clear?
- [ ] Do you need attribution?

### Step 2: Review Documentation

Read the provider's:
- API documentation
- Terms of Service / Terms of Use
- Rate limiting policy
- Data usage guidelines
- Attribution requirements

### Step 3: Implement Provider Class

```python
# api/providers/new_provider.py

from providers.base import BaseProvider, ProviderMatch, ProviderSnapshot
import httpx

class NewProvider(BaseProvider):
    """
    NewProvider integration.

    Compliance notes:
    - Official API: https://...
    - Terms of Service: https://...
    - Rate limits: X requests per Y
    - Attribution required: Yes/No
    """

    def __init__(self):
        super().__init__(name="NewProvider", enabled=True)
        self.api_key = settings.new_provider_key
        self.base_url = "https://api.newprovider.com"

    async def fetch_matches(self, sport: str, league: Optional[str] = None):
        """Fetch upcoming matches."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "User-Agent": "TippingAggregator/1.0 (your@email.com)",
        }

        # Implement rate limiting
        await self.rate_limit_wait(1.0)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/matches",
                headers=headers,
                params={"sport": sport, "league": league}
            )
            response.raise_for_status()

            # Parse and return ProviderMatch objects

    async def fetch_odds(self, match_external_id: str, sport: str):
        """Fetch current odds."""
        # Similar implementation
        pass

    async def health_check(self):
        """Check API accessibility."""
        try:
            # Ping health endpoint
            return {"status": "healthy", "message": "OK", "latency_ms": 0}
        except Exception as e:
            return {"status": "unhealthy", "message": str(e), "latency_ms": 0}
```

### Step 4: Add Configuration

```python
# api/config.py

class Settings(BaseSettings):
    # ... existing settings ...
    new_provider_key: Optional[str] = None
```

### Step 5: Register Provider

```python
# api/seed_data.py

def seed_providers(db):
    providers = [
        # ... existing providers ...
        {
            "name": "NewProvider",
            "type": ProviderType.BOOKMAKER,
            "enabled": True,
            "description": "NewProvider - official API integration",
        },
    ]
```

### Step 6: Update Tasks

```python
# api/tasks/odds_polling.py

provider_instances = {
    "TheOddsAPI": TheOddsAPIProvider(),
    "NewProvider": NewProvider(),  # Add new provider
}
```

## Rate Limiting Best Practices

### Implementation

```python
import asyncio
from datetime import datetime, timedelta

class RateLimiter:
    def __init__(self, requests_per_minute: int):
        self.requests_per_minute = requests_per_minute
        self.requests = []

    async def wait_if_needed(self):
        """Wait if rate limit would be exceeded."""
        now = datetime.now()
        cutoff = now - timedelta(minutes=1)

        # Remove old requests
        self.requests = [r for r in self.requests if r > cutoff]

        if len(self.requests) >= self.requests_per_minute:
            # Wait until oldest request expires
            wait_until = self.requests[0] + timedelta(minutes=1)
            wait_seconds = (wait_until - now).total_seconds()
            if wait_seconds > 0:
                await asyncio.sleep(wait_seconds)

        self.requests.append(now)
```

### Caching Strategy

```python
from redis import Redis
import json

cache = Redis.from_url(settings.redis_url)

async def fetch_with_cache(key: str, fetch_func, ttl: int = 300):
    """Fetch from cache or API."""
    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    data = await fetch_func()
    cache.setex(key, ttl, json.dumps(data))
    return data
```

## Error Handling

### Robust Implementation

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
async def fetch_with_retry(url: str, headers: dict):
    """Fetch with exponential backoff."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

        if response.status_code == 429:  # Rate limited
            retry_after = int(response.headers.get("Retry-After", 60))
            await asyncio.sleep(retry_after)
            raise Exception("Rate limited, retrying...")

        response.raise_for_status()
        return response.json()
```

## Monitoring & Logging

### Structured Logging

```python
import logging
import json

logger = logging.getLogger(__name__)

def log_api_call(provider: str, endpoint: str, status: int, latency: float):
    """Log API calls for monitoring."""
    logger.info(
        "API call",
        extra={
            "provider": provider,
            "endpoint": endpoint,
            "status_code": status,
            "latency_ms": latency,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
```

### Health Monitoring

Implement `/providers/health` endpoint (admin only):
- Check API accessibility
- Measure latency
- Verify authentication
- Test data availability
- Alert on failures

## Attribution & Licensing

### Display Requirements

If provider requires attribution:

```python
# In UI footer or provider detail:
"Odds provided by {Provider Name}"
"Data sourced from {Provider Name} under license"
```

### Data Retention

Some providers restrict:
- How long you can cache data
- Whether you can store historical data
- Redistribution rights

Check license terms and implement accordingly.

## Security Considerations

### API Key Management

```bash
# NEVER commit API keys
# Use environment variables
# Rotate keys regularly
# Use different keys for dev/prod
```

### Secure Storage

```python
# Use secrets management
from azure.keyvault.secrets import SecretClient
from aws.secrets import SecretsManager

# Not in code or .env files in production
```

## Testing Provider Integrations

```python
# tests/providers/test_new_provider.py

import pytest
from providers.new_provider import NewProvider

@pytest.mark.asyncio
async def test_fetch_matches():
    """Test match fetching."""
    provider = NewProvider()
    matches = await provider.fetch_matches("soccer", "EPL")

    assert len(matches) > 0
    assert matches[0].home_team is not None
    assert matches[0].kickoff_time is not None

@pytest.mark.asyncio
async def test_health_check():
    """Test health check."""
    provider = NewProvider()
    health = await provider.health_check()

    assert health["status"] in ["healthy", "unhealthy"]
    assert "message" in health
```

## Compliance Checklist

Before deploying a new provider:

- [ ] Official API documentation reviewed
- [ ] Terms of Service compliance verified
- [ ] Rate limiting implemented
- [ ] Caching strategy in place
- [ ] Error handling with exponential backoff
- [ ] User-Agent header set
- [ ] Authentication working
- [ ] Health check implemented
- [ ] Tests written and passing
- [ ] Monitoring and logging configured
- [ ] Attribution added (if required)
- [ ] Data retention policy followed

## Resources

### Sports Data Providers (Legal APIs)

- **TheOddsAPI**: https://the-odds-api.com/ (Aggregator)
- **Sportradar**: https://sportradar.com/ (Enterprise)
- **Stats Perform**: https://www.statsperform.com/ (Enterprise)
- **SportsDataIO**: https://sportsdata.io/ (Multiple sports)
- **API-Football**: https://www.api-football.com/ (Soccer)

### Prediction Markets

- **Polymarket**: https://polymarket.com/ (Polygon-based)
- **Augur**: https://augur.net/ (Ethereum-based)
- **Kalshi**: https://kalshi.com/ (CFTC-regulated, US)

### Regulatory Resources

- **UK Gambling Commission**: https://www.gamblingcommission.gov.uk/
- **Australian Communications and Media Authority**: https://www.acma.gov.au/
- **CFTC (US)**: https://www.cftc.gov/

## Questions?

If unsure about legality or compliance:
1. Review provider's Terms of Service
2. Consult with legal counsel
3. Contact provider directly
4. Check regulatory requirements in your jurisdiction

**When in doubt, don't implement.** Better to skip a provider than violate terms or laws.
