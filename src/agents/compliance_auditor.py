"""
Async ComplianceAuditor: runs rule-based checks against resume text,
uses privacy engine to redact PII before checks, and audit-logs results.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

from src.utils.audit_logger import AuditLogger
from src.utils.privacy_engine import redact_pii

MANDATORY_CHECKS = [c.strip().lower() for c in ( __import__("os").environ.get("MANDATORY_CHECKS", "right_to_work,background,certifications") ).split(",") if c.strip()]


class ComplianceAuditor:
    def __init__(self, audit: Optional[AuditLogger] = None) -> None:
        self.audit = audit or AuditLogger()

    async def audit_resume(self, resume_text: str, required_certifications: Optional[List[str]] = None) -> Dict[str, object]:
        report = {"passed": True, "findings": []}
        text = redact_pii(resume_text).lower()

        if "right_to_work" in MANDATORY_CHECKS:
            if not self._check_right_to_work(text):
                report["passed"] = False
                report["findings"].append({"check": "right_to_work", "message": "Right-to-work not verifiable"})

        if "background" in MANDATORY_CHECKS:
            if self._flag_criminal_records(text):
                report["passed"] = False
                report["findings"].append({"check": "background", "message": "Potentially adverse background data flagged"})

        if "certifications" in MANDATORY_CHECKS and required_certifications:
            missing = self._check_certifications(text, required_certifications)
            if missing:
                report["passed"] = False
                report["findings"].append({"check": "certifications", "message": f"Missing certifications: {missing}"})

        await self.audit.log("compliance_audit", "system", "resume", report)
        return report

    def _check_right_to_work(self, text: str) -> bool:
        patterns = [r"right to work", r"work authorization", r"citizen", r"permanent resident", r"work permit"]
        return any(re.search(p, text) for p in patterns)

    def _flag_criminal_records(self, text: str) -> bool:
        patterns = [r"\bconvicted\b", r"\barrested\b", r"\bfelony\b", r"\bmisdemeanor\b"]
        return any(re.search(p, text) for p in patterns)

    def _check_certifications(self, text: str, required: List[str]) -> List[str]:
        missing = []
        lc = text.lower()
        for cert in required:
            if cert.lower() not in lc:
                missing.append(cert)
        return missing
