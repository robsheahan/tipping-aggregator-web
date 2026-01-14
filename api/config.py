"""Application configuration."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # Database
    database_url: str = "postgresql://tipping:tipping_dev@localhost:5432/tipping_aggregator"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # API Keys
    theoddsapi_key: Optional[str] = None
    polymarket_rpc_url: str = "https://polygon-rpc.com"

    # Admin
    admin_password: str = "admin123"

    # Environment
    environment: str = "development"

    # Polling configuration
    polling_default_interval: int = 900  # 15 minutes in seconds
    polling_near_kickoff_threshold: int = 120  # 2 hours in minutes
    polling_near_interval: int = 300  # 5 minutes in seconds
    polling_final_threshold: int = 30  # 30 minutes before kickoff
    polling_final_interval: int = 60  # 1 minute in seconds

    # Weighting configuration
    min_samples_for_weight: int = 10  # Minimum matches before provider weight is significant
    weight_floor: float = 0.05  # Minimum weight (5%)
    weight_ceiling: float = 0.50  # Maximum weight (50%)
    performance_window_days: int = 90  # Rolling window for performance evaluation
    time_decay_halflife_days: int = 30  # Exponential decay for historical performance

    # Aggregation configuration
    snapshot_freshness_minutes: int = 30  # Max age of snapshot to include in aggregation

    # Rate limiting
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
