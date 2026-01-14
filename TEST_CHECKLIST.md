# Testing Checklist

Use this checklist to verify your local setup.

## Pre-Testing Setup

- [ ] Docker Desktop installed and running
- [ ] Got TheOddsAPI free key from https://the-odds-api.com/
- [ ] Cloned/downloaded the repository
- [ ] Opened terminal in `tipping-aggregator` directory

## Quick Start (5 Minutes)

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env and add THEODDSAPI_KEY=your_key_here

# 2. Run automated test
./test_setup.sh

# 3. Open browser
open http://localhost:3000
```

Done! ✅

## Manual Testing Checklist

### Phase 1: Environment (2 minutes)
- [ ] Created .env file
- [ ] Added THEODDSAPI_KEY to .env
- [ ] Verified Docker is running: `docker ps`
- [ ] Ports 3000, 5432, 6379, 8000 are available

### Phase 2: Services (3 minutes)
- [ ] Started services: `docker-compose up -d`
- [ ] Waited 30 seconds for initialization
- [ ] Checked status: `docker-compose ps` (all "Up")
- [ ] Checked logs: `docker-compose logs` (no errors)

### Phase 3: Database (2 minutes)
- [ ] Seeded data: `docker-compose exec api python seed_data.py`
- [ ] Verified leagues: `docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT * FROM leagues;"`
- [ ] Verified providers: `docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT * FROM providers;"`

### Phase 4: API Testing (3 minutes)
- [ ] Health: `curl http://localhost:8000/health`
- [ ] Leagues: `curl http://localhost:8000/leagues`
- [ ] Providers: `curl http://localhost:8000/providers`
- [ ] API Docs: Opened http://localhost:8000/docs in browser

### Phase 5: Data Fetching (5 minutes)
- [ ] Fetched fixtures: `docker-compose exec api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()"`
- [ ] Verified matches: `docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT COUNT(*) FROM matches;"`
- [ ] Polled odds: `docker-compose exec api python -c "from tasks.odds_polling import poll_upcoming_matches; poll_upcoming_matches()"`
- [ ] Verified snapshots: `docker-compose exec postgres psql -U tipping -d tipping_aggregator -c "SELECT COUNT(*) FROM market_snapshots;"`

### Phase 6: Frontend Testing (3 minutes)
- [ ] Opened http://localhost:3000
- [ ] Homepage loaded successfully
- [ ] Can switch between EPL/AFL/NRL tabs
- [ ] Match cards display (if data fetched)
- [ ] Clicked on a match (if available)
- [ ] Match detail page shows chart
- [ ] Opened admin page: http://localhost:3000/admin
- [ ] Entered password: `admin123`
- [ ] Viewed provider health

### Phase 7: Background Jobs (2 minutes)
- [ ] Checked worker logs: `docker-compose logs worker | tail -20`
- [ ] Checked beat logs: `docker-compose logs beat | tail -20`
- [ ] Verified jobs are scheduled
- [ ] No errors in logs

### Phase 8: Unit Tests (2 minutes)
- [ ] Ran tests: `docker-compose exec api pytest tests/ -v`
- [ ] All tests passed
- [ ] No failures or errors

## Success Criteria

✅ Your setup is successful if:

1. All 6 containers running (postgres, redis, api, worker, beat, web)
2. API responds with health status
3. Frontend loads and displays UI
4. Database has leagues and providers
5. Can fetch and display data (if API key valid)
6. All unit tests pass
7. No error messages in logs
8. Background jobs running

## Quick Verification Commands

```bash
# One-liner health check
docker-compose ps && \
curl -s http://localhost:8000/health && \
curl -s http://localhost:3000 -I | head -1

# Should show:
# - All containers "Up"
# - {"status":"healthy","service":"api"}
# - HTTP/1.1 200 OK

# Data check
docker-compose exec -T postgres psql -U tipping -d tipping_aggregator << 'SQL'
SELECT 'Leagues' as table_name, COUNT(*) as count FROM leagues
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams
UNION ALL
SELECT 'Matches', COUNT(*) FROM matches
UNION ALL
SELECT 'Providers', COUNT(*) FROM providers
UNION ALL
SELECT 'Snapshots', COUNT(*) FROM market_snapshots;
SQL
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | Change port in docker-compose.yml |
| Container won't start | `docker-compose down -v && docker-compose up -d --build` |
| No data | Check API key in .env, run fetch commands |
| Database error | `docker-compose restart postgres` then wait 10s |
| Frontend not loading | `docker-compose restart web` |
| Worker not running | `docker-compose logs worker` to check errors |

## Time Estimate

- **Automated** (test_setup.sh): ~3 minutes
- **Manual** (all phases): ~22 minutes
- **Quick verification**: ~1 minute

## What to Test First

Recommended order:
1. ✅ Run `./test_setup.sh` (easiest)
2. ✅ Open http://localhost:3000 (visual verification)
3. ✅ Check API docs at http://localhost:8000/docs
4. ✅ Run unit tests
5. ✅ View logs: `docker-compose logs -f`

## Documentation Reference

- **Quick Start**: See QUICKSTART.md
- **Full Testing Guide**: See TESTING.md
- **Setup Details**: See SETUP.md
- **Architecture**: See README.md
- **Provider Integration**: See PROVIDERS.md
- **Project Overview**: See PROJECT_SUMMARY.md

## After Testing

Once everything works:
- [ ] Reviewed the code structure
- [ ] Read PROVIDERS.md for adding data sources
- [ ] Explored API documentation
- [ ] Understood the architecture (README.md)
- [ ] Ready to customize or deploy

## Getting Help

If stuck:
1. Check `docker-compose logs [service]`
2. Review TESTING.md troubleshooting section
3. Verify prerequisites met
4. Check .env file has valid API key
5. Ensure Docker has enough resources (4GB+ RAM)

---

**Ready to test?** Start with: `./test_setup.sh` 🚀
