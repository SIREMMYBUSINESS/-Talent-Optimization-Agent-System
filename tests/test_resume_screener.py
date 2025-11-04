import os
import tempfile
import pytest
from src.agents.resume_screener import ResumeScreener
from src.utils.privacy_engine import pii_to_hashed_map


@pytest.mark.asyncio
async def test_screen_scores_and_matches(tmp_path, mock_retriever, audit_logger):
    # create a simple txt resume containing two skills and an email
    resume = tmp_path / "jane_resume.txt"
    resume.write_text("Jane Doe\nSkilled in Python and Communication\nEmail: jane@example.com\nRight to work")

    screener = ResumeScreener(retriever=mock_retriever, audit=audit_logger)
    result = await screener.screen(str(resume), role_description="Python developer", top_k=3)

    assert "score" in result
    assert 0.0 <= result["score"] <= 1.0
    # required skills were python,communication,testing (set in conftest); two should be matched
    assert "python" in [s.lower() for s in result["matched_skills"]]
    assert len(result["search_matches"]) == 3
    # PII hashing captured
    assert "jane@example.com" in result["pii_hashes"]


@pytest.mark.asyncio
async def test_retriever_failure_does_not_crash(tmp_path, failing_retriever, audit_logger):
    # create a minimal resume
    resume = tmp_path / "small.txt"
    resume.write_text("A short resume with Python skill")

    screener = ResumeScreener(retriever=failing_retriever, audit=audit_logger)
    result = await screener.screen(str(resume), role_description="Python")

    # retriever failure should lead to empty search_results but still return score
    assert "search_matches" in result
    assert result["search_matches"] == []
    assert "score" in result
