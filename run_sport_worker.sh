#!/bin/bash
# AFL/NRL Sport Aggregator — daily cron job
# Runs at 0:00 UTC (10:00 AEST) via crontab

set -e

PROJECT_DIR="/Users/rob/tipping-aggregator"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="$PROJECT_DIR/venv"
LOG_DIR="$BACKEND_DIR/logs"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Activate virtual environment
if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
fi

# Run the sport aggregator
cd "$BACKEND_DIR"
python workers/sport_aggregator.py --once

# Submit consensus tips to tipping platforms
python workers/tip_submitter.py --once
