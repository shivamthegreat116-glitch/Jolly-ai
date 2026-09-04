import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


class StaffUser(Base):
    __tablename__ = "staff_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32))  # counselor | admin
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    anonymous_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, default=new_id)
    language: Mapped[str] = mapped_column(String(32), default="en")
    interaction_mode: Mapped[str] = mapped_column(String(16), default="text")  # text | voice | both
    consent_text: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_voice: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_storage: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_share_summary: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_human_review: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversations: Mapped[list["Conversation"]] = relationship(back_populates="session")
    assessments: Mapped[list["Assessment"]] = relationship(back_populates="session")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("user_sessions.id"), index=True)
    encrypted_text: Mapped[str] = mapped_column(Text, default="")
    approved_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    active_question_id: Mapped[str | None] = mapped_column(String(64), nullable=True, default="Q01_SAFETY")
    findings_json: Mapped[str | None] = mapped_column(Text, nullable=True, default="{}")
    summary_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retention_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    session: Mapped[UserSession] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user | assistant | system
    encrypted_content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("user_sessions.id"), index=True)
    conversation_id: Mapped[str | None] = mapped_column(ForeignKey("conversations.id"), nullable=True)
    question_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    svi_score: Mapped[int] = mapped_column(Integer)
    risk_category: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[str] = mapped_column(String(16))
    evidence_summary: Mapped[str] = mapped_column(Text)
    recommended_action: Mapped[str] = mapped_column(Text)
    human_review_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    safety_override: Mapped[bool] = mapped_column(Boolean, default=False)
    voice_signal_status: Mapped[str] = mapped_column(String(32), default="unavailable")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    session: Mapped[UserSession] = relationship(back_populates="assessments")


class VoiceMetadata(Base):
    __tablename__ = "voice_metadata"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("user_sessions.id"), index=True)
    speech_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    pause_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    pitch_variability: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume_variability: Mapped[float | None] = mapped_column(Float, nullable=True)
    interruption_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audio_quality: Mapped[float | None] = mapped_column(Float, nullable=True)
    transcript_corrected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    service_type: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(255))
    region: Mapped[str] = mapped_column(String(128), default="India")
    contact: Mapped[str] = mapped_column(String(255))
    availability: Mapped[str] = mapped_column(String(255), default="See source")
    notes: Mapped[str] = mapped_column(Text, default="")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    demo_data: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class KnowledgeDoc(Base):
    __tablename__ = "knowledge_docs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64))
    body: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(255), default="DEMO DATA")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CaseReview(Base):
    __tablename__ = "case_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("user_sessions.id"), index=True)
    assessment_id: Mapped[str | None] = mapped_column(ForeignKey("assessments.id"), nullable=True)
    assigned_staff_id: Mapped[str | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    notes: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    actor: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(64))
    purpose: Mapped[str] = mapped_column(Text)
    resource_type: Mapped[str] = mapped_column(String(64), default="")
    resource_id: Mapped[str] = mapped_column(String(64), default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    immutable: Mapped[bool] = mapped_column(Boolean, default=True)
