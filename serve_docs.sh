#!/bin/bash

# Simple script to serve the documentation website locally

echo "🌐 Starting documentation server..."
echo ""
echo "Opening http://localhost:8080 in your browser..."
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    python -m http.server 8080
else
    echo "Error: Python not found. Please install Python to serve the docs."
    exit 1
fi
