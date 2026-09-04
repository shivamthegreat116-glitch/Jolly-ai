import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.seed import seed_if_empty

client = TestClient(app)


@pytest.fixture(autouse=True)
def seed_demo_data():
    """Match the application startup path for isolated endpoint tests."""
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_session_requires_text_consent():
    r = client.post("/api/session", json={"consent_text": False, "language": "en"})
    assert r.status_code == 400


def test_chat_mvp_english():
    s = client.post(
        "/api/session",
        json={
            "consent_text": True,
            "consent_storage": True,
            "language": "en",
            "interaction_mode": "text",
        },
    )
    assert s.status_code == 200
    sid = s.json()["session_id"]
    g = client.post("/api/chat", json={"session_id": sid, "message": "", "phase": "start"})
    assert g.status_code == 200
    assert "not a medical" in g.json()["reply"].lower()
    m = client.post(
        "/api/chat",
        json={"session_id": sid, "message": "Yes I am safe", "phase": "safety"},
    )
    assert m.status_code == 200
    n = client.post(
        "/api/chat",
        json={"session_id": sid, "message": "I want emotional support", "phase": "need"},
    )
    assert n.status_code == 200
    a = client.post(
        "/api/chat",
        json={
            "session_id": sid,
            "message": "I feel scared but I am safe at a friend's house.",
            "phase": "narrate",
        },
    )
    assert a.status_code == 200
    assert a.json()["assessment"]["svi_score"] >= 0
    assert "diagnosis" in a.json()["assessment"]["disclaimer"].lower() or "not a medical" in a.json()["assessment"]["disclaimer"].lower()


def test_delete_data():
    s = client.post("/api/session", json={"consent_text": True, "consent_storage": True})
    sid = s.json()["session_id"]
    d = client.post("/api/privacy/delete", json={"session_id": sid, "confirmation": "DELETE"})
    assert d.status_code == 200
    c = client.post("/api/chat", json={"session_id": sid, "message": "hi", "phase": "start"})
    assert c.status_code == 404


def test_referrals_are_publicly_listed():
    r = client.get("/api/referrals")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_case_share_requires_a_separate_confirmation():
    s = client.post(
        "/api/session",
        json={
            "consent_text": True,
            "consent_storage": True,
            "consent_share_summary": True,
        },
    )
    sid = s.json()["session_id"]
    pending = client.post(
        "/api/summary",
        json={
            "session_id": sid,
            "summary": "A user-approved, minimal summary.",
            "approve": True,
            "share_with_caseworker": True,
        },
    )
    assert pending.status_code == 409
    confirm = client.post(
        "/api/share/confirm",
        json={"session_id": sid, "confirm": True, "destination": "case_worker_queue"},
    )
    assert confirm.status_code == 200
    shared = client.post(
        "/api/summary",
        json={
            "session_id": sid,
            "summary": "A user-approved, minimal summary.",
            "approve": True,
            "share_with_caseworker": True,
        },
    )
    assert shared.status_code == 200
    assert shared.json()["shared"] is True


def test_staff_login_and_empty_queue():
    r = client.post("/api/auth/login", json={"email": "counselor@jolly.demo", "password": "change-me-counselor"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    q = client.get("/api/staff/cases", headers={"Authorization": f"Bearer {token}"})
    assert q.status_code == 200
    assert isinstance(q.json(), list)


def test_multilingual_chat_marathi_bengali_tamil_telugu():
    languages = ["mr", "bn", "ta", "te"]
    for l in languages:
        s = client.post(
            "/api/session",
            json={
                "consent_text": True,
                "consent_storage": True,
                "language": l,
                "interaction_mode": "text",
            },
        )
        assert s.status_code == 200
        sid = s.json()["session_id"]
        g = client.post("/api/chat", json={"session_id": sid, "message": "", "phase": "start"})
        assert g.status_code == 200
        assert len(g.json()["reply"]) > 10


def test_voice_tts_endpoint():
    s = client.post(
        "/api/session",
        json={
            "consent_text": True,
            "consent_voice": True,
            "language": "hi",
            "interaction_mode": "voice",
        },
    )
    sid = s.json()["session_id"]
    r = client.post(f"/api/voice/tts?session_id={sid}&text=नमस्ते")
    assert r.status_code == 200
    assert r.json()["fallback"] == "browser_speech_synthesis"
