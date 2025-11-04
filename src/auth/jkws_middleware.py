"""
JWKS middleware: fetch JWKS from Auth0, cache keys, and provide FastAPI dependencies
to verify RS256 tokens dynamically using the JWKS set.

Configuration via environment variables:
  AUTH0_DOMAIN   - e.g. 'your-tenant.auth0.com'
  AUTH0_AUDIENCE - expected audience in tokens
  JWKS_CACHE_TTL - seconds to cache JWKS (default 300)

Usage:
  from src.auth.jwks_middleware import get_current_user, require_roles, jwks_client
  app dependency: Depends(require_roles("admin"))
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any, Dict, Optional

import httpx
import jwt  # PyJWT
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN", "")
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE", "")
JWKS_CACHE_TTL = int(os.environ.get("JWKS_CACHE_TTL", "300"))

oauth2_scheme = HTTPBearer(auto_error=False)


class JWKSClient:
    def __init__(self, domain: Optional[str] = None, audience: Optional[str] = None, ttl: int = JWKS_CACHE_TTL):
        self.domain = domain or AUTH0_DOMAIN
        self.audience = audience or AUTH0_AUDIENCE
        self.ttl = ttl
        self._jwks: Optional[Dict[str, Any]] = None
        self._keys_by_kid: Dict[str, Dict[str, Any]] = {}
        self._last_refresh: float = 0.0
        self._lock = asyncio.Lock()
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if not self._client:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    def jwks_url(self) -> str:
        if not self.domain:
            raise RuntimeError("AUTH0_DOMAIN not configured")
        return f"https://{self.domain.rstrip('/')}/.well-known/jwks.json"

    async def _fetch_jwks(self) -> Dict[str, Any]:
        """
        Fetch JWKS from the issuer. This method can be monkeypatched in tests.
        """
        url = self.jwks_url()
        client = await self._get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()

    async def ensure_keys(self) -> None:
        """Ensure keys are loaded and within TTL."""
        now = time.time()
        if self._jwks and (now - self._last_refresh) < self.ttl:
            return
        async with self._lock:
            # double-check after acquiring lock
            now = time.time()
            if self._jwks and (now - self._last_refresh) < self.ttl:
                return
            try:
                jwks = await self._fetch_jwks()
                self._jwks = jwks
                self._keys_by_kid = {k.get("kid"): k for k in jwks.get("keys", []) if k.get("kid")}
                self._last_refresh = time.time()
            except Exception:
                # If fetch fails and keys exist, keep them until TTL expires.
                if not self._jwks:
                    raise

    async def get_signing_key(self, kid: str):
        """Return a PEM-compatible public key for the given kid."""
        await self.ensure_keys()
        jwk = self._keys_by_kid.get(kid)
        if not jwk:
            # Try a refresh once if kid not found
            async with self._lock:
                # force a refresh
                self._last_refresh = 0
                await self.ensure_keys()
                jwk = self._keys_by_kid.get(kid)
            if not jwk:
                raise KeyError(f"No key found for kid={kid}")
        # Convert JWK to PEM public key via PyJWT helper
        return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))

    def status(self) -> Dict[str, Any]:
        return {
            "configured": bool(self.domain),
            "last_refresh": self._last_refresh,
            "cached_keys": list(self._keys_by_kid.keys()),
            "cache_ttl": self.ttl,
        }


# shared client instance for the app to reuse
jwks_client = JWKSClient()


async def _decode_jwt(token: str) -> Dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header")
    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing kid header")
    try:
        key = await jwks_client.get_signing_key(kid)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"JWKS fetch error: {str(exc)}")
    # Verify token
    try:
        payload = jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            audience=self_aud() if self_aud() else None,
            issuer=f"https://{jwks_client.domain}/" if jwks_client.domain else None,
            options={"require": ["exp", "iat", "aud", "iss"]} if (jwks_client.domain and self_aud()) else {"require": ["exp", "iat"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid audience")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid issuer")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def self_aud() -> Optional[str]:
    return jwks_client.audience or None


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(oauth2_scheme)) -> Dict[str, Any]:
    """
    FastAPI dependency that validates Authorization: Bearer <token> using JWKS.
    Returns token payload dict on success or raises HTTPException(401) on failure.
    """
    if not credentials or not credentials.scheme or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization credentials")
    token = credentials.credentials
    return await _decode_jwt(token)


def require_roles(*accepted_roles: str):
    """
    Dependency factory: ensure current user has at least one role from accepted_roles.
    Assumes token payload contains "roles" claim as list or string.
    """
    async def _dependency(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_roles = set([r.lower() for r in (user.get("roles") or [])]) if user else set()
        needed = set([r.lower() for r in accepted_roles])
        if not (user_roles & needed):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user
    return _dependency
