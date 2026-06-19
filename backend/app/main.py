import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt

from app.config import settings
from app.database import init_db
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.timing import TimingMiddleware
from app.redis_client import close_redis, init_redis
from app.routers import (
    admin,
    auth,
    contracts,
    disputes,
    ipfs,
    jobs,
    messages,
    notifications,
    proposals,
    recommendations,
    users,
)
from app.services.event_listener import start_event_listener
from app.services.ipfs_monitor import start_ipfs_monitor
from app.services.repin_service import start_repin_service
from app.utils.error_codes import ErrorCodes
from app.websocket_manager import manager

logger = logging.getLogger("freeledger.main")

FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "build")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_redis()

    if not settings.client_private_key and not settings.freelancer_private_key:
        logger.warning(
            "No blockchain private keys configured (CLIENT_PRIVATE_KEY / FREELANCER_PRIVATE_KEY). "
            "On-chain operations (contract creation, funding, milestone approval, dispute resolution) "
            "will fail with BLOCKCHAIN_NO_KEY errors. Set these in .env or environment for blockchain functionality."
        )
    elif not settings.client_private_key:
        logger.warning(
            "CLIENT_PRIVATE_KEY is not set. The FREELANCER_PRIVATE_KEY will be used as fallback "
            "for some operations, but contract creation, funding, milestone approval, and dispute "
            "resolution will fail."
        )
    else:
        logger.info(
            "Blockchain private key configured. Operations will use: "
            "CLIENT_PRIVATE_KEY for contract creation/funding/approval/disputes, "
            "and FREELANCER_PRIVATE_KEY (or client key fallback) for milestone submission."
        )

    if settings.client_private_key:
        start_event_listener()
    start_repin_service()
    start_ipfs_monitor()
    yield
    await close_redis()


app = FastAPI(
    title="FreeLedger API",
    description="A Decentralized Freelance Protocol with Web3 Integration",
    version="1.0.0",
    lifespan=lifespan,
)

def _code_for_status(status_code: int) -> str:
    if status_code == 400:
        return ErrorCodes.VALIDATION_ERROR
    if status_code == 401:
        return ErrorCodes.AUTH_INVALID_TOKEN
    if status_code == 403:
        return ErrorCodes.AUTHZ_FORBIDDEN
    if status_code == 404:
        return ErrorCodes.NOT_FOUND_USER
    if status_code == 409:
        return ErrorCodes.VALIDATION_EMAIL_EXISTS
    if status_code == 422:
        return ErrorCodes.VALIDATION_ERROR
    if status_code == 502:
        return ErrorCodes.BLOCKCHAIN_ERROR
    return ErrorCodes.INTERNAL_ERROR


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": getattr(exc, "code", _code_for_status(exc.status_code)),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "code": ErrorCodes.VALIDATION_ERROR},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": ErrorCodes.INTERNAL_ERROR},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(TimingMiddleware)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(proposals.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(disputes.router, prefix="/api")
app.include_router(ipfs.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")


@app.websocket("/ws/messages/{user_id}")
async def websocket_messages(websocket: WebSocket, user_id: str, token: str = Query(...)):
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        token_user_id: str = payload.get("sub")
        if token_user_id != user_id:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@app.get("/api/metrics")
async def metrics():
    from app.middleware.timing import get_metrics
    return get_metrics()


@app.get("/api/health")
async def health_check():
    from app.services.health_service import (
        check_blockchain,
        check_database,
        check_event_listener,
        check_ipfs,
        check_redis,
    )

    db = await check_database()
    redis = await check_redis()
    ipfs = await check_ipfs()
    blockchain = await check_blockchain()
    event_listener = check_event_listener()

    all_ok = all(
        s["status"] == "ok" or s["status"] == "disabled"
        for s in [db, redis, ipfs, blockchain, event_listener]
    )

    return {
        "status": "ok" if all_ok else "degraded",
        "version": "1.0.0",
        "services": {
            "database": db,
            "redis": redis,
            "ipfs": ipfs,
            "blockchain": blockchain,
            "event_listener": event_listener,
        },
    }


if os.path.isdir(FRONTEND_BUILD):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_BUILD, "static")), name="static")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return RedirectResponse(url="/" + full_path.rstrip("/") + "/", status_code=307)
        return FileResponse(os.path.join(FRONTEND_BUILD, "index.html"))
else:
    print(f"Frontend build not found at {FRONTEND_BUILD}, serving API only")
