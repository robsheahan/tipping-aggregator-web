# Testing Guide

Complete guide to test the Tipping Aggregator locally.

## Prerequisites

- Docker Desktop installed and running
- TheOddsAPI key (get free at https://the-odds-api.com/)
- At least 4GB RAM available for Docker
- Ports 3000, 5432, 6379, 8000 available

## Quick Test (Automated)

Run the automated test script:

```bash
cd tipping-aggregator
./test_setup.sh
```

This script will:
1. Check prerequisites
2. Start all services
3. Seed the database
4. Fetch sample data
5. Test all endpoints
6. Verify everything is working

## Manual Testing Steps

### 1. Environment Setup

```bash
# Create .env file
cp .env.example .env

# Edit .env and add your API key
nano .env  # or use your preferred editor

# Required: Set THEODDSAPI_KEY
# Optional: Change ADMIN_PASSWORD
```

### 2. Start Services

```bash
# Start all containers
docker-compose up -d

# Check status
docker-compose ps

# Expected output: All services should show "Up"
# - postgres
# - redis
# - api
# - worker
# - beat
# - web
```

### 3. View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f web

# Exit logs: Ctrl+C
```

### 4. Initialize Database

```bash
# Seed leagues and providers
docker-compose exec api python seed_data.py

# Expected output:
# INFO - Created league: English Premier League
# INFO - Created league: Australian Football League
# INFO - Created league: National Rugby League
# INFO - Created provider: TheOddsAPI
# INFO - Seed data completed successfully!
```

### 5. Verify Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U tipping -d tipping_aggregator

# Run queries
\dt                                    # List tables
SELECT * FROM leagues;                 # View leagues
SELECT * FROM providers WHERE enabled = true;  # View enabled providers
\q                                     # Exit

# Quick count queries
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT COUNT(*) FROM leagues;"
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT COUNT(*) FROM providers;"
```

### 6. Test API Endpoints

```bash
# Test 1: Health check
curl http://localhost:8000/health
# Expected: {"status":"healthy","service":"api"}

# Test 2: Get leagues
curl http://localhost:8000/leagues | jq
# Expected: Array of 3 leagues (EPL, AFL, NRL)

# Test 3: Get providers
curl http://localhost:8000/providers | jq
# Expected: Array of providers including TheOddsAPI

# Test 4: Get matches (will be empty initially)
curl http://localhost:8000/matches | jq
# Expected: Empty array [] or error if no data yet

# Test 5: API documentation
open http://localhost:8000/docs
# Opens interactive API docs in browser
```

### 7. Fetch Real Data

```bash
# Fetch upcoming matches
docker-compose exec api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()"

# Check what was fetched
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT COUNT(*) FROM matches;"
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT home_team_id, away_team_id, kickoff_time FROM matches LIMIT 5;"

# Poll odds for those matches
docker-compose exec api python -c "from tasks.odds_polling import poll_upcoming_matches; poll_upcoming_matches()"

# Check snapshots
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT COUNT(*) FROM market_snapshots;"
```

### 8. Test Frontend

```bash
# Open in browser
open http://localhost:3000

# Or test with curl
curl -I http://localhost:3000
# Expected: HTTP/1.1 200 OK
```

Frontend features to test:
- [ ] Home page loads
- [ ] Can switch between EPL/AFL/NRL tabs
- [ ] Match cards display with probabilities
- [ ] Click on a match to view details
- [ ] Match detail page shows probability chart
- [ ] Provider snapshots table displays
- [ ] Admin page (http://localhost:3000/admin)
  - Enter password: `admin123`
  - View provider health
  - View provider weights

### 9. Test Background Jobs

Background jobs run automatically:

```bash
# Check beat scheduler (schedules jobs)
docker-compose logs beat | grep -i "scheduler"

# Check worker (executes jobs)
docker-compose logs worker | grep -i "poll"

# Manual trigger a job
docker-compose exec api python -c "from tasks.odds_polling import poll_upcoming_matches; poll_upcoming_matches()"

# View job results in database
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT market_type, COUNT(*) FROM market_snapshots GROUP BY market_type;"
```

### 10. Run Unit Tests

```bash
# Run all tests
docker-compose exec api pytest tests/ -v

# Run specific test file
docker-compose exec api pytest tests/test_odds_utils.py -v

# Run with coverage
docker-compose exec api pytest tests/ --cov=services --cov-report=term

# Expected: All tests should pass
```

## Verification Checklist

### API Tests
- [ ] Health endpoint returns "healthy"
- [ ] Leagues endpoint returns 3 leagues
- [ ] Providers endpoint returns providers
- [ ] Matches endpoint works (may be empty)
- [ ] API docs accessible at /docs

### Database Tests
- [ ] PostgreSQL container running
- [ ] Can connect to database
- [ ] Leagues table has 3 rows
- [ ] Providers table has entries
- [ ] Can query tables without errors

### Worker Tests
- [ ] Worker container running
- [ ] Beat scheduler container running
- [ ] Can see job logs
- [ ] Manual job execution works

### Frontend Tests
- [ ] Web container running
- [ ] Port 3000 accessible
- [ ] Home page loads
- [ ] League tabs work
- [ ] Match cards display (if data exists)
- [ ] Admin page accessible

### Integration Tests
- [ ] Can fetch fixtures
- [ ] Fixtures appear in database
- [ ] Can poll odds
- [ ] Odds snapshots stored
- [ ] Aggregation works
- [ ] Frontend displays aggregated data

## Troubleshooting

### Services Won't Start

```bash
# Stop everything
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild containers
docker-compose build --no-cache

# Start again
docker-compose up -d
```

### Database Connection Errors

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres | tail -50

# Restart PostgreSQL
docker-compose restart postgres

# Wait 10 seconds then restart API
sleep 10
docker-compose restart api
```

### No Data Appearing

```bash
# Check if API key is set correctly
docker-compose exec api python -c "from config import settings; print(f'API Key: {settings.theoddsapi_key[:10]}...')"

# Check provider is enabled
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT name, enabled FROM providers;"

# Manually fetch data with verbose logging
docker-compose logs -f worker &
docker-compose exec api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()"
```

### Frontend Not Loading

```bash
# Check web container logs
docker-compose logs web | tail -50

# Restart web container
docker-compose restart web

# Check if Next.js is building
docker-compose exec web npm run build

# Access directly
curl -I http://localhost:3000
```

### Worker/Beat Not Running

```bash
# Check Celery workers
docker-compose logs worker | tail -50

# Check beat scheduler
docker-compose logs beat | tail -50

# Restart workers
docker-compose restart worker beat

# Test Redis connection
docker-compose exec api python -c "from redis import Redis; from config import settings; r = Redis.from_url(settings.redis_url); print(r.ping())"
```

## Performance Testing

### Load Test API

```bash
# Install hey (HTTP load testing tool)
# macOS: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# Test matches endpoint
hey -n 100 -c 10 http://localhost:8000/matches

# Expected: 100 requests completed successfully
```

### Database Performance

```bash
# Check query performance
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "EXPLAIN ANALYZE SELECT * FROM matches WHERE kickoff_time > NOW() LIMIT 10;"

# Check table sizes
docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

## Cleanup

```bash
# Stop services
docker-compose down

# Stop and remove volumes (delete all data)
docker-compose down -v

# Remove images (free up space)
docker-compose down --rmi all -v
```

## Success Criteria

Your setup is successful if:

1. ✅ All 6 Docker containers running
2. ✅ API responds at http://localhost:8000
3. ✅ API docs accessible at http://localhost:8000/docs
4. ✅ Frontend loads at http://localhost:3000
5. ✅ Database has leagues and providers
6. ✅ Can fetch fixtures (if API key valid)
7. ✅ Can poll odds (if fixtures exist)
8. ✅ Unit tests pass
9. ✅ Worker logs show activity
10. ✅ No error messages in logs

## Next Steps

Once testing is complete:

1. Explore the API docs: http://localhost:8000/docs
2. Review the code structure
3. Add more providers (see PROVIDERS.md)
4. Customize the frontend
5. Set up monitoring
6. Plan production deployment

## Getting Help

If you encounter issues:

1. Check logs: `docker-compose logs [service]`
2. Review SETUP.md for common issues
3. Verify prerequisites are met
4. Check GitHub issues
5. Read PROVIDERS.md for provider-specific issues

Happy testing! 🚀
