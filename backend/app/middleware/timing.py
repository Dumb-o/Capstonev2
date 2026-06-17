import logging
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger("freeledger.timing")

SLOW_THRESHOLD_MS = 500

_metrics: dict[str, dict] = {}


def get_metrics() -> dict:
    endpoints = {}
    for path, data in _metrics.items():
        endpoints[path] = {
            "avg_ms": round(data["total_ms"] / data["count"], 1),
            "count": data["count"],
        }
    return {"endpoints": endpoints}


class TimingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, slow_threshold_ms: int = SLOW_THRESHOLD_MS):
        super().__init__(app)
        self.slow_threshold_ms = slow_threshold_ms

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in ("/api/metrics", "/api/health"):
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

        self._record(request.url.path, elapsed_ms)
        self._log(request.method, request.url.path, response.status_code, elapsed_ms)

        return response

    def _log(self, method: str, path: str, status: int, ms: float):
        if ms >= self.slow_threshold_ms:
            logger.warning("SLOW REQUEST: %s %s | %s | %sms", method, path, status, ms)
        else:
            logger.info("%s %s | %s | %sms", method, path, status, ms)

    @staticmethod
    def _record(path: str, ms: float):
        entry = _metrics.get(path)
        if entry is None:
            _metrics[path] = {"count": 1, "total_ms": ms}
        else:
            entry["count"] += 1
            entry["total_ms"] += ms
