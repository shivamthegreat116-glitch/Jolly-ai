from datetime import timedelta
import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import (
    Assessment,
    Conversation,
    Message,
    UserSession,
    VoiceMetadata,
    new_id,
    utcnow,
)
from app.seed import seed_if_empty
from app.services.cleanup import run_retention_cleanup

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


def test_retention_cleanup_purges_expired_sessions():
    db = SessionLocal()
    try:
        # Create an expired session
        expired_session = UserSession(
            id=new_id(),
            anonymous_id=new_id(),
            language="en",
            consent_text=True,
            consent_storage=True,
            expires_at=utcnow() - timedelta(days=1),
            created_at=utcnow() - timedelta(days=31),
        )
        db.add(expired_session)
        
        # Add conversation, message, assessment, voice
        conv = Conversation(
            id=new_id(),
            session_id=expired_session.id,
            encrypted_text="test",
            retention_date=utcnow() - timedelta(days=1),
            created_at=utcnow() - timedelta(days=31),
        )
        db.add(conv)
        
        msg = Message(
            id=new_id(),
            conversation_id=conv.id,
            role="user",
            encrypted_content="encrypted",
            created_at=utcnow() - timedelta(days=31),
        )
        db.add(msg)
        
        asmt = Assessment(
            id=new_id(),
            session_id=expired_session.id,
            svi_score=20,
            risk_category="Low",
            confidence="Medium",
            evidence_summary="test",
            recommended_action="test",
            created_at=utcnow() - timedelta(days=31),
        )
        db.add(asmt)
        
        voice = VoiceMetadata(
            id=new_id(),
            session_id=expired_session.id,
            speech_rate=2.5,
            created_at=utcnow() - timedelta(days=31),
        )
        db.add(voice)
        db.commit()
        
        # Also create an active session that should NOT be purged
        active_session = UserSession(
            id=new_id(),
            anonymous_id=new_id(),
            language="en",
            consent_text=True,
            consent_storage=True,
            expires_at=utcnow() + timedelta(days=30),
            created_at=utcnow(),
        )
        db.add(active_session)
        db.commit()
        
        result = run_retention_cleanup(db, actor="test_runner")
        assert result.expired_sessions_purged >= 1
        assert result.messages_purged >= 1
        assert result.assessments_purged >= 1
        assert result.voice_metadata_purged >= 1
        
        # Verify active session still exists
        remaining_active = db.query(UserSession).filter(UserSession.id == active_session.id).first()
        assert remaining_active is not None
        
        # Verify expired session was purged
        purged = db.query(UserSession).filter(UserSession.id == expired_session.id).first()
        assert purged is None
    finally:
        db.close()


def test_admin_cleanup_endpoint():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@jolly.demo", "password": "change-me-admin"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    
    r = client.post(
        "/api/admin/cleanup",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert "purged_sessions" in data
