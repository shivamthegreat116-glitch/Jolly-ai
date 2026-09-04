from collections import Counter

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Assessment, AuditLog, CaseReview, Conversation, KnowledgeDoc, Referral, StaffUser, UserSession, new_id, utcnow
from app.security import create_access_token, decode_token, verify_password
from app.services.audit import write_audit
from app.services.cleanup import run_retention_cleanup

router = APIRouter(prefix="/api")


class LoginIn(BaseModel):
    email: str
    password: str


class CaseStatusIn(BaseModel):
    status: str
    notes: str = ""


class ReferralIn(BaseModel):
    service_type: str
    name: str
    region: str = "India"
    contact: str
    availability: str = ""
    notes: str = "DEMO DATA"
    verified: bool = False
    active: bool = True


class KnowledgeIn(BaseModel):
    title: str
    category: str
    body: str
    source: str = "DEMO DATA"
    verified: bool = False
    active: bool = True


def current_staff(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> StaffUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in required")
    payload = decode_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(401, "Invalid token")
    user = db.query(StaffUser).filter(StaffUser.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(401, "Unknown user")
    return user


def require_admin(user: StaffUser = Depends(current_staff)) -> StaffUser:
    if user.role != "admin":
        raise HTTPException(403, "Admin role required")
    return user


@router.post("/auth/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(StaffUser).filter(StaffUser.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user.email, user.role)
    write_audit(db, actor=user.email, action="login", purpose="Staff login", resource_type="StaffUser", resource_id=user.id)
    return {"access_token": token, "role": user.role, "email": user.email}


@router.get("/staff/me")
def me(user: StaffUser = Depends(current_staff)):
    return {"email": user.email, "role": user.role}


@router.get("/staff/cases")
def list_cases(
    risk: str | None = None,
    user: StaffUser = Depends(current_staff),
    db: Session = Depends(get_db),
):
    q = db.query(CaseReview)
    rows = q.order_by(CaseReview.updated_at.desc()).all()
    out = []
    for c in rows:
        session = db.query(UserSession).filter(UserSession.id == c.session_id).first()
        if not session or not session.consent_share_summary or session.deleted_at:
            continue
        assessment = None
        if c.assessment_id:
            assessment = db.query(Assessment).filter(Assessment.id == c.assessment_id).first()
        if risk and assessment and assessment.risk_category.lower() != risk.lower():
            continue
        conv = (
            db.query(Conversation)
            .filter(Conversation.session_id == session.id)
            .order_by(Conversation.created_at.desc())
            .first()
        )
        out.append(
            {
                "id": c.id,
                "status": c.status,
                "language": session.language,
                "consent_share": session.consent_share_summary,
                "consent_human_review": session.consent_human_review,
                "svi": assessment.svi_score if assessment else None,
                "risk": assessment.risk_category if assessment else None,
                "confidence": assessment.confidence if assessment else None,
                "human_review": assessment.human_review_flag if assessment else None,
                "recommended_action": assessment.recommended_action if assessment else None,
                "evidence_summary": assessment.evidence_summary if assessment else None,
                "approved_summary": conv.approved_summary if conv else None,
                "timestamp": (assessment.created_at.isoformat() if assessment else c.updated_at.isoformat()),
                "voice_signal_status": assessment.voice_signal_status if assessment else "unavailable",
            }
        )
    write_audit(db, actor=user.email, action="list_cases", purpose="View consented case queue", resource_type="CaseReview")
    return out


@router.get("/staff/cases/{case_id}")
def case_detail(case_id: str, user: StaffUser = Depends(current_staff), db: Session = Depends(get_db)):
    c = db.query(CaseReview).filter(CaseReview.id == case_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    session = db.query(UserSession).filter(UserSession.id == c.session_id).first()
    if not session or not session.consent_share_summary:
        raise HTTPException(403, "No consent to view this case")
    write_audit(
        db,
        actor=user.email,
        action="view_case",
        purpose="Case worker opened consented summary",
        resource_type="CaseReview",
        resource_id=c.id,
    )
    return {"id": c.id, "status": c.status, "notes": c.notes, "session_language": session.language}


@router.post("/staff/cases/{case_id}/status")
def update_status(case_id: str, payload: CaseStatusIn, user: StaffUser = Depends(current_staff), db: Session = Depends(get_db)):
    allowed = {"reviewed", "contacted_with_consent", "referred", "resolved", "pending"}
    if payload.status not in allowed:
        raise HTTPException(400, "Invalid status")
    c = db.query(CaseReview).filter(CaseReview.id == case_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    c.status = payload.status
    c.notes = payload.notes
    c.assigned_staff_id = user.id
    c.updated_at = utcnow()
    db.commit()
    write_audit(
        db,
        actor=user.email,
        action="case_status",
        purpose=f"Set {payload.status}",
        resource_type="CaseReview",
        resource_id=c.id,
    )
    return {"ok": True}


@router.get("/staff/stats")
def stats(user: StaffUser = Depends(current_staff), db: Session = Depends(get_db)):
    cases = db.query(CaseReview).all()
    consented_sessions = {c.session_id for c in cases}
    assessments = db.query(Assessment).filter(Assessment.session_id.in_(consented_sessions)).all() if consented_sessions else []
    counts = Counter(a.risk_category for a in assessments)
    write_audit(db, actor=user.email, action="view_stats", purpose="Anonymized aggregate dashboard")
    return {
        "case_count": len(cases),
        "risk_counts": dict(counts),
        "note": "Aggregates only. No names, audio, or identity attributes.",
    }


@router.get("/admin/referrals")
def admin_referrals(user: StaffUser = Depends(require_admin), db: Session = Depends(get_db)):
    return [
        {
            "id": r.id,
            "service_type": r.service_type,
            "name": r.name,
            "region": r.region,
            "contact": r.contact,
            "availability": r.availability,
            "notes": r.notes,
            "verified": r.verified,
            "demo_data": r.demo_data,
            "active": r.active,
        }
        for r in db.query(Referral).all()
    ]


@router.post("/admin/referrals")
def add_referral(payload: ReferralIn, user: StaffUser = Depends(require_admin), db: Session = Depends(get_db)):
    r = Referral(id=new_id(), demo_data=True, **payload.model_dump())
    db.add(r)
    db.commit()
    write_audit(db, actor=user.email, action="referral_create", purpose="Admin updated directory", resource_id=r.id)
    return {"id": r.id}


@router.get("/admin/knowledge")
def knowledge(user: StaffUser = Depends(require_admin), db: Session = Depends(get_db)):
    return [
        {"id": k.id, "title": k.title, "category": k.category, "body": k.body, "source": k.source, "verified": k.verified, "active": k.active}
        for k in db.query(KnowledgeDoc).all()
    ]


@router.post("/admin/knowledge")
def add_knowledge(payload: KnowledgeIn, user: StaffUser = Depends(require_admin), db: Session = Depends(get_db)):
    k = KnowledgeDoc(id=new_id(), updated_at=utcnow(), **payload.model_dump())
    db.add(k)
    db.commit()
    write_audit(db, actor=user.email, action="knowledge_create", purpose="Admin knowledge base update", resource_id=k.id)
    return {"id": k.id}


@router.get("/admin/audit")
def audit(user: StaffUser = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200).all()
    return [
        {
            "id": a.id,
            "actor": a.actor,
            "action": a.action,
            "purpose": a.purpose,
            "resource_type": a.resource_type,
            "resource_id": a.resource_id,
            "timestamp": a.timestamp.isoformat(),
        }
        for a in rows
    ]


@router.post("/admin/cleanup")
def cleanup_expired_data(user: StaffUser = Depends(require_admin), db: Session = Depends(get_db)):
    result = run_retention_cleanup(db, actor=user.email)
    return {
        "ok": True,
        "purged_sessions": result.expired_sessions_purged,
        "purged_conversations": result.conversations_purged,
        "purged_messages": result.messages_purged,
        "purged_assessments": result.assessments_purged,
        "purged_voice_metadata": result.voice_metadata_purged,
    }

