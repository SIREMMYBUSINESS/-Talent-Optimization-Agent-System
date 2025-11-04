import re
from src.utils import privacy_engine as pe


def test_redact_replaces_email_phone_ssn():
    text = "Contact: alice@example.com, +1 555-123-4567, SSN 123-45-6789."
    redacted = pe.redact_pii(text)
    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_PHONE]" in redacted
    assert "[REDACTED_SSN]" in redacted
    # original raw pieces should not remain
    assert "alice@example.com" not in redacted
    assert "123-45-6789" not in redacted


def test_pii_to_hashed_map_is_deterministic_and_unique():
    text = "alice@example.com and alice@example.com and +1 555-123-4567"
    mapping = pe.pii_to_hashed_map(text)
    # keys present
    assert "alice@example.com" in mapping
    assert "+1 555-123-4567" in mapping
    # deterministic: same input -> same hash
    h1 = mapping["alice@example.com"]
    h2 = pe.pii_to_hashed_map("alice@example.com")["alice@example.com"]
    assert h1 == h2
    # different inputs produce different hashes
    assert mapping["alice@example.com"] != mapping["+1 555-123-4567"]
