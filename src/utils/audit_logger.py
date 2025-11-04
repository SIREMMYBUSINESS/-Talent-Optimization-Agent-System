import json
import logging
import os
import threading
from datetime import datetime
from typing import Any, Dict, Optional

import requests

LOG_PATH = os.environ.get("AUDIT_LOG_PATH", "/var/log/talent_optimization_agent/audit.log")
AUDIT_WEBHOOK = os.environ.get("AUDIT_WEBHOOK", "")


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName,
            "lineNo": record.lineno,
        }
        if record.args:
            payload["args"] = record.args
        return json.dumps(payload)


def _ensure_log_dir(path: str) -> None:
    dirpath = os.path.dirname(path)
    try:
        os.makedirs(dirpath, exist_ok=True)
    except Exception:
        pass


class AuditLogger:
    def __init__(self, path: str = LOG_PATH, webhook: Optional[str] = AUDIT_WEBHOOK):
        _ensure_log_dir(path)
        self.logger = logging.getLogger("talent_optimization_audit")
        self.logger.setLevel(logging.INFO)
        fh = logging.FileHandler(path)
        fh.setFormatter(JSONFormatter())
        if not self.logger.handlers:
            self.logger.addHandler(fh)
        self.webhook = webhook

    def _send_webhook(self, payload: Dict[str, Any]) -> None:
        if not self.webhook:
            return

        def _post():
            try:
                requests.post(self.webhook, json=payload, timeout=5)
            except Exception:
                # Do not fail the main flow if audit webhook fails
                pass

        t = threading.Thread(target=_post, daemon=True)
        t.start()

    def log(self, action: str, actor: str, target: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        payload = {
            "action": action,
            "actor": actor,
            "target": target,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        self.logger.info(json.dumps(payload))
        self._send_webhook(payload)
