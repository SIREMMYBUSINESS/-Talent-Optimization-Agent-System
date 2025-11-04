"""
Async NeMo retriever integration (mock-friendly).

If NEMO_BASE_URL is set, this client will call:
  - POST {base_url}/embed  -> {"text": "..."} -> {"embedding": [...]}
  - POST {base_url}/search -> {"embedding": [...], "top_k": n} -> {"results": [...]}

If not configured, a deterministic in-process mock is used that creates
simple embeddings and example search results.
"""
from __future__ import annotations

import os
import random
from typing import Dict, List, Optional

import httpx
import numpy as np

NEMO_BASE_URL = os.environ.get("NEMO_BASE_URL", "")


class NeMoRetriever:
    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = (base_url or NEMO_BASE_URL).rstrip("/") if (base_url or NEMO_BASE_URL) else ""
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if not self._client:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    async def embed(self, text: str) -> List[float]:
        """
        Produce an embedding vector for the given text.
        Uses external NeMo service if configured, otherwise returns a deterministic mock.
        """
        if not self.base_url:
            # deterministic mock embedding using hashing -> float vector
            vec = np.frombuffer(hash(text).to_bytes(8, "little", signed=True), dtype=np.uint8).astype(float)
            # normalize and expand to length 128 for stability
            vec = (vec % 100) / 100.0
            vec = np.pad(vec, (0, max(0, 128 - vec.shape[0])), "constant")[:128]
            return vec.tolist()

        client = await self._get_client()
        resp = await client.post(f"{self.base_url}/embed", json={"text": text})
        resp.raise_for_status()
        payload = resp.json()
        return payload.get("embedding", [])

    async def search(self, embedding: List[float], top_k: int = 5) -> List[Dict]:
        """
        Search for top_k similar candidates or jobs given an embedding.
        When unconfigured, returns mock results with deterministic scores.
        """
        if not self.base_url:
            # mock: return top_k synthetic candidates
            rand = random.Random(int(sum(map(float, embedding)) * 1000) & 0xFFFFFFFF)
            results = []
            for i in range(top_k):
                score = round(0.7 + 0.3 * rand.random(), 4)
                results.append(
                    {
                        "id": f"mock_cand_{i+1}",
                        "metadata": {"name": f"Candidate {i+1}", "source": "mock_index"},
                        "score": score,
                    }
                )
            # sort by score desc
            return sorted(results, key=lambda r: r["score"], reverse=True)

        client = await self._get_client()
        resp = await client.post(f"{self.base_url}/search", json={"embedding": embedding, "top_k": top_k})
        resp.raise_for_status()
        payload = resp.json()
        return payload.get("results", [])
