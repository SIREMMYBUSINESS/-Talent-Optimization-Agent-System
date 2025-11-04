"""
Redis-backed metrics aggregation helpers.

Stores counters in a Redis hash named 'talent_metrics' for central aggregation.
If REDIS_URL is not configured, functions raise and callers should fallback to local metrics.
"""
from __future__ import annotations

from typing import Dict, Optional
import os

from src.utils.redis_client import RedisClient

REDIS_METRICS_KEY = "talent_metrics"
_redis = RedisClient(os.environ.get("REDIS_URL")) if os.environ.get("REDIS_URL") else None


async def hincrby(field: str, amount: int = 1) -> None:
    """
    Increment a metrics hash field.
    """
    if not _redis:
        raise RuntimeError("REDIS_URL not configured")
    try:
        await _redis.hincrby(REDIS_METRICS_KEY, field, amount)
    except Exception:
        # best-effort
        pass


async def get_metrics() -> Dict[str, str]:
    """
    Return the metrics hash as a dict of strings (values are strings in Redis).
    """
    if not _redis:
        raise RuntimeError("REDIS_URL not configured")
    try:
        return await _redis.hgetall(REDIS_METRICS_KEY)
    except Exception:
        return {}
