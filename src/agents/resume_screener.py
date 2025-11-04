"""
Async ResumeScreener: extracts text from uploaded resumes, redacts PII,
creates hashed PII map, obtains embeddings via NeMo retriever, searches,
computes a simple fit score, and audit-logs the screening event.

Extraction uses threadpool to run blocking pdf/docx parsers.
"""
from __future__ import annotations

import asyncio
import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple

from pdfminer.high_level import extract_text
from docx import Document

from src.integrations.nemo_retriever import NeMoRetriever
from src.utils.audit_logger import AuditLogger
from src.utils.privacy_engine import pii_to_hashed_map, redact_pii

# skills list provided via ENV or default
REQUIRED_SKILLS = [s.strip().lower() for s in os.environ.get("REQUIRED_SKILLS", "python,communication").split(",") if s.strip()]


class ResumeScreener:
    def __init__(self, retriever: Optional[NeMoRetriever] = None, audit: Optional[AuditLogger] = None) -> None:
        self.retriever = retriever or NeMoRetriever()
        self.audit = audit or AuditLogger()

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

    async def screen(self, resume_path: str, role_description: str = "", top_k: int = 5) -> Dict[str, Any]:
        """
        Full async screening pipeline:
         - parse resume
         - compute pii map + redacted text
         - get embedding + search via retriever
         - compute simple fit score
         - audit log
        """
        raw_text = await self.parse_resume(resume_path)
        pii_map = pii_to_hashed_map(raw_text)
        redacted_text = redact_pii(raw_text)

        # embed + search
        try:
            embedding = await self.retriever.embed(redacted_text)
            search_results = await self.retriever.search(embedding, top_k=top_k)
        except Exception as exc:
            # in case of retriever failure, continue with empty results but log
            await self.audit.log("screen_resume_retriever_error", "system", os.path.basename(resume_path), {"error": str(exc)})
            embedding = []
            search_results = []

        score, matched_skills = self._score_text(redacted_text, role_description)

        result = {
            "resume_path": resume_path,
            "redacted_text": redacted_text,
            "pii_hashes": pii_map,
            "search_matches": search_results,
            "score": score,
            "matched_skills": matched_skills,
        }

        await self.audit.log("screen_resume", "system", os.path.basename(resume_path), {"score": score, "matches": len(search_results)})
        return result

    def _score_text(self, text: str, role_description: str) -> Tuple[float, List[str]]:
        combined = (text + " " + (role_description or "")).lower()
        matched = [s for s in REQUIRED_SKILLS if s and s in combined]
        score = float(len(matched)) / max(1.0, float(len(REQUIRED_SKILLS) or 1.0))
        # small heuristic boost if role_description shares tokens
        if role_description:
            role_tokens = set(role_description.lower().split())
            if role_tokens & set(combined.split()):
                score = min(1.0, score + 0.1)
        return score, matched
