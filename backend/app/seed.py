from datetime import timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import KnowledgeDoc, Referral, StaffUser, new_id, utcnow
from app.security import hash_password

DEMO_REFERRALS = [
    {
        "service_type": "government",
        "name": "NHAA / Atrocities helpline (DEMO DATA)",
        "region": "India",
        "contact": "14566 (verify on official source)",
        "availability": "Confirm official hours",
        "notes": "DEMO DATA. Do not treat as a live guarantee. Confirm before sharing with a complainant.",
    },
    {
        "service_type": "emergency",
        "name": "National emergency number (DEMO DATA)",
        "region": "India",
        "contact": "112 (verify locally)",
        "availability": "Emergency",
        "notes": "DEMO DATA. Jolly AI never auto-dials.",
    },
    {
        "service_type": "helpline",
        "name": "Women helpline (DEMO DATA)",
        "region": "India (state-specific)",
        "contact": "181 (verify for the state)",
        "availability": "Confirm official hours",
        "notes": "DEMO DATA.",
    },
    {
        "service_type": "helpline",
        "name": "CHILDLINE (DEMO DATA)",
        "region": "India",
        "contact": "1098 (verify)",
        "availability": "Confirm official hours",
        "notes": "DEMO DATA.",
    },
    {
        "service_type": "counseling",
        "name": "iCall psychosocial helpline (DEMO DATA)",
        "region": "India",
        "contact": "Look up current official iCall/TISS contact",
        "availability": "Confirm official hours",
        "notes": "DEMO DATA. Do not invent phone/email.",
    },
    {
        "service_type": "legal",
        "name": "District Legal Services Authority pathway (DEMO DATA)",
        "region": "India",
        "contact": "NALSA / SLSA / DLSA — look up local office",
        "availability": "Office hours vary",
        "notes": "DEMO DATA. Do not invent FIR or court procedure.",
    },
    {
        "service_type": "medical",
        "name": "Ambulance (DEMO DATA)",
        "region": "Many Indian states",
        "contact": "108 (verify locally)",
        "availability": "Emergency",
        "notes": "DEMO DATA.",
    },
    {
        "service_type": "protection",
        "name": "Witness protection enquiry via legal aid (DEMO DATA)",
        "region": "India",
        "contact": "Ask DLSA / competent authority — do not invent scheme details",
        "availability": "Varies",
        "notes": "DEMO DATA.",
    },
]


def seed_if_empty(db: Session) -> None:
    settings = get_settings()
    counselor = db.query(StaffUser).filter(StaffUser.email == settings.demo_counselor_email).first()
    if not counselor:
        db.add(
            StaffUser(
                id=new_id(),
                email=settings.demo_counselor_email,
                password_hash=hash_password(settings.demo_counselor_password),
                role="counselor",
                created_at=utcnow(),
            )
        )
    admin = db.query(StaffUser).filter(StaffUser.email == settings.demo_admin_email).first()
    if not admin:
        db.add(
            StaffUser(
                id=new_id(),
                email=settings.demo_admin_email,
                password_hash=hash_password(settings.demo_admin_password),
                role="admin",
                created_at=utcnow(),
            )
        )
    if db.query(Referral).count() == 0:
        for r in DEMO_REFERRALS:
            db.add(
                Referral(
                    id=new_id(),
                    demo_data=True,
                    verified=False,
                    active=True,
                    **r,
                )
            )
    if db.query(KnowledgeDoc).count() == 0:
        db.add(
            KnowledgeDoc(
                id=new_id(),
                title="NHAA 14566 — DEMO DATA",
                category="government",
                body="Helpline commonly cited as 14566. Verify on an official source before use.",
                source="DEMO DATA",
                verified=False,
                active=True,
                updated_at=utcnow(),
            )
        )
        db.add(
            KnowledgeDoc(
                id=new_id(),
                title="Limitation of this tool",
                category="ethics",
                body=(
                    "Jolly AI does not diagnose. It does not auto-notify authorities. "
                    "Identity attributes are never used as risk predictors."
                ),
                source="Jolly AI policy",
                verified=True,
                active=True,
                updated_at=utcnow(),
            )
        )
    db.commit()


def default_retention():
    return utcnow() + timedelta(days=30)
