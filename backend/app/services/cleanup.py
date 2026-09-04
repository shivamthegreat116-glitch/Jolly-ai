"""Retention-expiry cleanup service.

Purges expired sessions, encrypted messages, assessments, and voice metadata
past their retention date, while retaining non-content audit log records.
"""

from __future__ import annotations

from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.models import (
    Assessment,
    CaseReview,
    Conversation,
    Message,
    UserSession,
    VoiceMetadata,
    utcnow,
)
from app.services.audit import write_audit


@dataclass
class CleanupResult:
    expired_sessions_purged: int
    conversations_purged: int
    messages_purged: int
    assessments_purged: int
    voice_metadata_purged: int


def run_retention_cleanup(db: Session, actor: str = "system_retention_job") -> CleanupResult:
    now = utcnow()
    
    # 1. Identify expired sessions (either explicitly deleted or past expires_at)
    expired_sessions = (
        db.query(UserSession)
        .filter(
            (UserSession.deleted_at.is_not(None))
            | (UserSession.expires_at.is_not(None) & (UserSession.expires_at <= now))
        )
        .all()
    )
    
    expired_session_ids = [s.id for s in expired_sessions]
    
    # Also find conversations past their retention_date
    expired_convs = (
        db.query(Conversation)
        .filter(Conversation.retention_date.is_not(None), Conversation.retention_date <= now)
        .all()
    )
    for c in expired_convs:
        if c.session_id not in expired_session_ids:
            expired_session_ids.append(c.session_id)
            
    if not expired_session_ids:
        return CleanupResult(0, 0, 0, 0, 0)
        
    # 2. Count and purge messages
    convs = db.query(Conversation).filter(Conversation.session_id.in_(expired_session_ids)).all()
    conv_ids = [c.id for c in convs]
    
    messages_count = 0
    if conv_ids:
        messages = db.query(Message).filter(Message.conversation_id.in_(conv_ids)).all()
        messages_count = len(messages)
        for m in messages:
            db.delete(m)
            
    # 3. Purge assessments
    assessments = db.query(Assessment).filter(Assessment.session_id.in_(expired_session_ids)).all()
    assessments_count = len(assessments)
    for a in assessments:
        db.delete(a)
        
    # 4. Purge voice metadata
    voice_records = db.query(VoiceMetadata).filter(VoiceMetadata.session_id.in_(expired_session_ids)).all()
    voice_count = len(voice_records)
    for v in voice_records:
        db.delete(v)
        
    # 5. Purge case reviews for expired sessions
    case_reviews = db.query(CaseReview).filter(CaseReview.session_id.in_(expired_session_ids)).all()
    for cr in case_reviews:
        db.delete(cr)
        
    # 6. Purge conversations
    convs_count = len(convs)
    for c in convs:
        db.delete(c)
        
    # 7. Delete the user sessions
    sessions_count = len(expired_sessions)
    for s in expired_sessions:
        db.delete(s)
        
    db.commit()
    
    # 8. Write immutable audit log
    write_audit(
        db,
        actor=actor,
        action="retention_cleanup",
        purpose=(
            f"Retention policy purge executed: {sessions_count} sessions, "
            f"{convs_count} conversations, {messages_count} messages, "
            f"{assessments_count} assessments, {voice_count} voice metadata records."
        ),
        resource_type="System",
        resource_id="retention_cleanup",
    )
    
    return CleanupResult(
        expired_sessions_purged=sessions_count,
        conversations_purged=convs_count,
        messages_purged=messages_count,
        assessments_purged=assessments_count,
        voice_metadata_purged=voice_count,
    )
