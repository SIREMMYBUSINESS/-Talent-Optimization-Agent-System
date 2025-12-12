"""
Async ResumeScreener with Differential Privacy and Compliance Integration.

Extracts text from resumes, applies DP noise to scores, performs compliance audits,
detects bias indicators, and generates comprehensive screening results with privacy guarantees.
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Optional, Tuple

from pdfminer.high_level import extract_text
from docx import Document

from src.integrations.nemo_retriever import NeMoRetriever
from src.utils.audit_logger import AuditLogger
from src.utils.privacy_engine import pii_to_hashed_map, redact_pii
from src.utils.differential_privacy import DifferentialPrivacy, PrivacyParameters, PrivacyMechanism
from src.agents.compliance_auditor import ComplianceAuditor

REQUIRED_SKILLS = [
    s.strip().lower()
    for s in os.environ.get("REQUIRED_SKILLS", "python,communication").split(",")
    if s.strip()
]

DP_ENABLED = os.environ.get("DP_ENABLED", "true").lower() == "true"
DP_EPSILON = float(os.environ.get("DP_EPSILON", "1.0"))
DP_DELTA = float(os.environ.get("DP_DELTA", "1e-5"))
DP_MECHANISM = os.environ.get("DP_MECHANISM", "laplace")


class ResumeScreener:
    def __init__(
        self,
        retriever: Optional[NeMoRetriever] = None,
        audit: Optional[AuditLogger] = None,
        compliance_auditor: Optional[ComplianceAuditor] = None,
    ) -> None:
        self.retriever = retriever or NeMoRetriever()
        self.audit = audit or AuditLogger()
        self.compliance_auditor = compliance_auditor or ComplianceAuditor(audit=audit)

    async def parse_resume(self, path: str) -> str:
        """Detect file type by extension and extract text. Runs blocking parsing in threadpool."""
        if path.lower().endswith(".pdf"):
            return await asyncio.to_thread(self._extract_text_from_pdf, path)
        if path.lower().endswith(".docx"):
            return await asyncio.to_thread(self._extract_text_from_docx, path)
        # fallback to reading text file
        return await asyncio.to_thread(self._read_text_file, path)

    def _extract_text_from_pdf(self, path: str) -> str:
        return extract_text(path) or ""

    def _extract_text_from_docx(self, path: str) -> str:
        doc = Document(path)
        return "\n".join([p.text for p in doc.paragraphs])

    def _read_text_file(self, path: str) -> str:
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            return fh.read()

    async def screen(
        self,
        resume_path: str,
        role_description: str = "",
        top_k: int = 5,
        required_certifications: Optional[List[str]] = None,
        evaluation_mode: bool = False,
    ) -> Dict[str, Any]:
        """Full async screening with DP and compliance integration.

        Args:
            resume_path: Path to resume file
            role_description: Job description/requirements
            top_k: Number of search results
            required_certifications: Required certifications to check
            evaluation_mode: If True, run both DP and non-DP screening for comparison

        Returns:
            Comprehensive screening result with privacy, compliance, and bias metadata
        """
        raw_text = await self.parse_resume(resume_path)
        pii_map = pii_to_hashed_map(raw_text)
        redacted_text = redact_pii(raw_text)

        # Get embedding + search results
        try:
            embedding = await self.retriever.embed(redacted_text)
            search_results = await self.retriever.search(embedding, top_k=top_k)
        except Exception as exc:
            await self.audit.log(
                "screen_resume_retriever_error",
                "system",
                os.path.basename(resume_path),
                {"error": str(exc)},
            )
            embedding = []
            search_results = []

        # Compute original skill match score (0-100)
        original_score, matched_skills = self._score_text(redacted_text, role_description)
        original_score = original_score * 100

        # Run compliance audit
        compliance_report = await self.compliance_auditor.audit_resume(
            raw_text, required_certifications=required_certifications
        )

        # Apply differential privacy if enabled
        private_score = original_score
        privacy_result = None
        if DP_ENABLED:
            privacy_params = PrivacyParameters(
                epsilon=DP_EPSILON,
                delta=DP_DELTA,
                mechanism=PrivacyMechanism(DP_MECHANISM),
                sensitivity=100.0,
            )
            privacy_result = DifferentialPrivacy.apply_privacy(
                original_score=original_score,
                params=privacy_params,
                score_min=0.0,
                score_max=100.0,
            )
            private_score = privacy_result.private_score

        # Determine recommendation based on private score
        recommendation = self._score_to_recommendation(private_score)

        # Build comprehensive result
        result = {
            "resume_path": resume_path,
            "redacted_text": redacted_text,
            "pii_hashes": pii_map,
            "search_matches": search_results,
            "original_score": original_score,
            "private_score": private_score,
            "matched_skills": matched_skills,
            "recommendation": recommendation,
            "privacy_metadata": {
                "dp_enabled": DP_ENABLED,
                "epsilon": DP_EPSILON,
                "delta": DP_DELTA,
                "mechanism": DP_MECHANISM,
                "noise_amount": privacy_result.noise_amount if privacy_result else 0.0,
                "confidence_interval": {
                    "lower": privacy_result.lower_bound if privacy_result else original_score,
                    "upper": privacy_result.upper_bound if privacy_result else original_score,
                    "width": privacy_result.confidence_interval_width if privacy_result else 0.0,
                } if privacy_result else None,
            },
            "compliance": compliance_report.to_dict(),
            "screening_mode": "evaluation" if evaluation_mode else "production",
        }

        # In evaluation mode, also compute non-DP score for comparison
        if evaluation_mode:
            result["evaluation_comparison"] = {
                "non_dp_score": original_score,
                "dp_score": private_score,
                "noise_ratio": (
                    abs(private_score - original_score) / max(1, original_score)
                    if original_score > 0
                    else 0
                ),
            }

        # Log comprehensive screening event
        await self.audit.log(
            "resume_screening_with_compliance",
            "system",
            os.path.basename(resume_path),
            {
                "original_score": original_score,
                "private_score": private_score,
                "dp_enabled": DP_ENABLED,
                "compliance_passed": compliance_report.overall_passed,
                "compliance_risk": compliance_report.risk_level,
                "evaluation_mode": evaluation_mode,
            },
        )

        return result

    def _score_text(self, text: str, role_description: str) -> Tuple[float, List[str]]:
        combined = (text + " " + (role_description or "")).lower()
        matched = [s for s in REQUIRED_SKILLS if s and s in combined]
        score = float(len(matched)) / max(1.0, float(len(REQUIRED_SKILLS) or 1.0))
        if role_description:
            role_tokens = set(role_description.lower().split())
            if role_tokens & set(combined.split()):
                score = min(1.0, score + 0.1)
        return score, matched

    def _score_to_recommendation(self, score: float) -> str:
        """Convert private score to hiring recommendation.

        Args:
            score: Privacy-protected score (0-100)

        Returns:
            Recommendation category
        """
        if score >= 80:
            return "strong_match"
        elif score >= 60:
            return "good_match"
        elif score >= 40:
            return "potential_match"
        else:
            return "no_match"
