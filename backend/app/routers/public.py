from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import json
import logging

from app.crypto_util import decrypt_text, encrypt_text
from app.database import get_db
from app.models import (
    Assessment,
    AuditLog,
    CaseReview,
    Conversation,
    Message,
    Referral,
    UserSession,
    VoiceMetadata,
    new_id,
    utcnow,
)
from app.seed import default_retention
from app.services.assessment_state_machine import process_assessment_turn
from app.services.audit import write_audit
from app.services.chat_engine import next_assistant_reply
from app.services.llm import generate_llm_reply
from app.services.nlp import conversation_signals_from_messages, detect_language
from app.services.question_registry import get_initial_question_id, get_question_text
from app.services.rag import retrieve
from app.services.speech import synthesize_speech, transcribe_whisper
from app.services.svi import VoiceSignals, compute_svi

logger = logging.getLogger("jolly.public")
router = APIRouter(prefix="/api")


class ConsentIn(BaseModel):
    language: str = "en"
    interaction_mode: str = "text"
    consent_text: bool
    consent_voice: bool = False
    consent_storage: bool = False
    consent_share_summary: bool = False
    consent_human_review: bool = False


class ChatIn(BaseModel):
    session_id: str
    message: str = ""
    phase: str = "start"
    transcript_override: str | None = None
    voice: dict | None = None
    user_says_unsafe: bool | None = None
    image_base64: str | None = None
    question_id: str | None = None
    clarification_count: int = 0


class SummaryIn(BaseModel):
    session_id: str
    summary: str
    approve: bool
    share_with_caseworker: bool = False


class DeleteIn(BaseModel):
    session_id: str
    confirmation: str = Field(description="Type DELETE to confirm")


def _session(db: Session, session_id: str) -> UserSession:
    s = db.query(UserSession).filter(UserSession.id == session_id, UserSession.deleted_at.is_(None)).first()
    if not s:
        raise HTTPException(404, "Session not found or deleted")
    return s


@router.post("/session")
def create_session(payload: ConsentIn, db: Session = Depends(get_db)):
    if not payload.consent_text:
        raise HTTPException(400, "Text-chat consent is required to start.")
    s = UserSession(
        id=new_id(),
        anonymous_id=new_id(),
        language=payload.language,
        interaction_mode=payload.interaction_mode,
        consent_text=payload.consent_text,
        consent_voice=payload.consent_voice,
        consent_storage=payload.consent_storage,
        consent_share_summary=payload.consent_share_summary,
        consent_human_review=payload.consent_human_review,
        expires_at=default_retention(),
        created_at=utcnow(),
    )
    db.add(s)
    conv = Conversation(
        id=new_id(),
        session_id=s.id,
        encrypted_text=encrypt_text(""),
        retention_date=default_retention() if payload.consent_storage else utcnow(),
        created_at=utcnow(),
    )
    db.add(conv)
    db.commit()
    write_audit(
        db,
        actor=s.anonymous_id,
        action="consent_recorded",
        purpose="Start support session with explicit consent flags",
        resource_type="UserSession",
        resource_id=s.id,
    )
    return {
        "session_id": s.id,
        "anonymous_id": s.anonymous_id,
        "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        "disclaimer": (
            "This AI is a support and triage tool, not a medical, legal, or emergency service."
        ),
    }


