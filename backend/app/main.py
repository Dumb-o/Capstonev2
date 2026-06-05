import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from app.config import settings
from app.database import init_db
from app.redis_client import init_redis, close_redis
from app.routers import auth, users, jobs, proposals, contracts, disputes, messages, ipfs, admin
from app.services.event_listener import start_event_listener

FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "build")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_redis()
    if settings.client_private_key:
        start_event_listener()
    yield
    await close_redis()


app = FastAPI(
    title="FreeLedger API",
    description="A Decentralized Freelance Protocol with Web3 Integration",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(proposals.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(disputes.router, prefix="/api")
app.include_router(ipfs.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(messages.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


if os.path.isdir(FRONTEND_BUILD):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_BUILD, "static")), name="static")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return RedirectResponse(url="/" + full_path.rstrip("/") + "/", status_code=307)
        return FileResponse(os.path.join(FRONTEND_BUILD, "index.html"))
else:
    print(f"Frontend build not found at {FRONTEND_BUILD}, serving API only")
