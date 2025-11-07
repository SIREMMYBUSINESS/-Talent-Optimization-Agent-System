import asyncio
import json
import logging
import os
import threading
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

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
        self._subscribers: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()
        self._session_maker = None
        self._database_url = None

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

    async def _init_db(self, database_url: str) -> None:
        if not self._session_maker:
            from src import db as dbmod
            self._session_maker = await dbmod.init_db(database_url)

    async def log(self, action: str, actor: str, target: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        payload = {
            "event_type": action,
            "action": action,
            "actor": actor,
            "user_id": actor,
            "target": target,
            "metadata": metadata or {},
            "payload": metadata or {},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        self.logger.info(json.dumps(payload))
        self._send_webhook(payload)

        if self._database_url and self._session_maker:
            try:
                from src import db as dbmod
                await dbmod.insert_audit(self._session_maker, payload)
            except Exception:
                pass

        await self._broadcast(payload)

    async def _broadcast(self, event: Dict[str, Any]) -> None:
        async with self._lock:
            dead_queues = []
            for queue in self._subscribers:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    dead_queues.append(queue)
            for queue in dead_queues:
                try:
                    self._subscribers.remove(queue)
                except ValueError:
                    pass

    async def subscribe(self) -> AsyncGenerator[Dict[str, Any], None]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers.append(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            async with self._lock:
                try:
                    self._subscribers.remove(queue)
                except ValueError:
                    pass
