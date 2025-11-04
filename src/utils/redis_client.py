"""
Async Redis client helpers using aioredis.

Provides a small convenience wrapper for common Redis ops used by the limiter and metrics modules.
"""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

import aioredis


class RedisClient:
    def __init__(self, url: Optional[str] = None) -> None:
        self.url = url or os.environ.get("REDIS_URL", "")
        self._client: Optional[aioredis.Redis] = None

    async def get_client(self) -> aioredis.Redis:
        if self._client is None:
            if not self.url:
                raise RuntimeError("REDIS_URL not configured")
            self._client = aioredis.from_url(self.url, encoding="utf-8", decode_responses=True)
        return self._client

    async def incr(self, key: str) -> int:
        c = await (await self.get_client()).incr(key)
        return int(c)

    async def get(self, key: str) -> Optional[str]:
        return await (await self.get_client()).get(key)

    async def setex(self, key: str, value: Any, expire: int) -> None:
        await (await self.get_client()).set(key, value, ex=expire)

    async def expire(self, key: str, seconds: int) -> None:
        await (await self.get_client()).expire(key, seconds)

    async def hincrby(self, name: str, key: str, amount: int = 1) -> int:
        return int(await (await self.get_client()).hincrby(name, key, amount))

    async def hgetall(self, name: str) -> Dict[str, str]:
        return await (await self.get_client()).hgetall(name)

    async def decr(self, key: str) -> int:
        return int(await (await self.get_client()).decr(key))

    async def eval(self, script: str, keys: list, args: list) -> Any:
        """
        Evaluate a Lua script.

        Returns whatever the script returns; use this for atomic operations.
        """
        return await (await self.get_client()).eval(script, len(keys), *(keys + args))

    async def close(self) -> None:
        if self._client:
            try:
                await self._client.close()
            except Exception:
                pass
            self._client = None
