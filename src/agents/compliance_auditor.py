"""
Enhanced ComplianceAuditor with structured decision tracking.

Runs rule-based compliance checks against resume text, detects potential bias indicators,
generates structured compliance decisions, and supports manager override auditing.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict, field
from typing import Dict, List, Optional
from enum import Enum

from src.utils.audit_logger import AuditLogger
from src.utils.privacy_engine import redact_pii

import os

MANDATORY_CHECKS = [
    c.strip().lower()
    for c in os.environ.get(
        "MANDATORY_CHECKS", "right_to_work,background,certifications"
    ).split(",")
    if c.strip()
]

ENABLED_FRAMEWORKS = [
    c.strip().upper()
    for c in os.environ.get("ENABLED_FRAMEWORKS", "GDPR,EEOC").split(",")
    if c.strip()
]

GDPR_DATA_MINIMIZATION = os.environ.get("GDPR_DATA_MINIMIZATION", "true").lower() == "true"
EEOC_PROTECTED_CLASS_DETECTION = os.environ.get(
    "EEOC_PROTECTED_CLASS_DETECTION", "true"
).lower() == "true"
BIAS_DETECTION_THRESHOLD = float(os.environ.get("BIAS_DETECTION_THRESHOLD", "0.15"))


class SeverityLevel(Enum):
    """Severity levels for compliance findings."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class ComplianceDecision:
    """Structured representation of a single compliance check."""
    framework: str
    decision_type: str
    passed: bool
    severity: str
    data_fields_checked: List[str]
    explanation: str
    rule_reference: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for storage."""
        return asdict(self)


@dataclass
class ComplianceReport:
    """Comprehensive compliance audit report."""
    overall_passed: bool
    compliance_score: float
    risk_level: str
    decisions: List[ComplianceDecision] = field(default_factory=list)
    protected_class_indicators: Optional[Dict] = None
    bias_analysis: Optional[Dict] = None
    data_minimization_applied: bool = False

    def to_dict(self) -> Dict:
        """Convert to dictionary for storage."""
        return {
            "overall_passed": self.overall_passed,
            "compliance_score": self.compliance_score,
            "risk_level": self.risk_level,
            "decisions": [d.to_dict() for d in self.decisions],
            "protected_class_indicators": self.protected_class_indicators,
            "bias_analysis": self.bias_analysis,
            "data_minimization_applied": self.data_minimization_applied,
        }


@dataclass
class OverrideAuditResult:
    """Result of auditing a manager override."""
    escalation_required: bool
    escalation_reason: Optional[str] = None
    compliance_notes: Optional[str] = None
    conflicts_detected: List[str] = field(default_factory=list)


class ComplianceAuditor:
    def __init__(self, audit: Optional[AuditLogger] = None) -> None:
        self.audit = audit or AuditLogger()

    async def audit_resume(
        self,
        resume_text: str,
        required_certifications: Optional[List[str]] = None,
    ) -> ComplianceReport:
        """Audit resume for compliance against GDPR, EEOC, and internal policies.

        Args:
            resume_text: Resume content to audit
            required_certifications: List of required certifications to check

        Returns:
            ComplianceReport with structured decisions and findings
        """
        decisions: List[ComplianceDecision] = []
        redacted_text = redact_pii(resume_text).lower()
        pii_redacted = redacted_text != resume_text.lower()

        # GDPR data minimization check
        if "GDPR" in ENABLED_FRAMEWORKS and GDPR_DATA_MINIMIZATION:
            decision = self._check_data_minimization(resume_text, pii_redacted)
            decisions.append(decision)

        # Right to work (mandatory)
        if "right_to_work" in MANDATORY_CHECKS:
            decision = self._check_right_to_work(redacted_text)
            decisions.append(decision)

        # Background check (mandatory)
        if "background" in MANDATORY_CHECKS:
            decision = self._check_background(redacted_text)
            decisions.append(decision)

        # Certifications (mandatory)
        if "certifications" in MANDATORY_CHECKS and required_certifications:
            decision = self._check_certifications(redacted_text, required_certifications)
            decisions.append(decision)

        # EEOC protected class indicator detection
        protected_indicators = None
        if "EEOC" in ENABLED_FRAMEWORKS and EEOC_PROTECTED_CLASS_DETECTION:
            protected_indicators = self._detect_protected_class_proxies(resume_text)
            if protected_indicators["indicators_found"]:
                decision = ComplianceDecision(
                    framework="EEOC",
                    decision_type="protected_class_indicator",
                    passed=True,
                    severity="low",
                    data_fields_checked=protected_indicators["fields_checked"],
                    explanation=f"Protected class indicators detected: {protected_indicators['detected_patterns']}. These are flagged for bias analysis, not rejection.",
                    rule_reference="EEOC Title VII",
                )
                decisions.append(decision)

        # Calculate compliance score
        mandatory_decisions = [d for d in decisions if d.severity == SeverityLevel.HIGH.value or d.decision_type in MANDATORY_CHECKS]
        if mandatory_decisions:
            passed_mandatory = sum(1 for d in mandatory_decisions if d.passed)
            compliance_score = passed_mandatory / len(mandatory_decisions)
        else:
            compliance_score = 1.0

        # Determine risk level
        high_severity_failures = [d for d in decisions if d.severity == SeverityLevel.HIGH.value and not d.passed]
        if high_severity_failures:
            risk_level = "high"
        elif any(d.severity == SeverityLevel.MEDIUM.value and not d.passed for d in decisions):
            risk_level = "medium"
        else:
            risk_level = "low"

        # Generate bias analysis if protected indicators found
        bias_analysis = None
        if protected_indicators:
            bias_analysis = {
                "protected_class_indicators_found": protected_indicators["indicators_found"],
                "detected_patterns": protected_indicators["detected_patterns"],
                "proxy_fields": protected_indicators["fields_checked"],
                "recommendation": "Review screening score for potential disparate impact",
            }

        report = ComplianceReport(
            overall_passed=all(d.passed for d in decisions),
            compliance_score=compliance_score,
            risk_level=risk_level,
            decisions=decisions,
            protected_class_indicators=protected_indicators,
            bias_analysis=bias_analysis,
            data_minimization_applied=pii_redacted,
        )

        await self.audit.log("compliance_audit", "system", "resume", report.to_dict())
        return report

    async def audit_override(
        self,
        original_recommendation: str,
        override_recommendation: str,
        override_reason: str,
        compliance_findings: List[ComplianceDecision],
    ) -> OverrideAuditResult:
        """Audit manager override for compliance risk.

        Args:
            original_recommendation: Original system recommendation
            override_recommendation: Manager's override decision
            override_reason: Manager's justification
            compliance_findings: Compliance decisions from original screening

        Returns:
            OverrideAuditResult indicating escalation need
        """
        conflicts = []
        escalation_required = False

        # Check if override contradicts high-severity compliance findings
        high_severity = [d for d in compliance_findings if d.severity == SeverityLevel.HIGH.value and not d.passed]

        if high_severity and override_recommendation in ("strong_match", "good_match"):
            escalation_required = True
            conflicts.extend([d.explanation for d in high_severity])

        escalation_reason = None
        if escalation_required:
            escalation_reason = (
                f"Manager override conflicts with {len(high_severity)} high-severity compliance finding(s). "
                f"Requires EEOC/GDPR review: {', '.join(conflicts[:2])}"
            )

        compliance_notes = (
            f"Override approved - low compliance risk. "
            f"Original recommendation: {original_recommendation}, Override: {override_recommendation}"
        ) if not escalation_required else escalation_reason

        result = OverrideAuditResult(
            escalation_required=escalation_required,
            escalation_reason=escalation_reason,
            compliance_notes=compliance_notes,
            conflicts_detected=conflicts,
        )

        await self.audit.log(
            "compliance_override_audit",
            "system",
            "override_decision",
            {
                "original": original_recommendation,
                "override": override_recommendation,
                "escalation_required": escalation_required,
                "conflicts": conflicts,
            },
        )

        return result

    def _check_data_minimization(self, text: str, pii_redacted: bool) -> ComplianceDecision:
        """Check GDPR data minimization compliance."""
        return ComplianceDecision(
            framework="GDPR",
            decision_type="data_minimization",
            passed=pii_redacted,
            severity=SeverityLevel.MEDIUM.value,
            data_fields_checked=["name", "email", "phone", "address"],
            explanation="Data minimization: PII redacted before screening" if pii_redacted else "PII present in resume text",
            rule_reference="GDPR Article 5(1)(c)",
        )

    def _check_right_to_work(self, text: str) -> ComplianceDecision:
        """Check right-to-work verification."""
        patterns = [
            r"right to work",
            r"work authorization",
            r"citizen",
            r"permanent resident",
            r"work permit",
        ]
        passed = any(re.search(p, text) for p in patterns)
        return ComplianceDecision(
            framework="EEOC",
            decision_type="right_to_work",
            passed=passed,
            severity=SeverityLevel.HIGH.value,
            data_fields_checked=["work_authorization"],
            explanation="Right-to-work verified in resume" if passed else "Right-to-work not verifiable from resume",
            rule_reference="EEOC Work Authorization",
        )

    def _check_background(self, text: str) -> ComplianceDecision:
        """Check for background-related flags."""
        patterns = [r"\bconvicted\b", r"\barrested\b", r"\bfelony\b", r"\bmisdemeanor\b"]
        flagged = any(re.search(p, text) for p in patterns)
        return ComplianceDecision(
            framework="EEOC",
            decision_type="background",
            passed=not flagged,
            severity=SeverityLevel.MEDIUM.value,
            data_fields_checked=["criminal_history"],
            explanation="No adverse background indicators found" if not flagged else "Potentially adverse background data flagged",
            rule_reference="EEOC Compliance",
        )

    def _check_certifications(
        self, text: str, required: List[str]
    ) -> ComplianceDecision:
        """Check required certifications."""
        missing = [cert for cert in required if cert.lower() not in text]
        passed = len(missing) == 0
        return ComplianceDecision(
            framework="general",
            decision_type="certifications",
            passed=passed,
            severity=SeverityLevel.HIGH.value,
            data_fields_checked=["certifications", "licenses"],
            explanation=f"All certifications present" if passed else f"Missing certifications: {', '.join(missing)}",
            rule_reference="Job Requirements",
        )

    def _detect_protected_class_proxies(self, text: str) -> Dict:
        """Detect non-invasive proxy indicators for protected classes.

        Does NOT extract protected attributes, only flags if patterns detected.
        Used for bias analysis, not for screening decisions.
        """
        indicators_found = False
        detected_patterns = []
        fields_checked = []

        # Check for geographic patterns that might correlate with protected classes
        geographic_keywords = [
            r"new york", r"california", r"texas", r"florida",
            r"michigan", r"ohio", r"pennsylvania"
        ]
        if any(re.search(kw, text.lower()) for kw in geographic_keywords):
            detected_patterns.append("geographic_location_proxy")
            fields_checked.append("location")
            indicators_found = True

        # Check for education institution patterns
        hbcu_proxies = [
            r"howard\b", r"spelman\b", r"morehouse\b", r"hampton\b",
            r"tuskegee\b", r"xavier\b", r"fisk\b"
        ]
        if any(re.search(inst, text.lower()) for inst in hbcu_proxies):
            detected_patterns.append("hbcu_proxy")
            fields_checked.append("education_institution")
            indicators_found = True

        # Check for name patterns (common surnames from different ethnicities)
        name_patterns = [
            r"garcia\b", r"rodriguez\b", r"martinez\b", r"johnson\b",
            r"williams\b", r"brown\b", r"jones\b"
        ]
        if any(re.search(pat, text.lower()) for pat in name_patterns):
            detected_patterns.append("surname_pattern")
            fields_checked.append("candidate_name")
            indicators_found = True

        return {
            "indicators_found": indicators_found,
            "detected_patterns": detected_patterns,
            "fields_checked": list(set(fields_checked)),
        }
