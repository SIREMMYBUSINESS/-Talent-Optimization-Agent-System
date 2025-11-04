"""
Updated SSE event generator to use Redis-backed slot acquire/release and metrics.

Behavior:
 - If REDIS_URL configured, use RedisLimiter.user_slot_acquire / user_slot_release
   and redis_metrics to increment counters centrally.
 - If Redis is not available, fall back to in-process counters (previous behavior).
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import AsyncGenerator, Optional

from fastapi import HTTPException, status

from src.utils.audit_logger import AuditLogger
from src.auth.jwks_middleware import _decode_jwt
from src.limits.redis_limiter import user_slot_acquire, user_slot_release
from src.utils.redis_metrics import hincrby, get_metrics as redis_get_metrics

# fallback in-memory counters (kept for when REDIS_URL not configured)
_local_active_connections = 0
_local_lock = asyncio.Lock()


DEFAULT_INACTIVITY_TTL = int(__import__("os").environ.get("SSE_INACTIVITY_TTL", "60"))  # seconds


async def event_generator(audit_logger: AuditLogger, token: Optional[str] = None, inactivity_ttl: int = DEFAULT_INACTIVITY_TTL) -> AsyncGenerator[bytes, None]:
    user_sub = None
    acquired = False
    start = time.time()
    try:
        token_ttl = None
        if token:
            try:
                payload = await _decode_jwt(token)
            except HTTPException as exc:
                raise exc
            user_sub = payload.get("sub")
            exp = payload.get("exp")
            if exp is None or int(exp - time.time()) <= 0:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or missing exp")

            token_ttl = int(exp - time.time())
            # Attempt to acquire Redis-backed slot (best-effort)
            try:
                acquired = await user_slot_acquire(f"streams:{user_sub}", max_slots=int(__import__("os").environ.get("MAX_STREAMS_PER_USER", "5")), slot_ttl=int(__import__("os").environ.get("STREAM_SLOT_TTL", "3600")))
                if not acquired:
                    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many concurrent streams for user")
                # increment global metric (redis)
                try:
                    await hincrby("active_connections", 1)
                    await hincrby("total_connections", 1)
                except Exception:
                    # ignore metric errors
                    pass
            except HTTPException:
                raise
            except Exception:
                # Redis unavailable: fallback to local counter
                async with _local_lock:
                    global _local_active_connections
                    _local_active_connections += 1
        else:
            # anonymous connections: increment local/global metrics if desired
            try:
                await hincrby("active_connections", 1)
                await hincrby("total_connections", 1)
            except Exception:
                async with _local_lock:
                    _local_active_connections += 1

        gen = audit_logger.subscribe()
        while True:
            # recompute remaining ttl and set timeout
            timeout_candidates = []
            if token_ttl is not None:
                # recompute actual remaining time
                token_ttl = int((payload.get("exp") or 0) - time.time())
                if token_ttl <= 0:
                    # token expired
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
                timeout_candidates.append(token_ttl)
            if inactivity_ttl:
                timeout_candidates.append(inactivity_ttl)
            timeout = min(timeout_candidates) if timeout_candidates else None

            try:
                if timeout:
                    item = await asyncio.wait_for(gen.__anext__(), timeout=timeout)
                else:
                    item = await gen.__anext__()
            except asyncio.TimeoutError:
                # either inactivity or token expiry
                # increment dropped metrics
                try:
                    await hincrby("dropped_clients", 1)
                except Exception:
                    pass
                break
            except StopAsyncIteration:
                break
            except Exception:
                try:
                    await hincrby("dropped_clients", 1)
                except Exception:
                    pass
                break

            try:
                payload_json = json.dumps(item, ensure_ascii=False)
            except Exception:
                payload_json = json.dumps({"error": "serialization_error"})
            # metrics
            try:
                await hincrby("events_sent", 1)
            except Exception:
                pass

            yield f"data: {payload_json}\n\n".encode("utf-8")
    finally:
        # release per-user slot and decrement active counters
        try:
            if acquired and user_sub:
                await user_slot_release(f"streams:{user_sub}")
            try:
                await hincrby("active_connections", -1)
            except Exception:
                async with _local_lock:
                    global _local_active_connections
                    if _local_active_connections > 0:
                        _local_active_connections -= 1
        except Exception:
            pass
