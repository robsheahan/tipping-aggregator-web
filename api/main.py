"""FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from routers import leagues, matches, providers, weights
from database import engine, Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Create tables (in production, use Alembic migrations)
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Tipping Aggregator API",
    description="Aggregate sports tipping probabilities from multiple providers",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(leagues.router)
app.include_router(matches.router)
app.include_router(providers.router)
app.include_router(weights.router)


@app.get("/")
def read_root():
    """Root endpoint."""
    return {
        "message": "Tipping Aggregator API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
