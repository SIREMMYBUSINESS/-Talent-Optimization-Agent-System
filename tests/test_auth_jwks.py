"""
Tests for JWKS-based authentication. This test:
 - generates an RSA keypair
 - builds a JWK for the public key and places it in a JWKS JSON
 - monkeypatches JWKSClient._fetch_jwks to return the JWKS (avoids network)
 - signs tokens with the private key (RS256) including 'roles' and 'aud' claims
 - exercises protected endpoints to validate role-based access
"""
import json
import base64
from typing import Dict
import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

from src.auth import jwks_middleware as jwks_mod  # noqa: E402
from src.auth.jwks_middleware import jwks_client

from src.main import app  # ensure app imported after jwks is accessible


def base64url_uint(val: int) -> str:
    """
    Encode integer as base64url (no padding) per JWK spec.
    """
    byte_length = (val.bit_length() + 7) // 8
    b = val.to_bytes(byte_length or 1, "big")
    s = base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")
    return s


@pytest.mark.asyncio
async def test_jwks_auth_success(monkeypatch, async_client):
    # generate rsa keypair
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub = priv.public_key()
    numbers = pub.public_numbers()
    kid = "test-key-1"

    jwk = {
        "kty": "RSA",
        "kid": kid,
        "use": "sig",
        "n": base64url_uint(numbers.n),
        "e": base64url_uint(numbers.e),
        "alg": "RS256",
    }
    jwks = {"keys": [jwk]}

    async def _mock_fetch_jwks():
        return jwks

    # monkeypatch the network fetch so JWKSClient uses our JWKS
    monkeypatch.setattr(jwks_mod.JWKSClient, "_fetch_jwks", lambda self: _mock_fetch_jwks())

    # prepare token payload with audience and roles
    aud = "test-audience"
    os_env_domain = "example.auth0"  # domain value not used because we patched network call
    jwks_client.domain = os_env_domain
    jwks_client.audience = aud

    payload = {"sub": "admin-user", "roles": ["admin", "hr"], "aud": aud, "iss": f"https://{os_env_domain}/"}
    priv_pem = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    token = jwt.encode(payload, priv_pem, algorithm="RS256", headers={"kid": kid})
    # call /onboard with admin token
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.post("/onboard", json={"employee_id": "emp-100", "start_date": "2030-01-01"}, headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_jwks_auth_insufficient_role(monkeypatch, async_client):
    # create keypair and jwks similar to previous test
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub = priv.public_key()
    numbers = pub.public_numbers()
    kid = "test-key-2"
    jwk = {"kty": "RSA", "kid": kid, "use": "sig", "n": base64url_uint(numbers.n), "e": base64url_uint(numbers.e), "alg": "RS256"}
    jwks = {"keys": [jwk]}

    async def _mock_fetch_jwks():
        return jwks

    monkeypatch.setattr(jwks_mod.JWKSClient, "_fetch_jwks", lambda self: _mock_fetch_jwks())

    aud = "test-audience"
    os_env_domain = "example.auth0"
    jwks_client.domain = os_env_domain
    jwks_client.audience = aud

    payload = {"sub": "normal-user", "roles": ["employee"], "aud": aud, "iss": f"https://{os_env_domain}/"}
    priv_pem = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    token = jwt.encode(payload, priv_pem, algorithm="RS256", headers={"kid": kid})
    headers = {"Authorization": f"Bearer {token}"}

    resp = await async_client.post("/onboard", json={"employee_id": "emp-101", "start_date": "2030-01-01"}, headers=headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_jwks_auth_invalid_audience(monkeypatch, async_client):
    # keypair
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub = priv.public_key()
    numbers = pub.public_numbers()
    kid = "test-key-3"
    jwk = {"kty": "RSA", "kid": kid, "use": "sig", "n": base64url_uint(numbers.n), "e": base64url_uint(numbers.e), "alg": "RS256"}
    jwks = {"keys": [jwk]}

    async def _mock_fetch_jwks():
        return jwks

    monkeypatch.setattr(jwks_mod.JWKSClient, "_fetch_jwks", lambda self: _mock_fetch_jwks())

    os_env_domain = "example.auth0"
    jwks_client.domain = os_env_domain
    jwks_client.audience = "expected-audience"

    payload = {"sub": "user", "roles": ["admin"], "aud": "wrong-audience", "iss": f"https://{os_env_domain}/"}
    priv_pem = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    token = jwt.encode(payload, priv_pem, algorithm="RS256", headers={"kid": kid})
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.post("/onboard", json={"employee_id": "emp-102", "start_date": "2030-01-01"}, headers=headers)
    assert resp.status_code == 401
