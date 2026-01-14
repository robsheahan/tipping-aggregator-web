"""Celery application configuration."""
from celery import Celery
from celery.schedules import crontab
from config import settings

# Initialize Celery
celery_app = Celery(
    "tipping_aggregator",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "tasks.fixtures",
        "tasks.odds_polling",
        "tasks.results",
        "tasks.performance",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes
    task_soft_time_limit=540,  # 9 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Periodic task schedule
celery_app.conf.beat_schedule = {
    # Fetch fixtures daily at 2 AM UTC
    "fetch-fixtures-daily": {
        "task": "tasks.fixtures.fetch_all_fixtures",
        "schedule": crontab(hour=2, minute=0),
    },
    # Poll odds every 5 minutes
    "poll-odds-regular": {
        "task": "tasks.odds_polling.poll_upcoming_matches",
        "schedule": 300.0,  # 5 minutes
    },
    # Check for finished matches every 15 minutes
    "ingest-results": {
        "task": "tasks.results.ingest_finished_match_results",
        "schedule": 900.0,  # 15 minutes
    },
    # Update provider performance daily at 3 AM UTC
    "update-performance-daily": {
        "task": "tasks.performance.update_all_provider_performance",
        "schedule": crontab(hour=3, minute=0),
    },
    # Update weights daily at 4 AM UTC
    "update-weights-daily": {
        "task": "tasks.performance.update_all_provider_weights",
        "schedule": crontab(hour=4, minute=0),
    },
}
