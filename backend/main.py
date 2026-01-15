"""
FastAPI Backend for Tipping Aggregator
Provides API endpoints for racing data, consensus scores, and affiliate tracking
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager
from loguru import logger
import os

from api.races import router as races_router
from api.consensus import router as consensus_router
from api.affiliates import router as affiliates_router
from utils.database import init_database

# Configure logging
logger.add("logs/api.log", rotation="500 MB", retention="10 days", level="INFO")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting Tipping Aggregator API...")
    await init_database()
    logger.info("Database initialized")

    yield

    # Shutdown
    logger.info("Shutting down API...")

# Initialize FastAPI app
app = FastAPI(
    title="Tipping Aggregator API",
    description="Australian Horse Racing Odds Aggregator with AI Consensus Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tipping-aggregator-web.vercel.app",
        os.getenv("NEXT_PUBLIC_APP_URL", "")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(races_router, prefix="/api/races", tags=["races"])
app.include_router(consensus_router, prefix="/api/consensus", tags=["consensus"])
app.include_router(affiliates_router, prefix="/api/affiliates", tags=["affiliates"])

@app.get("/")
async def root():
    """
    Root endpoint - API status
    """
    return {
        "service": "Tipping Aggregator API",
        "status": "operational",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}

@app.get("/go/{bookmaker}")
async def affiliate_redirect(bookmaker: str, request: Request):
    """
    Affiliate redirect endpoint
    Example: /go/sportsbet?race_id=123&runner=5
    """
    from api.affiliates import generate_affiliate_redirect

    race_id = request.query_params.get("race_id")
    runner_number = request.query_params.get("runner")

    if not race_id or not runner_number:
        raise HTTPException(status_code=400, detail="Missing race_id or runner parameter")

    redirect_url = await generate_affiliate_redirect(
        bookmaker=bookmaker,
        race_id=race_id,
        runner_number=int(runner_number)
    )

    # Log the click for analytics
    logger.info(f"Affiliate click: {bookmaker} - Race {race_id} - Runner {runner_number}")

    return RedirectResponse(url=redirect_url, status_code=307)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