@router.post("/chat")
async def chat(payload: ChatIn, db: Session = Depends(get_db)):
    s = _session(db, payload.session_id)
    if not s.consent_text:
        raise HTTPException(403, "Text analysis was not consented.")
    conv = (
        db.query(Conversation)
        .filter(Conversation.session_id == s.id)
        .order_by(Conversation.created_at.desc())
        .first()
    )
    if not conv:
        raise HTTPException(400, "No conversation")

    user_text = (payload.transcript_override or payload.message or "").strip()
    if payload.phase != "start" and not user_text:
        raise HTTPException(400, "Empty message")

    if user_text:
        if s.consent_storage:
            db.add(
                Message(
                    id=new_id(),
                    conversation_id=conv.id,
                    role="user",
                    encrypted_content=encrypt_text(user_text),
                    created_at=utcnow(),
                )
            )
            db.flush()
        stored = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id, Message.role == "user")
            .order_by(Message.created_at)
            .all()
        )
        prior = [decrypt_text(m.encrypted_content) for m in stored]
        if not s.consent_storage:
            prior.append(user_text)
        if s.consent_storage:
            conv.encrypted_text = encrypt_text("\n".join(prior))
    else:
        prior = [decrypt_text(m.encrypted_content) for m in conv.messages]

    voice = VoiceSignals(available=False)
    if payload.voice and s.consent_voice:
        v = payload.voice
        voice = VoiceSignals(
            speech_rate=v.get("speech_rate"),
            pause_ratio=v.get("pause_ratio"),
            pitch_variability=v.get("pitch_variability"),
            volume_variability=v.get("volume_variability"),
            interruption_count=v.get("interruption_count"),
            audio_quality=v.get("audio_quality"),
            available=True,
        )
        db.add(
            VoiceMetadata(
                id=new_id(),
                session_id=s.id,
                speech_rate=voice.speech_rate,
                pause_ratio=voice.pause_ratio,
                pitch_variability=voice.pitch_variability,
                volume_variability=voice.volume_variability,
                interruption_count=voice.interruption_count,
                audio_quality=voice.audio_quality,
                transcript_corrected=bool(payload.transcript_override),
                created_at=utcnow(),
            )
        )
    elif payload.voice and not s.consent_voice:
        voice = VoiceSignals(available=False)

    joined = "\n".join(prior) if prior else user_text

    # Special handling for phase="start" initialization
    if payload.phase == "start" and not user_text:
        init_qid = get_initial_question_id()
        reply, next_phase, cites = next_assistant_reply(
            language=s.language,
            user_text="",
            phase="start",
            svi=None,
        )
        conv.active_question_id = init_qid
        conv.findings_json = "{}"
        db.commit()
        return {
            "reply": reply,
            "next_phase": "safety",
            "question_id": init_qid,
            "next_question_id": init_qid,
            "interpretation": None,
            "citations": cites,
            "assessment": None,
            "assessment_id": None,
            "draft_summary": "",
            "crisis_mode": False,
            "voice_signal_status": "unavailable",
        }

    # BIND CURRENT QUESTION ID
    active_qid = payload.question_id or getattr(conv, "active_question_id", None) or "Q01_SAFETY"
    if payload.phase == "safety" and not payload.question_id:
        active_qid = "Q01_SAFETY"
    elif payload.phase == "need" and not payload.question_id:
        active_qid = "Q02_SUPPORT_NEED"

    try:
        findings = json.loads(getattr(conv, "findings_json", None) or "{}")
    except Exception:
        findings = {}

    # PROCESS TURN THROUGH DETERMINISTIC STATE MACHINE & LLM REASONING
    step = await process_assessment_turn(
        question_id=active_qid,
        user_response=user_text,
        language=s.language,
        previous_findings=findings,
        clarification_count=payload.clarification_count,
        user_says_unsafe=payload.user_says_unsafe,
        image_base64=payload.image_base64,
    )

    reply = step.reply

    # AGGREGATE ALL VALIDATED INDICATORS ACROSS SESSION
    all_validated_inds: list[str] = []
    for f in step.validated_findings.values():
        all_validated_inds.extend(f.get("risk_indicators", []))
        all_validated_inds.extend(f.get("trauma_indicators", []))
        all_validated_inds.extend(f.get("stress_indicators", []))

    # DETERMINISTIC SVI SCORING
    conv_signals = conversation_signals_from_messages(prior or [user_text])
    svi = compute_svi(
        joined or user_text,
        voice=voice,
        conversation=conv_signals,
        user_says_unsafe=payload.user_says_unsafe or step.is_crisis,
        structured_indicators=all_validated_inds,
    )

    # PERSIST CONVERSATION PROGRESSION
    conv.active_question_id = step.next_question_id or "SUMMARY"
    conv.findings_json = json.dumps(step.validated_findings)

    # MAP NEXT PHASE FOR BACKWARD COMPATIBILITY
    if step.next_question_id == "Q01_SAFETY":
        next_phase = "safety"
    elif step.next_question_id == "Q02_SUPPORT_NEED":
        next_phase = "need"
    elif step.next_question_id in ["Q03_INCIDENT_CONTEXT", "Q04_RECENCY_FREQUENCY", "Q05_IMPACT_COPING"]:
        next_phase = "narrate"
    elif step.next_question_id is None:
        next_phase = "summary"
    else:
        next_phase = "narrate"

    # RETRIEVE CITATIONS
    cites = retrieve(user_text, k=2)

    # ENCRYPT & STORE MESSAGE IF CONSENTED
    if s.consent_storage:
        db.add(
            Message(
                id=new_id(),
                conversation_id=conv.id,
                role="assistant",
                encrypted_content=encrypt_text(reply),
                created_at=utcnow(),
            )
        )

    # RECORD STRUCTURED ASSESSMENT IN DB
    evidence_text = f"Evaluated {step.evaluated_question_id}: status={step.interpretation.response_status}. Evidence: {', '.join(step.interpretation.evidence) or 'none'}."
    assessment = Assessment(
        id=new_id(),
        session_id=s.id,
        conversation_id=conv.id,
        question_id=step.evaluated_question_id,
        svi_score=svi.svi_score,
        risk_category=svi.risk_category,
        confidence=svi.confidence,
        evidence_summary=evidence_text,
        recommended_action=svi.recommended_action,
        human_review_flag=svi.human_review_flag,
        safety_override=svi.safety_override,
        voice_signal_status=svi.voice_signal_status,
        created_at=utcnow(),
    )
    db.add(assessment)

    if s.language in {"en", "hi", "hinglish", "mr", "bn", "ta", "te"}:
        pass
    elif user_text:
        s.language = detect_language(user_text)

    db.commit()

    draft_summary = _draft_summary(s.language, prior, svi if user_text else None)

    # DEBUG LOGGING FOR AUDITABILITY
    logger.info(
        f"\n======================================================\n"
        f"[ASSESSMENT ENGINE TURN LOG]\n"
        f"SESSION ID:          {s.id}\n"
        f"QUESTION EVALUATED:  {step.evaluated_question_id}\n"
        f"USER ANSWER:         {user_text}\n"
        f"RESPONSE STATUS:     {step.interpretation.response_status}\n"
        f"EVIDENCE EXTRACTED:  {step.interpretation.evidence}\n"
        f"INDICATORS:          {step.interpretation.stress_indicators + step.interpretation.trauma_indicators + step.interpretation.risk_indicators}\n"
        f"CONFIDENCE:          {step.interpretation.confidence}\n"
        f"NEEDS CLARIFICATION: {step.needs_clarification}\n"
        f"DETERMINISTIC SVI:   {svi.svi_score} ({svi.risk_category})\n"
        f"NEXT QUESTION ID:    {step.next_question_id} (Phase: {next_phase})\n"
        f"======================================================"
    )

    interp_data = (
        step.interpretation.model_dump()
        if hasattr(step.interpretation, "model_dump")
        else step.interpretation.dict()
    )

    return {
        "reply": reply,
        "next_phase": next_phase,
        "question_id": step.evaluated_question_id,
        "next_question_id": step.next_question_id,
        "interpretation": interp_data,
        "citations": cites,
        "assessment": svi.public_user_view() if user_text else None,
        "assessment_id": assessment.id if assessment else None,
        "draft_summary": draft_summary,
        "crisis_mode": bool(step.is_crisis or svi.crisis_mode),
        "voice_signal_status": svi.voice_signal_status if user_text else "unavailable",
    }


