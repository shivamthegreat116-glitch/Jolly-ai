from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine, run_migrations
import app.models  # ensure models registered on Base
from app.routers import public, staff
from app.seed import seed_if_empty

settings = get_settings()
Path("data").mkdir(parents=True, exist_ok=True)
Base.metadata.create_all(bind=engine)
run_migrations(engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Jolly AI API",
    description=(
        "Privacy-first support and triage for SIH26093. "
        "Not a medical, legal, or emergency service. Does not diagnose trauma or mental-health conditions."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(staff.router)



@app.get("/api/health")
def health():
    return {
        "ok": True,
        "name": settings.app_name,
        "disclaimer": "Support and triage tool only — not a diagnosis or emergency service.",
    }
