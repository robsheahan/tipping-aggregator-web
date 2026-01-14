# Tipping Aggregator MVP

A production-ready sports tipping aggregator that continuously ingests match odds from multiple providers, evaluates their historical accuracy, and produces aggregated win probabilities with dynamic weighting.

## Features

- **Multi-Sport Support**: English Premier League (EPL), AFL, NRL with expandable architecture
- **Provider Plugin System**: Easily add new odds providers via abstract base class
- **Dynamic Weighting**: Continuously updates provider weights based on historical accuracy using proper scoring rules (Brier score, log loss)
- **Intelligent Polling**: Increases polling frequency as match kickoff approaches (15 min → 5 min → 1 min)
- **Time Series Storage**: Audit trail of all odds snapshots for backtesting
- **Responsive Dashboard**: Next.js frontend with probability charts and match cards
- **Admin Panel**: Monitor provider health and weights

## Architecture

### Backend (Python FastAPI)
- **API**: RESTful endpoints for matches, leagues, providers, weights
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Background Jobs**: Celery with Redis for scheduled tasks
- **Providers**: TheOddsAPI (working), Polymarket (stub), Bet365 (stub)

### Frontend (Next.js + TypeScript)
- **Dashboard**: Upcoming matches with aggregated probabilities
- **Match Detail**: Historical probability charts (Recharts)
- **Admin**: Provider health monitoring and weight visualization

### Services
- **Odds Utilities**: Convert odds to probabilities, remove vig, normalize
- **Scoring**: Brier score, log loss with time-decay weighting
- **Weighting**: Softmax and inverse weighting with constraints (floor/ceiling)
- **Aggregation**: Weighted probability combination with freshness filtering

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Celery, Redis
- **Database**: PostgreSQL 15
- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS, Recharts
- **Infrastructure**: Docker Compose for local development

## Getting Started

### Prerequisites

- Docker and Docker Compose
- TheOddsAPI key (get free key at https://the-odds-api.com/)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tipping-aggregator
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your API keys:
```env
THEODDSAPI_KEY=your_key_here
ADMIN_PASSWORD=your_admin_password
```

4. Start services:
```bash
docker-compose up -d
```

5. Wait for services to initialize (~30 seconds)

6. Seed initial data (leagues and providers):
```bash
docker-compose exec api python seed_data.py
```

7. Create database tables:
```bash
docker-compose exec api alembic upgrade head
```

8. Access the application:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Manual Data Population

To fetch fixtures and odds:

```bash
# Fetch upcoming matches
docker-compose exec api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()"

# Poll odds for upcoming matches
docker-compose exec api python -c "from tasks.odds_polling import poll_upcoming_matches; poll_upcoming_matches()"
```

## Configuration

Key settings in `api/config.py`:

- **Polling intervals**: Adjust frequency based on time to kickoff
- **Weighting parameters**: Min samples, weight floor/ceiling, decay halflife
- **Performance window**: Rolling window for accuracy evaluation (default 90 days)
- **Freshness threshold**: Max age of snapshots to include (default 30 minutes)

## API Endpoints

### Matches
- `GET /matches` - List matches with aggregated probabilities
  - Query params: `league`, `from_date`, `to_date`, `upcoming_only`
- `GET /matches/{id}` - Match detail with aggregated data
- `GET /matches/{id}/snapshots` - Historical odds snapshots

### Leagues
- `GET /leagues` - List all leagues
- `GET /leagues/{id}` - League detail

### Providers
- `GET /providers` - List all providers
- `GET /providers/health` - Check provider health (admin auth required)
- `GET /providers/{id}/performance` - Provider accuracy metrics

### Weights
- `GET /weights` - Provider weights by league/market
  - Query params: `league`, `market_type`

## Background Jobs

Scheduled tasks (Celery Beat):

- **Fetch fixtures**: Daily at 2 AM UTC
- **Poll odds**: Every 5 minutes (dynamic based on kickoff proximity)
- **Ingest results**: Every 15 minutes for finished matches
- **Update performance**: Daily at 3 AM UTC
- **Update weights**: Daily at 4 AM UTC

## Testing

Run unit tests:

```bash
cd api
pytest tests/ -v
```

Tests cover:
- Odds conversion and normalization
- Proper scoring rules (Brier, log loss)
- Weighting algorithms with constraints
- Probability aggregation

## Provider Integration

See [PROVIDERS.md](PROVIDERS.md) for detailed compliance guidelines and integration instructions.

### Adding a New Provider

1. Create provider class in `api/providers/`:

```python
from providers.base import BaseProvider, ProviderSnapshot

class NewProvider(BaseProvider):
    async def fetch_matches(self, sport, league):
        # Implement fixture fetching
        pass

    async def fetch_odds(self, match_external_id, sport):
        # Implement odds fetching
        pass

    async def health_check(self):
        # Implement health check
        pass
```

2. Add provider to database:

```python
provider = Provider(
    name="NewProvider",
    type=ProviderType.BOOKMAKER,
    enabled=True
)
```

3. Update tasks to use new provider.

## Data Model

Key entities:

- **League**: Sport, code, country
- **Team**: Name, league relationship
- **Match**: Teams, kickoff time, status, external IDs
- **Provider**: Name, type, enabled status
- **MarketSnapshot**: Match, provider, probabilities, timestamp
- **Result**: Final score and outcome
- **ProviderPerformance**: Brier score, log loss, sample size
- **ProviderWeight**: Dynamic weight by league/market

## Compliance & Legal

- **NO web scraping** or ToS violations
- Only use official APIs or licensed data feeds
- Rate limiting and caching implemented
- See [PROVIDERS.md](PROVIDERS.md) for full compliance guidelines

## Development

### File Structure

```
tipping-aggregator/
├── api/              # FastAPI backend
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   ├── routers/      # API endpoints
│   ├── services/     # Business logic
│   ├── providers/    # Provider plugins
│   ├── tasks/        # Celery tasks
│   └── migrations/   # Alembic migrations
├── web/              # Next.js frontend
│   └── src/
│       ├── app/      # Pages
│       ├── components/ # React components
│       └── lib/      # API client
├── tests/            # Unit tests
└── docker-compose.yml
```

### Code Quality

- **Linting**: ruff for Python, ESLint for TypeScript
- **Formatting**: black for Python
- **Type hints**: Throughout Python codebase
- **Logging**: Structured logging with appropriate levels

## Production Deployment

For production:

1. Use separate Alembic migrations (don't auto-create tables)
2. Set `ENVIRONMENT=production`
3. Use proper secret management (not .env files)
4. Configure CORS for your domain
5. Use production-grade PostgreSQL and Redis instances
6. Set up monitoring and alerting
7. Implement proper backup strategy
8. Use Nginx reverse proxy with SSL

## Troubleshooting

### Services won't start

```bash
docker-compose down
docker-compose up --build
```

### Database connection errors

Ensure PostgreSQL is healthy:
```bash
docker-compose ps
docker-compose logs postgres
```

### No odds data appearing

Check Celery workers:
```bash
docker-compose logs worker
docker-compose logs beat
```

Verify API key:
```bash
docker-compose exec api python -c "from config import settings; print(settings.theoddsapi_key)"
```

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run tests and linting
5. Submit a pull request

## Support

For issues or questions:
- Create an issue on GitHub
- Review existing documentation
- Check logs for error details

## Roadmap

Future enhancements:
- Additional sports (NBA, NFL, MLB)
- More provider integrations
- Machine learning models
- User accounts and portfolios
- Performance analytics dashboard
- Mobile app
- WebSocket real-time updates