def _draft_summary(lang: str, messages: list[str], svi) -> str:
    user_bits = [m for m in messages if m]
    snippet = " ".join(user_bits)[:600]
    if not snippet:
        return ""
    if lang == "hi":
        head = "आपके द्वारा साझा किए गए बिंदुओं का मसौदा सारांश (आप इसे बदल सकते हैं): "
    elif lang == "hinglish":
        head = "Aapka draft summary (edit kar sakte ho): "
    elif lang == "mr":
        head = "आपण सामायिक केलेल्या मुद्द्यांचा मसुदा सारांश (आपण यात बदल करू शकता): "
    elif lang == "bn":
        head = "আপনার ভাগ করা তথ্যের খসড়া সারসংক্ষেপ (আপনি এটি সম্পাদনা করতে পারেন): "
    elif lang == "ta":
        head = "நீங்கள் பகிர்ந்த விவரங்களின் வரைவு சுருக்கம் (இதை நீங்கள் திருத்தலாம்): "
    elif lang == "te":
        head = "మీరు పంచుకున్న వివరాల చిత్తు సారాంశం (మీరు దీన్ని సవరించవచ్చు): "
    else:
        head = "Draft summary of what you chose to share (you can edit this): "
    extra = ""
    if svi:
        extra = f" Support focus: {svi.risk_category} triage suggestion — not a diagnosis."
    return head + snippet + extra


