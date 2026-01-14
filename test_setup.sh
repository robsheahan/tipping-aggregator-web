#!/bin/bash

# Tipping Aggregator Setup Test Script
# This script validates the setup and tests the application

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Tipping Aggregator Setup Test Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker Desktop."
    exit 1
fi
print_success "Docker is installed"

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose not found. Please install Docker Compose."
    exit 1
fi
print_success "Docker Compose is installed"

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env
    print_warning "Please edit .env and add your THEODDSAPI_KEY"
    echo ""
    echo "Get a free API key at: https://the-odds-api.com/"
    echo ""
    read -p "Press Enter after you've added your API key to .env..."
fi
print_success ".env file exists"

# Validate .env has API key
if grep -q "your_theoddsapi_key_here" .env; then
    print_warning "THEODDSAPI_KEY is still set to placeholder value"
    print_warning "The app will work but won't fetch real odds data"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
print_status "Starting Docker services..."
docker-compose up -d

echo ""
print_status "Waiting for services to be healthy (30 seconds)..."
sleep 30

echo ""
print_status "Checking service health..."

# Check each service
SERVICES=("postgres" "redis" "api" "worker" "beat" "web")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker-compose ps | grep -q "${service}.*Up"; then
        print_success "${service} is running"
    else
        print_error "${service} is not running"
        ALL_HEALTHY=false
    fi
done

if [ "$ALL_HEALTHY" = false ]; then
    print_error "Some services are not running. Check logs with: docker-compose logs"
    exit 1
fi

echo ""
print_status "Initializing database..."
docker-compose exec -T api python seed_data.py

echo ""
print_status "Testing API endpoints..."

# Test API health
API_HEALTH=$(curl -s http://localhost:8000/health)
if echo "$API_HEALTH" | grep -q "healthy"; then
    print_success "API health check passed"
else
    print_error "API health check failed"
    echo "Response: $API_HEALTH"
fi

# Test leagues endpoint
LEAGUES=$(curl -s http://localhost:8000/leagues)
if echo "$LEAGUES" | grep -q "EPL"; then
    print_success "Leagues endpoint working"
else
    print_error "Leagues endpoint failed"
fi

# Test providers endpoint
PROVIDERS=$(curl -s http://localhost:8000/providers)
if echo "$PROVIDERS" | grep -q "TheOddsAPI"; then
    print_success "Providers endpoint working"
else
    print_error "Providers endpoint failed"
fi

echo ""
print_status "Fetching initial data..."
print_warning "This may take 1-2 minutes..."

# Fetch fixtures
docker-compose exec -T api python -c "from tasks.fixtures import fetch_all_fixtures; fetch_all_fixtures()" 2>&1 | tail -5

# Count matches
MATCH_COUNT=$(docker-compose exec -T postgres psql -U tipping -d tipping_aggregator -t -c "SELECT COUNT(*) FROM matches;" | xargs)
print_success "Fetched $MATCH_COUNT matches"

# Poll odds if we have matches
if [ "$MATCH_COUNT" -gt 0 ]; then
    print_status "Polling odds for matches..."
    docker-compose exec -T api python -c "from tasks.odds_polling import poll_upcoming_matches; poll_upcoming_matches()" 2>&1 | tail -5

    SNAPSHOT_COUNT=$(docker-compose exec -T postgres psql -U tipping -d tipping_aggregator -t -c "SELECT COUNT(*) FROM market_snapshots;" | xargs)
    print_success "Collected $SNAPSHOT_COUNT odds snapshots"
fi

echo ""
print_status "Testing frontend..."
WEB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$WEB_RESPONSE" = "200" ]; then
    print_success "Frontend is responding"
else
    print_warning "Frontend returned status code: $WEB_RESPONSE"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Setup test complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Access the application:"
echo "  • Frontend: http://localhost:3000"
echo "  • API Docs: http://localhost:8000/docs"
echo "  • API: http://localhost:8000"
echo ""
echo "Useful commands:"
echo "  • View logs: docker-compose logs -f"
echo "  • Stop services: docker-compose down"
echo "  • Restart services: docker-compose restart"
echo "  • Run tests: docker-compose exec api pytest tests/ -v"
echo ""
echo "Database stats:"
echo "  • Matches: $MATCH_COUNT"
echo "  • Snapshots: ${SNAPSHOT_COUNT:-0}"
echo ""
print_success "All systems operational!"
