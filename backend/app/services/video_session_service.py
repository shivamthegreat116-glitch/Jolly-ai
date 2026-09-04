"""Human Counselor Video Escalation & Consultation Service.

Provides secure peer-to-peer / WebRTC consultation room creation (via Jitsi Meet)
for high-risk escalations between users and human counselors.

CRITICAL PRIVACY DIRECTIVE:
The AI agent MUST NOT participate, record, transcribe, or eavesdrop on any call
conducted in these consultation rooms. Strictly confidential counselor-client privilege.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

logger = logging.getLogger("jolly.video_session")

DEFAULT_JITSI_BASE_URL = "https://meet.jit.si"


def generate_secure_room_id(session_id: str) -> str:
    """Generates a secure, non-guessable room ID for confidential consultation."""
    clean_sid = "".join(c for c in session_id if c.isalnum())[:8]
    random_token = uuid.uuid4().hex[:8]
    return f"nhaa-consultation-{clean_sid}-{random_token}"


def create_video_room(
    session_id: str,
    escalation_id: str | None = None,
    base_url: str = DEFAULT_JITSI_BASE_URL,
) -> dict[str, Any]:
    """Creates a dedicated video consultation room link.

    Returns user room URL and staff room URL.
    Zero AI listening or recording is permitted in this room.
    """
    room_id = generate_secure_room_id(session_id)
    room_url = f"{base_url.rstrip('/')}/{room_id}"

    logger.info(
        f"[VIDEO SESSION CREATED] Session: {session_id} | Escalation: {escalation_id} | Room: {room_id}"
    )

    return {
        "room_id": room_id,
        "room_url": room_url,
        "staff_url": room_url,
        "session_id": session_id,
        "escalation_id": escalation_id,
        "provider": "jitsi",
        "privacy_guarantee": (
            "Zero AI surveillance: This human counselor consultation room is strictly private. "
            "The AI module has no access to audio, video, or transcripts."
        ),
    }
