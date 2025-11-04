"""
Privacy helpers: simple PII redaction and hashed mapping utilities.

Note: These functions are intentionally simple and meant to be a starting point.
For production deployments, extend with more robust PII detection libraries
and configurable redaction policies.
"""
from __future__ import annotations

import hashlib
import os
import re
from typing import Dict

PRIVACY_SALT = os.environ.get("PRIVACY_SALT", "change-me")

_EMAIL_RE = re.compile(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")
_PHONE_RE = re.compile(r"(\+?\d[\d\-\s]{7,}\d)")
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")


def _hash(value: str) -> str:
    h = hashlib.sha256()
    h.update(PRIVACY_SALT.encode("utf-8"))
    h.update(value.encode("utf-8"))
    return h.hexdigest()


def redact_pii(text: str) -> str:
    if not text:
        return text
    redacted = _EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    redacted = _PHONE_RE.sub("[REDACTED_PHONE]", redacted)
    redacted = _SSN_RE.sub("[REDACTED_SSN]", redacted)
    return redacted


def pii_to_hashed_map(text: str) -> Dict[str, str]:
    found = {}
    if not text:
        return found
    for e in set(_EMAIL_RE.findall(text) or []):
        found[e] = _hash(e)
    for p in set(_PHONE_RE.findall(text) or []):
        found[p] = _hash(p)
    for s in set(_SSN_RE.findall(text) or []):
        found[s] = _hash(s)
    return found
