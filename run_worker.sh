#!/bin/bash

# Load environment variables from .env file
set -a
source .env
set +a

# Activate virtual environment
source venv/bin/activate

# Run the worker
cd backend
python workers/aggregator.py --once
