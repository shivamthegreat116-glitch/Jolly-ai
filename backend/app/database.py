from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


from sqlalchemy import text


def run_migrations(target_engine):
    """Safely adds newly introduced columns to existing databases without dropping data."""
    with target_engine.connect() as conn:
        for sql in [
            "ALTER TABLE conversations ADD COLUMN active_question_id VARCHAR(64) DEFAULT 'Q01_SAFETY'",
            "ALTER TABLE conversations ADD COLUMN findings_json TEXT DEFAULT '{}'",
            "ALTER TABLE conversations ADD COLUMN conversation_mode VARCHAR(32) DEFAULT 'assessment'",
            "ALTER TABLE assessments ADD COLUMN question_id VARCHAR(64)",
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                # Column already exists or table not yet created
                pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
