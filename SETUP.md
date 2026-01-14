# Quick Setup Guide

This is a streamlined guide to get the Tipping Aggregator running locally.

## Prerequisites

- Docker Desktop installed and running
- TheOddsAPI key (get free at https://the-odds-api.com/)

## Setup Steps

### 1. Configure Environment

```bash
# Create environment file
cp .env.example .env

# Edit .env and add your API key
# THEODDSAPI_KEY=your_key_here
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up -d

# Wait for services to be healthy (~30 seconds)
docker-compose ps
```

### 3. Initialize Database

```bash
# Create tables via SQLAlchemy (for quick start)
# In production, use Alembic migrations instead

# Seed initial data (leagues and providers)
docker-compose exec api python seed_data.py
```

### 4. Fetch Initial Data

```bash
# Fetch upcoming fixtures
docker-compose exec api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()"

# Poll odds for fixtures
docker-compose exec api python -c "from tasks.odds_polling import poll_upcoming_matches; poll_upcoming_matches()"
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **API**: http://localhost:8000

## Verify Setup

Check services are running:

```bash
# Check all containers
docker-compose ps

# Should see: api, worker, beat, postgres, redis, web all "Up"

# Check API health
curl http://localhost:8000/health

# Check worker logs
docker-compose logs worker

# Check beat scheduler
docker-compose logs beat
```

## Troubleshooting

### Services won't start

```bash
# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Database errors

```bash
# Check PostgreSQL
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d postgres
sleep 10
docker-compose up -d
```

### No data showing

```bash
# Check if providers are enabled
docker-compose exec api python -c "from database import SessionLocal; from models import Provider; db = SessionLocal(); print([p.name for p in db.query(Provider).filter(Provider.enabled==True).all()])"

# Manually trigger data fetch
docker-compose exec api python seed_data.py
docker-compose exec api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()"
docker-compose exec api python -c "from tasks.odds_polling import poll_upcoming_matches; poll_upcoming_matches()"

# Check logs
docker-compose logs api
docker-compose logs worker
```

### Frontend not loading

```bash
# Check web container
docker-compose logs web

# Rebuild frontend
docker-compose restart web
```

## Development Workflow

### Watch logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
```

### Access database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U tipping -d tipping_aggregator

# Sample queries
SELECT * FROM leagues;
SELECT * FROM providers WHERE enabled = true;
SELECT COUNT(*) FROM matches;
SELECT COUNT(*) FROM market_snapshots;
```

### Run tests

```bash
# Run all tests
docker-compose exec api pytest tests/ -v

# Run specific test file
docker-compose exec api pytest tests/test_odds_utils.py -v

# Run with coverage
docker-compose exec api pytest tests/ --cov=services --cov-report=html
```

### Reset database

```bash
# WARNING: This deletes all data
docker-compose down -v
docker-compose up -d
docker-compose exec api python seed_data.py
```

## Production Checklist

Before deploying to production:

- [ ] Change `ADMIN_PASSWORD` to strong password
- [ ] Use production PostgreSQL instance
- [ ] Use production Redis instance
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure proper logging
- [ ] Set up monitoring/alerting
- [ ] Configure backup strategy
- [ ] Use Alembic migrations (not auto-create)
- [ ] Set up SSL/TLS
- [ ] Configure CORS for your domain
- [ ] Use secrets manager for API keys
- [ ] Set up CI/CD pipeline
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry, etc.)

## Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (data)
docker-compose down -v

# View container status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Execute command in container
docker-compose exec [service-name] [command]

# Rebuild specific service
docker-compose build [service-name]

# Restart service
docker-compose restart [service-name]

# Scale workers (if needed)
docker-compose up -d --scale worker=3
```

## Next Steps

1. Review [README.md](README.md) for architecture details
2. Read [PROVIDERS.md](PROVIDERS.md) for adding new providers
3. Check API documentation at http://localhost:8000/docs
4. Explore the frontend at http://localhost:3000
5. Monitor background jobs via Celery logs

## Support

- Check logs first: `docker-compose logs`
- Review environment variables: `.env`
- Verify API key is valid
- Ensure Docker has enough resources (4GB+ RAM recommended)
- Check network connectivity for API calls
