from __future__ import annotations

import asyncio
import statistics
from typing import Dict, Optional

_metrics_lock = asyncio.Lock()
_metrics: Dict[str, object] = {
    "active_connections": 0,
    "dropped_clients": 0,
    "total_connections": 0,
    "connections_closed": 0,
    "active_events_sent": 0,
    "per_user_streams": {},  # user_sub -> count
    "durations": [],  # connection durations
}

# per-user max streams config
import os

MAX_STREAMS_PER_USER = int(os.environ.get("MAX_STREAMS_PER_USER", "5"))


async def _modify(key: str, delta: int = 1):
    async with _metrics_lock:
        if key not in _metrics:
            _metrics[key] = 0
        _metrics[key] = int(_metrics.get(key, 0)) + delta


def metrics_inc(key: str, delta: int = 1):
    # fire-and-forget safe wrapper
    try:
        import asyncio

        asyncio.create_task(_modify(key, delta))
    except Exception:
        # fallback to synchronous change (rare)
        pass


def metrics_dec(key: str, delta: int = 1):
    metrics_inc(key, -delta)


def metrics_get() -> Dict:
    # Return snapshot copy (synchronous)
    import copy

    return copy.deepcopy(_metrics)


# per-user stream acquire/release (async)
async def user_stream_acquire(user_sub: str) -> bool:
    async with _metrics_lock:
        per = _metrics.setdefault("per_user_streams", {})
        count = int(per.get(user_sub, 0))
        if count >= MAX_STREAMS_PER_USER:
            return False
        per[user_sub] = count + 1
        # increment global metrics
        _metrics["active_connections"] = int(_metrics.get("active_connections", 0)) + 1
        _metrics["total_connections"] = int(_metrics.get("total_connections", 0)) + 1
        return True


async def user_stream_release(user_sub: str) -> None:
    async with _metrics_lock:
        per = _metrics.setdefault("per_user_streams", {})
        count = int(per.get(user_sub, 0))
        if count > 0:
            per[user_sub] = count - 1
        _metrics["active_connections"] = max(0, int(_metrics.get("active_connections", 0)) - 1)


def increment_dropped_client(reason: Optional[str] = None):
    try:
        import asyncio

        async def _inc():
            async with _metrics_lock:
                _metrics["dropped_clients"] = int(_metrics.get("dropped_clients", 0)) + 1
                if reason:
                    by_reason = _metrics.setdefault("drop_reasons", {})
                    by_reason[reason] = by_reason.get(reason, 0) + 1

        asyncio.create_task(_inc())
    except Exception:
        pass


def summary() -> Dict:
    s = metrics_get()
    # compute avg duration
    durations = s.get("durations", [])
    avg = None
    if durations:
        try:
            avg = statistics.mean(durations)
        except Exception:
            avg = None
    s["avg_duration"] = avg
    return s
