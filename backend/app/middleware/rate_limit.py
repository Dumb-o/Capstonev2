import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from app.redis_client import get_redis


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed sliding-window rate limiter.

    Each request increments a counter keyed by
    `ratelimit:{client_ip}:{route_prefix}:{window}`.

    Limits are defined by RATE_LIMITS: a dict mapping a route prefix to
    (max_requests, window_seconds).  Requests whose path doesn't match any
    prefix use the default (100/minute).

    Set RATE_LIMITS on app.state before adding this middleware, or the
    built-in defaults below are used.
    """

    DEFAULT_LIMITS: dict[str, tuple[int, int]] = {
        "/api/auth":       (10,   60),     # 10 req/min for auth
        "/api/ipfs":       (20,   60),     # 20 req/min for IPFS uploads
        "/api/admin":      (30,   60),     # 30 req/min for admin
        "/api/health":     (60,   60),     # 60 req/min for health
        "__default__":     (60,   60),     # 60 req/min for everything else
    }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        limits: dict = getattr(request.app.state, "RATE_LIMITS", self.DEFAULT_LIMITS)
        max_r, window = self._match_limit(request.url.path, limits)

        redis = await get_redis()
        if redis is not None:
            client_ip = request.client.host if request.client else "unknown"
            now = int(time.time())
            slot = now // window
            key = f"ratelimit:{client_ip}:{request.url.path}:{slot}"

            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window * 2)

            if count > max_r:
                return Response(
                    status_code=HTTP_429_TOO_MANY_REQUESTS,
                    content='{"detail":"Rate limit exceeded"}',
                    media_type="application/json",
                    headers={"Retry-After": str(window - (now % window))},
                )

        return await call_next(request)

    @staticmethod
    def _match_limit(path: str, limits: dict) -> tuple[int, int]:
        longest = 0
        best = limits.get("__default__", (60, 60))
        for prefix, cfg in limits.items():
            if prefix == "__default__":
                continue
            if path.startswith(prefix) and len(prefix) > longest:
                longest = len(prefix)
                best = cfg
        return best