@router.post("/summary")
def approve_summary(payload: SummaryIn, db: Session = Depends(get_db)):
    s = _session(db, payload.session_id)
    conv = (
        db.query(Conversation)
        .filter(Conversation.session_id == s.id)
        .order_by(Conversation.created_at.desc())
        .first()
    )
    if not conv:
        raise HTTPException(400, "No conversation")
    if not payload.approve:
        return {"ok": True, "shared": False, "message": "Summary not approved. Nothing was shared."}
    conv.approved_summary = payload.summary
    conv.summary_approved_at = utcnow()
    shared = False
    if payload.share_with_caseworker:
        if not s.consent_share_summary:
            raise HTTPException(403, "Sharing was not consented. Update consent first.")
        confirmed = (
            db.query(AuditLog)
            .filter(
                AuditLog.resource_type == "UserSession",
                AuditLog.resource_id == s.id,
                AuditLog.action == "share_confirmed",
                AuditLog.purpose.contains("case_worker_queue"),
            )
            .first()
        )
        if not confirmed:
            raise HTTPException(
                409,
                "Confirm sharing with a case worker before the summary can be placed in the queue.",
            )
        shared = True
        latest = (
            db.query(Assessment)
            .filter(Assessment.session_id == s.id)
            .order_by(Assessment.created_at.desc())
            .first()
        )
        db.add(
            CaseReview(
                id=new_id(),
                session_id=s.id,
                assessment_id=latest.id if latest else None,
                status="pending",
                notes="",
                updated_at=utcnow(),
            )
        )
    db.commit()
    write_audit(
        db,
        actor=s.anonymous_id,
        action="summary_approved",
        purpose="User approved summary; share=" + str(shared),
        resource_type="Conversation",
        resource_id=conv.id,
    )
    return {
        "ok": True,
        "shared": shared,
        "message": "Shared with a case worker queue." if shared else "Saved only in your session.",
        "confirmation_required_note": "Jolly AI never contacts police, family, or counsellors automatically.",
    }


@router.get("/referrals")
def list_referrals(service_type: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Referral).filter(Referral.active.is_(True))
    if service_type:
        q = q.filter(Referral.service_type == service_type)
    rows = q.all()
    return [
        {
            "id": r.id,
            "service_type": r.service_type,
            "name": r.name,
            "region": r.region,
            "contact": r.contact,
            "availability": r.availability,
            "notes": r.notes,
            "demo_data": r.demo_data,
            "verified": r.verified,
        }
        for r in rows
    ]


@router.post("/privacy/delete")
def delete_my_data(payload: DeleteIn, db: Session = Depends(get_db)):
    if payload.confirmation != "DELETE":
        raise HTTPException(400, "Type DELETE to confirm.")
    s = _session(db, payload.session_id)
    s.deleted_at = utcnow()
    convs = db.query(Conversation).filter(Conversation.session_id == s.id).all()
    for c in convs:
        for m in list(c.messages):
            db.delete(m)
        c.encrypted_text = encrypt_text("")
        c.approved_summary = None
        db.delete(c)
    for a in db.query(Assessment).filter(Assessment.session_id == s.id).all():
        db.delete(a)
    for v in db.query(VoiceMetadata).filter(VoiceMetadata.session_id == s.id).all():
        db.delete(v)
    db.commit()
    write_audit(
        db,
        actor="user",
        action="data_deleted",
        purpose="User requested Delete my data",
        resource_type="UserSession",
        resource_id=s.id,
    )
    return {"ok": True, "message": "Session data deleted. Audit log retains a non-content deletion record."}


@router.post("/voice/transcribe")
async def transcribe(
    session_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    s = _session(db, session_id)
    if not s.consent_voice:
        raise HTTPException(403, "Voice consent is required.")
    data = await file.read()
    result = await transcribe_whisper(data, file.filename or "audio.webm", s.language)
    return result


@router.post("/voice/tts")
async def tts(session_id: str, text: str, db: Session = Depends(get_db)):
    s = _session(db, session_id)
    return await synthesize_speech(text, s.language)


class ShareConfirmIn(BaseModel):
    session_id: str
    confirm: bool
    destination: str
    reason: str = ""


@router.post("/share/confirm")
def share_confirm(payload: ShareConfirmIn, db: Session = Depends(get_db)):
    """Explicit confirmation gate — never auto-contact authorities."""
    s = _session(db, payload.session_id)
    if not payload.confirm:
        write_audit(
            db,
            actor=s.anonymous_id,
            action="share_declined",
            purpose=f"User declined sharing to {payload.destination}",
            resource_type="UserSession",
            resource_id=s.id,
        )
        return {"ok": True, "initiated": False, "message": "No one was contacted."}
    write_audit(
        db,
        actor=s.anonymous_id,
        action="share_confirmed",
        purpose=f"User confirmed intent to contact {payload.destination}: {payload.reason}",
        resource_type="UserSession",
        resource_id=s.id,
    )
    return {
        "ok": True,
        "initiated": False,
        "message": (
            "Confirmation recorded. Jolly AI does not auto-dial. Please use the numbers shown, "
            "or a case worker can follow up only if you also shared your summary."
        ),
    }
