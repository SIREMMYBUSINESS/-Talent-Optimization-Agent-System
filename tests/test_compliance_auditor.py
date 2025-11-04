import pytest

from src.agents.compliance_auditor import ComplianceAuditor
from src.utils.privacy_engine import redact_pii


@pytest.mark.asyncio
async def test_audit_detects_right_to_work_and_background(tmp_path, audit_logger):
    # Simulated resume text containing right-to-work phrase and a criminal phrase
    text = "John Doe\nHas right to work in the UK\nWas convicted of something in 2010\nNo certifications listed"
    auditor = ComplianceAuditor(audit=audit_logger)
    report = await auditor.audit_resume(text, required_certifications=["Cert-A", "Cert-B"])
    assert "passed" in report and "findings" in report
    assert report["passed"] is False
    # Expect right_to_work check *not* to fail (should be verifiable), so findings should include background and certifications
    checks = {f["check"] for f in report["findings"]}
    assert "background" in checks or "certifications" in checks


def test_redact_before_audit():
    txt = "Contact me: jane.doe@mail.com, +44 7700 900123, SSN 987-65-4321"
    redacted = redact_pii(txt)
    assert "jane.doe@mail.com" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
