# Quick Start Guide

Get the Tipping Aggregator running in 5 minutes.

## Prerequisites Check

```bash
docker --version       # Should show Docker version
docker-compose --version  # Should show Docker Compose version
```

If either is missing, install Docker Desktop: https://www.docker.com/products/docker-desktop

## 5-Minute Setup

### 1. Get API Key (30 seconds)

Visit https://the-odds-api.com/ and sign up for a free API key.

### 2. Configure (30 seconds)

```bash
cd tipping-aggregator
cp .env.example .env
nano .env  # Add your THEODDSAPI_KEY
```

### 3. Start (2 minutes)

```bash
# Start all services
docker-compose up -d

# Wait for services to initialize
sleep 30
```

### 4. Initialize (1 minute)

```bash
# Seed database
docker-compose exec api python seed_data.py

# Fetch sample data (optional)
docker-compose exec api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()"
```

### 5. Access (30 seconds)

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- API: http://localhost:8000

## One-Line Test

```bash
./test_setup.sh
```

This automated script does everything above plus validation.

## Essential Commands

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Run tests
docker-compose exec api pytest tests/ -v

# Check status
docker-compose ps
```

## Verify It's Working

1. Open http://localhost:3000 - should see the dashboard
2. Open http://localhost:8000/docs - should see API documentation
3. Run `curl http://localhost:8000/health` - should return `{"status":"healthy"}`

## Common Issues

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Change port in docker-compose.yml
# web:
#   ports:
#     - "3001:3000"  # Change 3000 to 3001
```

### Services Not Starting

```bash
docker-compose down -v
docker-compose up -d --build
```

### No Data Showing

Make sure you:
1. Added valid THEODDSAPI_KEY to .env
2. Ran `docker-compose exec api python seed_data.py`
3. Ran the fetch fixtures command

## What Each Service Does

- **postgres** - Stores all data (matches, odds, results)
- **redis** - Manages background job queue
- **api** - FastAPI backend (port 8000)
- **worker** - Celery worker (executes background jobs)
- **beat** - Celery beat (schedules periodic jobs)
- **web** - Next.js frontend (port 3000)

## Architecture in 30 Seconds

```
User → Frontend (Next.js) → API (FastAPI) → Database (PostgreSQL)
                                ↓
                           Celery Workers → External APIs
                                ↓              (TheOddsAPI)
                           Redis Queue
```

## Data Flow

1. **Beat Scheduler** triggers job every 5 minutes
2. **Worker** fetches odds from TheOddsAPI
3. **API** stores in PostgreSQL
4. **Scoring Service** evaluates provider accuracy
5. **Weighting Service** adjusts provider weights
6. **Aggregation Service** combines probabilities
7. **Frontend** displays to user

## Next Steps

- [TESTING.md](TESTING.md) - Comprehensive testing guide
- [README.md](README.md) - Full documentation
- [PROVIDERS.md](PROVIDERS.md) - Add more data sources
- [SETUP.md](SETUP.md) - Detailed setup guide

## Production Deployment

For production:
1. Use managed PostgreSQL (AWS RDS, etc.)
2. Use managed Redis (AWS ElastiCache, etc.)
3. Set ENVIRONMENT=production
4. Use secrets manager for API keys
5. Configure domain and SSL
6. Set up monitoring
7. Configure backups

## Support

- Check logs: `docker-compose logs [service]`
- View status: `docker-compose ps`
- Documentation: [README.md](README.md)
- Testing: [TESTING.md](TESTING.md)

That's it! You should now have a working tipping aggregator. 🎉
