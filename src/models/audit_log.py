"""
Canonical AuditLog SQLAlchemy model.

This module exposes Base and the AuditLog model used by the rest of the app.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    event_type = Column(String(128), nullable=False)
    payload = Column(Text, nullable=True)  # JSON stored as text
    user_id = Column(String(128), nullable=True)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "event_type": self.event_type,
            "payload": json.loads(self.payload or "{}"),
            "user_id": self.user_id,
        }
