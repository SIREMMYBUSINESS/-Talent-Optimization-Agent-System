"""
Rate limiting middleware using Redis for distributed rate limiting.
Falls back to in-memory limiting if Redis is unavailable.
"""
from __future__ import annotations

import asyncio
import time
from typing import Dict, Optional

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from src.limits.redis_limiter import check_rate_limit as redis_check_rate_limit

_local_rate_limits: Dict[str, list] = {}
_local_lock = asyncio.Lock()


DEFAULT_RATE_LIMIT = 100
DEFAULT_WINDOW = 60


async def check_rate_limit_local(key: str, limit: int, window: int) -> bool:
    """
    In-memory rate limiter fallback.
    Returns True if request is allowed, False if rate limit exceeded.
    """
    async with _local_lock:
        now = time.time()
        if key not in _local_rate_limits:
            _local_rate_limits[key] = []

        _local_rate_limits[key] = [ts for ts in _local_rate_limits[key] if now - ts < window]

        if len(_local_rate_limits[key]) >= limit:
            return False

        _local_rate_limits[key].append(now)
        return True


async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware that checks requests against configured limits.
    Uses Redis if available, falls back to in-memory.
    """
    path = request.url.path

    if path in ["/health", "/docs", "/openapi.json", "/redoc"]:
        return await call_next(request)

    client_id = request.client.host if request.client else "unknown"

    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ", 1)[1]
            from src.auth.jwks_middleware import _decode_jwt
            payload = await _decode_jwt(token)
            user_id = payload.get("sub", "")
            if user_id:
                client_id = f"user:{user_id}"
        except Exception:
            pass

    rate_limit_key = f"rate_limit:{client_id}"
    limit = DEFAULT_RATE_LIMIT
    window = DEFAULT_WINDOW

    try:
        allowed = await redis_check_rate_limit(rate_limit_key, limit, window)
    except Exception:
        allowed = await check_rate_limit_local(rate_limit_key, limit, window)

    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please try again later."}
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Window"] = str(window)

    return response
