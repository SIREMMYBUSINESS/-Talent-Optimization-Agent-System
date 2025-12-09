"""
Redis-backed limiter utilities.

Provides:
- rate_limit_check(key, limit, period): simple per-key rate limiter using INCR+EXPIRE
- user_slot_acquire(user_key, max_slots, slot_ttl): atomic acquire (returns True/False)
- user_slot_release(user_key): decrement slot count

Atomic slot acquire uses an EVAL Lua script to ensure check+increment is atomic.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from src.utils.redis_client import RedisClient

redis_client = RedisClient()  # will read REDIS_URL from env when first used


async def rate_limit_check(key: str, limit: int = 5, period: int = 60) -> bool:
    """
    Simple rate limit: increment a counter and set expiry the first time.
    Returns True if the caller is allowed (count <= limit), False otherwise.
    """
    try:
        r = await redis_client.get_client()
        # Use INCR; if value == 1 then set TTL
        val = await r.incr(key)
        if val == 1:
            await r.expire(key, period)
        return int(val) <= int(limit)
    except Exception:
        # On Redis error, default to allow (fail open)
        return True


# Lua script for atomic acquire:
# KEYS[1] = key
# ARGV[1] = limit
# ARGV[2] = ttl_seconds
# if (current == nil or tonumber(current) < tonumber(limit)) then
#    local v = redis.call("INCR", KEYS[1])
#    if tonumber(redis.call("TTL", KEYS[1])) < 0 then redis.call("EXPIRE", KEYS[1], ARGV[2]) end
#    if tonumber(v) <= tonumber(ARGV[1]) then return 1 else return 0 end
# else
#    return 0
# end
_SLOT_ACQUIRE_SCRIPT = """
local current = redis.call('GET', KEYS[1])
if (not current) or (tonumber(current) < tonumber(ARGV[1])) then
  local v = redis.call('INCR', KEYS[1])
  if tonumber(redis.call('TTL', KEYS[1])) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
  if tonumber(v) <= tonumber(ARGV[1]) then
    return 1
  else
    return 0
  end
end
return 0
"""

async def user_slot_acquire(user_key: str, max_slots: int = 5, slot_ttl: int = 3600) -> bool:
    """
    Attempt to acquire a stream slot for user_key. Returns True if acquired, False if limit reached.
    """
    try:
        res = await redis_client.eval(_SLOT_ACQUIRE_SCRIPT, [user_key], [str(max_slots), str(slot_ttl)])
        return int(res) == 1
    except Exception:
        # fail-open: allow connection if Redis is down
        return True


async def user_slot_release(user_key: str) -> None:
    """
    Release a previously acquired slot (decrement counter, min 0).
    """
    try:
        r = await redis_client.get_client()
        # Use DECR but guard against negative
        val = await r.decr(user_key)
        if int(val) < 0:
            await r.set(user_key, 0)
    except Exception:
        # ignore errors
        pass


check_rate_limit = rate_limit_check
